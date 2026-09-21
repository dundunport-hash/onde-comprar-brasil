import { headers } from "next/headers";
import { getServerSession, type Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "./auth";
import { normalizeUserImage } from "./user-image";

export async function getAuthSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);

  if (session) {
    return session;
  }

  const cookie = (await headers()).get("cookie");

  if (!cookie || !process.env.NEXTAUTH_SECRET) {
    return null;
  }

  const req = {
    headers: {
      cookie,
    },
  } as unknown as Parameters<typeof getToken>[0]["req"];

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: authOptions.cookies?.sessionToken?.name,
  });

  if (!token) {
    return null;
  }

  return {
    user: {
      id: (token.id as string | undefined) ?? token.sub ?? "",
      name: token.name,
      email: token.email,
      image: normalizeUserImage(token.picture),
      role: token.role as string | undefined,
    },
    expires: token.exp
      ? new Date(Number(token.exp) * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
