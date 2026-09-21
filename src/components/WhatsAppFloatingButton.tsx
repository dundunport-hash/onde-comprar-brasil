"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

const DEFAULT_WHATSAPP_URL =
  "https://wa.me/5519981880619?text=Ol%C3%A1%2C%20estou%20no%20seu%20site%20e%20quero%20saber%20mais..";

const WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL || DEFAULT_WHATSAPP_URL;

const hiddenPathPrefixes = ["/dashboard", "/api"];

export function WhatsAppFloatingButton() {
  const pathname = usePathname();
  const shouldHide = hiddenPathPrefixes.some((prefix) =>
    pathname?.startsWith(prefix),
  );

  if (shouldHide) {
    return null;
  }

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#1ebe5d] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span>Fale conosco</span>
    </a>
  );
}
