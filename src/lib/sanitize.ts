const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SCRIPT_STYLE_PATTERN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const MULTIPLE_SPACES_PATTERN = /[ \t\f\v]+/g;
const MULTIPLE_WHITESPACE_PATTERN = /\s+/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_PATTERN = /^[a-f0-9]+$/;
const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

type SanitizeTextOptions = {
  maxLength?: number;
  preserveNewlines?: boolean;
};

export function sanitizeText(
  value: FormDataEntryValue | string | null | undefined,
  options: SanitizeTextOptions = {},
) {
  if (typeof value !== "string") {
    return "";
  }

  const maxLength = options.maxLength ?? 500;
  const whitespacePattern = options.preserveNewlines
    ? MULTIPLE_SPACES_PATTERN
    : MULTIPLE_WHITESPACE_PATTERN;

  return value
    .normalize("NFKC")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(SCRIPT_STYLE_PATTERN, "")
    .replace(HTML_TAG_PATTERN, "")
    .replace(whitespacePattern, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(
  value: FormDataEntryValue | string | null | undefined,
  options?: SanitizeTextOptions,
) {
  const sanitizedValue = sanitizeText(value, options);
  return sanitizedValue.length > 0 ? sanitizedValue : null;
}

export function sanitizeEmail(value: unknown) {
  const email = sanitizeText(typeof value === "string" ? value : "", {
    maxLength: 254,
  }).toLowerCase();

  return EMAIL_PATTERN.test(email) ? email : "";
}

export function sanitizeHttpUrl(value: unknown, maxLength = 2048) {
  if (typeof value !== "string") {
    return null;
  }

  if (value.trim().length > maxLength) {
    return null;
  }

  const url = sanitizeText(value, { maxLength });

  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function sanitizeHexToken(value: unknown, length = 64) {
  const token =
    typeof value === "string"
      ? value
          .normalize("NFKC")
          .replace(CONTROL_CHAR_PATTERN, "")
          .trim()
          .toLowerCase()
      : "";

  if (token.length !== length || !HEX_PATTERN.test(token)) {
    return "";
  }

  return token;
}

export function sanitizeExternalId(value: unknown, maxLength = 120) {
  const id = sanitizeText(typeof value === "string" ? value : "", {
    maxLength,
  });

  if (!id || !EXTERNAL_ID_PATTERN.test(id)) {
    return "";
  }

  return id;
}

export function sanitizeCloudinaryFolder(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "drogaria-mega-popular",
) {
  const folder = sanitizeText(value, { maxLength: 100 })
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^-+|-+$/g, "");

  return folder || fallback;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
