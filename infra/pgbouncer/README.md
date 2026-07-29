# PgBouncer runbook

Connection pooler between Vercel and the existing RDS Postgres instance.

## Why this exists

Vercel serverless functions open a new TCP connection per invocation. RDS caps
connections by instance class (a `db.t4g.micro` allows roughly 80), so without a
pooler a modest traffic spike exhausts the limit and the site starts returning
connection errors. PgBouncer in `transaction` mode multiplexes many short-lived
client connections onto a small set of long-lived backend connections.

## Topology

```
Vercel (no static egress IP)
  │  TLS, scram-sha-256
  ▼
PgBouncer on EC2 t4g.nano  :6432   ← public subnet, public IP
  │  TLS verify-full
  ▼
RDS Postgres               :5432   ← private, SG allows only PgBouncer's SG
```

## 1. Security groups

Two groups. `pgbouncer-sg` is reachable from the internet on 6432 only;
`rds-sg` accepts 5432 only from `pgbouncer-sg`, never from the internet.

```bash
VPC_ID=vpc-xxxxxxxx          # the VPC your RDS instance lives in
RDS_SG_ID=sg-xxxxxxxx        # existing security group attached to RDS

# Group for the pooler host
PGB_SG_ID=$(aws ec2 create-security-group \
  --group-name pgbouncer-sg \
  --description "PgBouncer pooler for tushar.photo" \
  --vpc-id "$VPC_ID" \
  --query GroupId --output text)

# Postgres wire protocol in, from anywhere.
# This CANNOT be narrowed: Vercel Hobby has no static egress IPs. TLS +
# scram-sha-256 + a strong password are the actual controls here.
aws ec2 authorize-security-group-ingress --group-id "$PGB_SG_ID" \
  --protocol tcp --port 6432 --cidr 0.0.0.0/0

# SSH only from your own address
aws ec2 authorize-security-group-ingress --group-id "$PGB_SG_ID" \
  --protocol tcp --port 22 --cidr "$(curl -s https://checkip.amazonaws.com)/32"

# Let the pooler reach RDS, and nothing else
aws ec2 authorize-security-group-ingress --group-id "$RDS_SG_ID" \
  --protocol tcp --port 5432 --source-group "$PGB_SG_ID"
```

If RDS currently has `0.0.0.0/0` on 5432 from earlier experimentation, revoke it
once the pooler works:

```bash
aws ec2 revoke-security-group-ingress --group-id "$RDS_SG_ID" \
  --protocol tcp --port 5432 --cidr 0.0.0.0/0
```

## 2. Launch the instance

`t4g.nano` is ample: PgBouncer is single-threaded, event-driven, and uses a few
MB of RAM. It must sit in a **public** subnet so Vercel can reach it.

```bash
SUBNET_ID=subnet-xxxxxxxx     # public subnet in the RDS VPC
KEY_NAME=your-keypair

AMI_ID=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 \
  --query Parameter.Value --output text)

aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t4g.nano \
  --key-name "$KEY_NAME" \
  --subnet-id "$SUBNET_ID" \
  --security-group-ids "$PGB_SG_ID" \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=pgbouncer-tushar-photo}]'
```

Give it a stable address so the connection string does not change on reboot:

```bash
ALLOC_ID=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
aws ec2 associate-address --instance-id i-xxxxxxxx --allocation-id "$ALLOC_ID"
```

Point a DNS record (for example `db.tushar.photo`) at that Elastic IP. The
hostname is required — `client_tls_sslmode = require` with a Let's Encrypt
certificate needs a real name, and a bare IP cannot be certified.

## 3. Configure the host

Copy `setup.sh`, `pgbouncer.ini`, and `pgbouncer.service` up, then run it:

```bash
scp setup.sh pgbouncer.ini pgbouncer.service ec2-user@db.tushar.photo:/tmp/
ssh ec2-user@db.tushar.photo 'sudo bash /tmp/setup.sh'
```

The script installs PgBouncer, fetches the RDS CA bundle, obtains a Let's
Encrypt certificate, writes `userlist.txt` with a SCRAM verifier, and enables
the systemd unit. It prompts for the RDS endpoint and database password.

## 4. Connection strings

Two are needed, and they are not interchangeable.

```bash
# App runtime: through the pooler
DATABASE_URL="postgres://appuser:PASSWORD@db.tushar.photo:6432/tushar_photo?sslmode=require"

# Migrations and the Better Auth CLI: straight to RDS
DIRECT_DATABASE_URL="postgres://appuser:PASSWORD@RDS_ENDPOINT:5432/tushar_photo?sslmode=require"
```

`drizzle-kit` must use the direct URL. Schema changes take advisory locks and
run multi-statement DDL that assumes a stable session, which transaction-mode
pooling breaks. Since RDS is not publicly reachable after step 1, run migrations
either from the pooler host itself or over an SSH tunnel:

```bash
ssh -L 5433:RDS_ENDPOINT:5432 ec2-user@db.tushar.photo
# then, locally:
DIRECT_DATABASE_URL="postgres://appuser:PASSWORD@localhost:5433/tushar_photo" pnpm db:migrate
```

## 5. Verify

```bash
# TLS is enforced — this must FAIL
psql "postgres://appuser:PASSWORD@db.tushar.photo:6432/tushar_photo?sslmode=disable"

# This must succeed
psql "postgres://appuser:PASSWORD@db.tushar.photo:6432/tushar_photo?sslmode=require" -c 'select 1'

# Pool health, as the admin user against the virtual `pgbouncer` database
psql "postgres://pgbouncer_admin:PASSWORD@db.tushar.photo:6432/pgbouncer?sslmode=require" -c 'SHOW POOLS;'
```

In `SHOW POOLS`, watch `cl_waiting`. Persistently above zero means
`default_pool_size` is too small for the traffic and backend connections are
being queued.

## Operations

- Reload config without dropping clients: `sudo systemctl reload pgbouncer`
- Logs: `sudo tail -f /var/log/pgbouncer/pgbouncer.log`
- Certificate renewal: certbot installs a timer; PgBouncer needs a reload after
  renewal, which `setup.sh` wires up via a deploy hook.

## Known limitation

This is a single point of failure. Once content lives in Postgres, an outage
here means the admin area cannot save. Public pages keep serving because
`cacheComponents` caching sits in front of every read, so visitors are largely
insulated. If that tradeoff stops being acceptable, the upgrade path is RDS
Proxy (managed, multi-AZ, roughly $11+/month) rather than a second EC2 box.
