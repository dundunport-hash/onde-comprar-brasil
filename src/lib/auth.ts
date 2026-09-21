import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { assertRateLimit, createRateLimitKey } from "./rate-limit";
import { sanitizeEmail } from "./sanitize";
import { normalizeUserImage } from "./user-image";
import { AUTH_SESSION_COOKIE_NAME } from "./auth-cookie";

export async function authorizeCredentials(credentials?: {
  email?: string;
  password?: string;
}) {
  const email = sanitizeEmail(credentials?.email);

  if (!email || !credentials?.password) return null;

  assertRateLimit({
    key: createRateLimitKey("login:email", email),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) return null;

  const { default: bcrypt } = await import("bcryptjs");
  const isValidPassword = await bcrypt.compare(
    credentials.password,
    user.passwordHash,
  );

  if (!isValidPassword) return null;

  return {
    id: user.id,
    name: user.name ?? "Usuário",
    email: user.email,
    image: normalizeUserImage(user.image),
    role: user.role,
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: AUTH_SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const safeImage = normalizeUserImage(user.image);

        if (safeImage) {
          token.picture = safeImage;
        } else {
          delete token.picture;
        }
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = normalizeUserImage(token.picture);
        session.user.role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === baseUrl) return url;
      } catch {
        // URL inválida
      }
      return baseUrl;
    },
  },
};
