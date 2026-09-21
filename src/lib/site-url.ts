export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_URL ?? process.env.NEXTAUTH_URL;

  try {
    return new URL(configuredUrl ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}
