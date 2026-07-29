/**
 * Turns the EXIF block Cloudinary reports for an uploaded image into the three
 * strings the photo editor shows: camera, lens, and settings.
 *
 * The output deliberately mirrors the hand-written style of the original
 * catalogue ("FUJIFILM X-T4", "23MM F/1.4", "F/4 · 1/250S · ISO 800") so
 * imported photos sit alongside the seeded ones without looking different.
 *
 * Nothing here talks to Cloudinary. Keeping the formatting pure makes it
 * testable, and leaves this module safe to import from anywhere.
 *
 * Every field is best-effort: EXIF is written by hundreds of camera firmwares
 * with no real agreement on key names or value encodings. When a value cannot
 * be read confidently the field is left empty for the photographer to fill in,
 * which is a better failure than confidently printing the wrong aperture.
 */

/** The `image_metadata` object as returned by the Cloudinary Admin API. */
export type ImageMetadata = Record<string, unknown>

export type ExifFields = {
  camera: string
  lens: string
  settings: string
  /** Capture year, absent when the file carries no usable date. */
  year?: string
}

/** `photoSchema` rejects any of these fields over 120 characters. */
const MAX_LENGTH = 120

/** Separator used between the aperture, shutter, and ISO parts. */
const SEPARATOR = " · "

/**
 * Exact key first, then a case-insensitive match on the last segment, so a
 * namespaced spelling like "Exif.Photo.FNumber" or "EXIF:FNumber" still
 * resolves. Cloudinary reports flat capitalised tag names, but that is not
 * contractual and a silent miss here would just leave the fields blank.
 */
function lookup(metadata: ImageMetadata, key: string): unknown {
  if (key in metadata) return metadata[key]

  const wanted = key.toLowerCase()

  for (const candidate of Object.keys(metadata)) {
    if (candidate.split(/[.:]/).pop()?.toLowerCase() === wanted) {
      return metadata[candidate]
    }
  }
  return undefined
}

/**
 * First readable value among `keys`. Vendors disagree on names — ISO alone
 * appears as ISO, ISOSpeedRatings, and PhotographicSensitivity — and Cloudinary
 * passes numbers through as numbers for some tags and strings for others.
 */
function read(metadata: ImageMetadata, ...keys: string[]): string {
  for (const key of keys) {
    const value = lookup(metadata, key)

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }
  return ""
}

/**
 * EXIF numbers arrive either as decimals or as unreduced rationals ("56/10"
 * for f/5.6, "1/250" for a shutter speed).
 */
function parseRational(value: string): number | null {
  // Number("") is 0, which would read as a real measurement of zero.
  if (value.trim() === "") return null

  const fraction = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)

  if (fraction) {
    const denominator = Number(fraction[2])
    return denominator === 0 ? null : Number(fraction[1]) / denominator
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Drops trailing zeroes so f/4.0 prints as F/4 but f/5.6 keeps its decimal. */
function trimNumber(value: number): string {
  return String(Number(value.toFixed(1)))
}

function clamp(value: string): string {
  return value.slice(0, MAX_LENGTH)
}

/**
 * "FUJIFILM X-T4" from Make and Model.
 *
 * Canon writes Make "Canon" and Model "Canon EOS R6", so joining the two
 * blindly stutters. Nikon writes "NIKON CORPORATION", which is not how anyone
 * refers to the camera.
 */
function formatCamera(metadata: ImageMetadata): string {
  const make = read(metadata, "Make")
    .replace(/\b(corporation|corp\.?|company|co\.?,?\s*ltd\.?|imaging)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const model = read(metadata, "Model")

  if (model === "") return clamp(make.toUpperCase())

  const redundant =
    make !== "" && model.toLowerCase().startsWith(make.toLowerCase())

  const camera = redundant ? model : `${make} ${model}`

  return clamp(camera.replace(/\s+/g, " ").trim().toUpperCase())
}

/**
 * "23MM F/1.4" from the lens name.
 *
 * Manufacturers pack the focal length and maximum aperture into the model
 * string along with their own marketing ("XF23mmF1.4 R", "EF24-70mm f/2.8L II
 * USM"), so the two numbers are pulled out and the rest dropped. The focal
 * length is removed before looking for the aperture, otherwise the "F" of
 * Fuji's "XF23mm" prefix reads as an aperture of f/23.
 */
function formatLens(metadata: ImageMetadata): string {
  const model = read(metadata, "LensModel", "Lens", "LensID", "LensInfo")

  if (model !== "") {
    const focalPattern = /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*mm/i
    const focal = model.match(focalPattern)

    if (!focal) return clamp(model.toUpperCase())

    const millimetres = `${focal[1].replace(/\s*-\s*/, "-")}MM`
    const aperture = model
      .replace(focalPattern, " ")
      .match(/f\/?\s*(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)/i)

    if (!aperture) return clamp(millimetres)

    return clamp(`${millimetres} F/${aperture[1].replace(/\s*-\s*/, "-")}`)
  }

  // No lens name: the focal length the shot was taken at is still worth having.
  const focalLength = parseRational(read(metadata, "FocalLength"))

  return focalLength === null || focalLength <= 0
    ? ""
    : clamp(`${trimNumber(focalLength)}MM`)
}

/**
 * ApertureValue is deliberately not used as a fallback: it is an APEX value,
 * not an f-number, and treating it as one silently reports the wrong aperture.
 */
function formatAperture(metadata: ImageMetadata): string {
  const value = parseRational(read(metadata, "FNumber"))
  return value === null || value <= 0 ? "" : `F/${trimNumber(value)}`
}

function formatShutter(metadata: ImageMetadata): string {
  const raw = read(metadata, "ExposureTime", "ShutterSpeedValue").replace(
    /\s*s(ec(onds?)?)?$/i,
    "",
  )
  const seconds = parseRational(raw)

  if (seconds === null || seconds <= 0) return ""
  if (seconds >= 1) return `${trimNumber(seconds)}S`

  // Fast shutters read as 1/250 rather than 0.004, which is how cameras,
  // photographers, and the existing catalogue all express them.
  if (/^\d+\s*\/\s*\d+$/.test(raw)) return `${raw.replace(/\s*/g, "")}S`

  return `1/${Math.round(1 / seconds)}S`
}

function formatIso(metadata: ImageMetadata): string {
  const raw = read(
    metadata,
    "ISO",
    "ISOSpeedRatings",
    "PhotographicSensitivity",
    "ISOSpeed",
  )
  // Some bodies report a list ("100 0 0"); the first number is the one used.
  const value = raw.match(/\d+/)

  return value ? `ISO ${value[0]}` : ""
}

/** "F/4 · 1/250S · ISO 800", omitting whichever parts are unavailable. */
function formatSettings(metadata: ImageMetadata): string {
  return clamp(
    [formatAperture(metadata), formatShutter(metadata), formatIso(metadata)]
      .filter((part) => part !== "")
      .join(SEPARATOR),
  )
}

function formatYear(metadata: ImageMetadata): string | undefined {
  const raw = read(
    metadata,
    "DateTimeOriginal",
    "CreateDate",
    "DateTimeDigitized",
    "DateTime",
  )
  const match = raw.match(/^\s*(\d{4})/)

  if (!match) return undefined

  // A camera whose clock was never set dates its files to 1970 or 1980. No
  // digital body predates the 1990s, so anything that old is a dead battery
  // rather than a capture date, and the collection's year is the better guess.
  const year = Number(match[1])
  if (year < 1990 || year > new Date().getFullYear() + 1) return undefined

  return match[1]
}

/**
 * Returns null when there is nothing usable, so the caller can fall back to its
 * existing defaults rather than overwriting them with empty strings.
 */
export function deriveExifFields(
  metadata: ImageMetadata | null,
): ExifFields | null {
  if (!metadata) return null

  const fields: ExifFields = {
    camera: formatCamera(metadata),
    lens: formatLens(metadata),
    settings: formatSettings(metadata),
    year: formatYear(metadata),
  }

  const empty =
    fields.camera === "" &&
    fields.lens === "" &&
    fields.settings === "" &&
    fields.year === undefined

  return empty ? null : fields
}
