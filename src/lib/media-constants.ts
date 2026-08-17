/**
 * Upload limits shared by the browser and the server.
 *
 * Deliberately free of `server-only` and of any credential handling: the file
 * picker in the admin needs the accepted types, and the server action needs the
 * same list to validate against. One definition keeps the two from drifting —
 * the client list is a convenience for the picker, never the security boundary.
 */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** 10MB — comfortably above any product shot, low enough to reject mistakes. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
