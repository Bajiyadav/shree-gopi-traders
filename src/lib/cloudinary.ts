import "server-only";
import { createHash } from "node:crypto";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./media-constants";

/**
 * CLOUDINARY UPLOADS
 * ──────────────────
 * Signed, server-side only. The API secret signs the request here and is never
 * sent to the browser — an unsigned/preset upload from the client would let
 * anyone with the page put arbitrary files in the account.
 *
 * Mirrors scripts/cloudinary-upload.mjs so an image uploaded from the admin is
 * indistinguishable from one uploaded by the bulk pipeline.
 */

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

/** Real photography uploaded by hand lands beside the verified bulk import. */
export const REAL_PHOTO_FOLDER = "shree-gopi-traders/products/real";

export { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES };

export function cloudinaryConfigured() {
  return Boolean(CLOUD && KEY && SECRET);
}

function sign(params: Record<string, string | number>) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + SECRET).digest("hex");
}

/** Serves through Cloudinary's automatic format/quality pipeline. */
export function optimise(url: string) {
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

/**
 * Uploads one image and returns its delivery URL.
 * `publicId` is deterministic, so re-uploading the same slot overwrites rather
 * than accumulating orphaned copies in the account.
 */
export async function uploadImage(
  bytes: ArrayBuffer,
  filename: string,
  publicId: string,
  folder = REAL_PHOTO_FOLDER
): Promise<string> {
  if (!cloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured on the server.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder, public_id: publicId, overwrite: "true", timestamp };

  const form = new FormData();
  form.append("file", new Blob([bytes]), filename);
  form.append("api_key", KEY!);
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
  form.append("signature", sign(signed));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Cloudinary echoes its own message; the secret is never in the response.
    throw new Error(body?.error?.message || `Upload failed (HTTP ${res.status})`);
  }
  return optimise(body.secure_url as string);
}
