import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    CLOUDINARY_URL: z.string().nonempty().optional(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().nonempty().optional(),
    CLOUDINARY_API_KEY: z.string().nonempty().optional(),
    CLOUDINARY_API_SECRET: z.string().nonempty().optional(),
    STRIPE_SECRET_KEY: z.string().nonempty(),
    STRIPE_WEBHOOK_SECRET: z.string().nonempty(),
    MERCADO_PAGO_ACCESS_TOKEN: z.string().nonempty().optional(),
    MERCADO_PAGO_PUBLIC_KEY: z.string().nonempty().optional(),
    MERCADO_PAGO_WEBHOOK_SECRET: z.string().nonempty().optional(),
    assinatura_secreta_Teste: z.string().nonempty().optional(),
    Access_Token_Mercado_Pago: z.string().nonempty().optional(),
    Public_Key_Mercado_Pago: z.string().nonempty().optional(),
    NEXT_PUBLIC_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    Client_ID_Melhor_envio: z.string().nonempty().optional(),
    Secret_Melhor_envio: z.string().nonempty().optional(),
    Access_Token_Melhor_envio: z.string().nonempty().optional(),
    Refresh_Token_Melhor_envio: z.string().nonempty().optional(),
    MELHOR_ENVIO_TOKEN: z.string().nonempty().optional(),
    MELHOR_ENVIO_API_URL: z.string().url().optional(),
    MELHOR_ENVIO_USER_AGENT: z.string().nonempty().optional(),
    MELHOR_ENVIO_ALLOWED_COMPANIES: z.string().nonempty().optional(),
    MELHOR_ENVIO_ALLOWED_SERVICES: z.string().nonempty().optional(),
    MELHOR_ENVIO_DEFAULT_SERVICE_ID: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    MELHOR_ENVIO_ORIGIN_DOCUMENT: z.string().nonempty().optional(),
    MELHOR_ENVIO_ORIGIN_EMAIL: z.string().email().or(z.literal("")).optional(),
    DUMMYJSON_API_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.CLOUDINARY_URL) ||
      Boolean(
        value.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
        value.CLOUDINARY_API_KEY &&
        value.CLOUDINARY_API_SECRET,
      ),
    {
      message:
        "Set CLOUDINARY_URL or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET",
      path: ["CLOUDINARY_URL"],
    },
  );

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
const isProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (!parsed.success && process.env.NODE_ENV !== "test" && !isProductionBuild) {
  const errorMessages = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Environment validation failed:\n${errorMessages}`);
}

export const env: Env = parsed.success ? parsed.data : ({} as Env);
