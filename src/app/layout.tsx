import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { LazyCookieConsentBanner } from "@/components/LazyClientComponents";
import { ToastProvider } from "@/components/ToastProvider";
import { SITE_NAME } from "@/lib/store-contact";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Tudo o que voce procura, mais perto de voce. Produtos brasileiros, ofertas e entrega para todo o Brasil.";
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: SITE_NAME,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: siteDescription,
    url: "/",
    siteName: SITE_NAME,
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Link
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-primary"
        >
          Ir para o conteudo
        </Link>
        <ToastProvider>
          <Nav />
          <div id="conteudo" className="flex-1">
            {children}
          </div>
          <Footer />
          <LazyCookieConsentBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
