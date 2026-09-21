import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = new Stripe(
  env.STRIPE_SECRET_KEY || "sk_test_placeholder",
);

export function toStripeAmount(value: number) {
  return Math.max(Math.round(value * 100), 0);
}
