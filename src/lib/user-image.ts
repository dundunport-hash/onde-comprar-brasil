import { sanitizeHttpUrl } from "@/lib/sanitize";

const MAX_USER_IMAGE_URL_LENGTH = 512;

export function normalizeUserImage(value: string | null | undefined) {
  return sanitizeHttpUrl(value, MAX_USER_IMAGE_URL_LENGTH);
}
