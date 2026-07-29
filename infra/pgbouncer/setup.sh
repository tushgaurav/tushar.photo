#!/usr/bin/env bash
#
# Provision PgBouncer on Amazon Linux 2023 (arm64).
# Run as root on the EC2 instance: sudo bash setup.sh
#
# Expects pgbouncer.ini and pgbouncer.service alongside it in the same directory.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_DIR=/etc/pgbouncer
TLS_DIR="$CONF_DIR/tls"

if [[ $EUID -ne 0 ]]; then
  echo "must run as root" >&2
  exit 1
fi

for f in pgbouncer.ini pgbouncer.service; do
  [[ -f "$SRC_DIR/$f" ]] || { echo "missing $SRC_DIR/$f" >&2; exit 1; }
done

read -rp "RDS endpoint (e.g. mydb.abc123.ap-south-1.rds.amazonaws.com): " RDS_ENDPOINT
read -rp "Public hostname for this pooler (e.g. db.tushar.photo): " PGB_HOSTNAME
read -rp "Email for Let's Encrypt expiry notices: " LE_EMAIL
read -rp "Database username [appuser]: " DB_USER
DB_USER="${DB_USER:-appuser}"
read -rsp "Password for $DB_USER: " DB_PASSWORD; echo
read -rsp "Password for pgbouncer_admin (new, for SHOW POOLS): " ADMIN_PASSWORD; echo

[[ -n "$RDS_ENDPOINT" && -n "$PGB_HOSTNAME" && -n "$DB_PASSWORD" && -n "$ADMIN_PASSWORD" ]] \
  || { echo "all fields are required" >&2; exit 1; }

echo "==> Installing packages"
dnf install -y pgbouncer certbot openssl postgresql16 >/dev/null

echo "==> Creating directories"
install -d -m 0755 -o pgbouncer -g pgbouncer "$CONF_DIR" "$TLS_DIR" /var/log/pgbouncer

echo "==> Fetching RDS CA bundle"
# Global bundle covers every region, so this keeps working if the DB is moved.
curl -fsSL -o "$TLS_DIR/rds-global-bundle.pem" \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

echo "==> Obtaining Let's Encrypt certificate for $PGB_HOSTNAME"
# --standalone binds :80 briefly. The security group does not permit 80 inbound
# by default, so open it for the duration of the challenge and close it after.
echo "    NOTE: port 80 must be reachable right now for the HTTP-01 challenge."
certbot certonly --standalone --non-interactive --agree-tos \
  -m "$LE_EMAIL" -d "$PGB_HOSTNAME"

LE_LIVE="/etc/letsencrypt/live/$PGB_HOSTNAME"
ln -sf "$LE_LIVE/privkey.pem"   "$TLS_DIR/privkey.pem"
ln -sf "$LE_LIVE/fullchain.pem" "$TLS_DIR/fullchain.pem"

# PgBouncer runs unprivileged and must be able to read the key.
groupadd -f tls-readers
usermod -aG tls-readers pgbouncer
chgrp -R tls-readers /etc/letsencrypt/live /etc/letsencrypt/archive
chmod -R g+rX        /etc/letsencrypt/live /etc/letsencrypt/archive

echo "==> Installing config"
sed -e "s|RDS_ENDPOINT|$RDS_ENDPOINT|g" "$SRC_DIR/pgbouncer.ini" > "$CONF_DIR/pgbouncer.ini"
chown pgbouncer:pgbouncer "$CONF_DIR/pgbouncer.ini"
chmod 0640 "$CONF_DIR/pgbouncer.ini"

echo "==> Writing userlist.txt"
# Store SCRAM verifiers, not plaintext. Anyone reading this file then cannot
# recover the password or authenticate to RDS with its contents.
scram_verifier() {
  local user="$1" pass="$2"
  python3 - "$user" "$pass" <<'PY'
import base64, hashlib, hmac, os, sys
user, password = sys.argv[1], sys.argv[2]
salt = os.urandom(16)
iterations = 4096
salted = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
stored_key = hashlib.sha256(client_key).digest()
server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
print('"%s" "SCRAM-SHA-256$%d:%s$%s:%s"' % (
    user, iterations,
    base64.b64encode(salt).decode(),
    base64.b64encode(stored_key).decode(),
    base64.b64encode(server_key).decode(),
))
PY
}

{
  scram_verifier "$DB_USER" "$DB_PASSWORD"
  scram_verifier "pgbouncer_admin" "$ADMIN_PASSWORD"
} > "$CONF_DIR/userlist.txt"

chown pgbouncer:pgbouncer "$CONF_DIR/userlist.txt"
chmod 0600 "$CONF_DIR/userlist.txt"

echo "==> Installing systemd unit"
install -m 0644 "$SRC_DIR/pgbouncer.service" /etc/systemd/system/pgbouncer.service

echo "==> Wiring certificate renewal to reload PgBouncer"
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-pgbouncer.sh <<'HOOK'
#!/usr/bin/env bash
# Renewal replaces the files the symlinks point at; PgBouncer only re-reads
# them on reload, so without this it would serve an expired certificate.
chgrp -R tls-readers /etc/letsencrypt/live /etc/letsencrypt/archive || true
chmod -R g+rX        /etc/letsencrypt/live /etc/letsencrypt/archive || true
systemctl reload pgbouncer || true
HOOK
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-pgbouncer.sh

echo "==> Starting service"
systemctl daemon-reload
systemctl enable --now pgbouncer
sleep 2
systemctl --no-pager --lines=20 status pgbouncer || true

cat <<EOF

Done.

Verify from your laptop:

  psql "postgres://$DB_USER:PASSWORD@$PGB_HOSTNAME:6432/tushar_photo?sslmode=require" -c 'select 1'

Then set in Vercel:

  DATABASE_URL=postgres://$DB_USER:PASSWORD@$PGB_HOSTNAME:6432/tushar_photo?sslmode=require
  DIRECT_DATABASE_URL=postgres://$DB_USER:PASSWORD@$RDS_ENDPOINT:5432/tushar_photo?sslmode=require

Remember to close port 80 again if you opened it for the ACME challenge.
EOF
