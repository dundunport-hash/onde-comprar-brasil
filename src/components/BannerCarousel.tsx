import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import {
  Grand_Hotel,
  Edu_NSW_ACT_Cursive,
  Caveat,
  Caramel,
} from "next/font/google";

const caveat = Caveat({
  subsets: ["latin"],
  weight: "400",
});

const grandHotel = Grand_Hotel({
  subsets: ["latin"],
  weight: "400",
});

export function BannerCarousel() {
  return (
    <section
      aria-labelledby="store-hero-title"
      className="relative isolate overflow-hidden bg-[#032d22] text-white shadow-sm"
    >
      <Image
        src="/banner.png"
        alt=""
        fill
        sizes="100vw"
        fetchPriority="high"
        preload
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,30,30,0.86)_0%,rgba(2,40,35,0.68)_31%,rgba(2,40,35,0.18)_55%,rgba(255,255,255,0)_76%)]" />
      <div className="relative mx-auto grid min-h-80 max-w-7xl content-center gap-5 px-4 py-8 sm:min-h-88 sm:px-6 lg:min-h-73 lg:px-8">
        <div className="max-w-140">
          <h1
            id="store-hero-title"
            className="text-[2.45rem] font-black leading-[0.95] tracking-normal text-white drop-shadow sm:text-6xl lg:text-[4.3rem]"
          >
            O Brasil inteiro
            <span className="block text-secondary">em um so lugar</span>
          </h1>
          <p className="mt-4 max-w-124 text-base font-semibold leading-6 text-white sm:text-lg">
            Descubra as melhores lojas, produtos e ofertas do Brasil. Compre com
            seguranca, apoie o comercio nacional e encontre tudo o que voce
            precisa.
          </p>
          <Link
            href="#catalogo"
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-secondary px-8 text-base font-black text-foreground shadow-[0_10px_22px_rgba(0,0,0,0.18)] transition hover:bg-[#ffe229] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Comprar agora
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid max-w-xl grid-cols-1 gap-3 text-xs font-semibold text-white sm:grid-cols-3">
          <li className="flex items-center gap-3">
            <Truck className="h-8 w-8 shrink-0" aria-hidden="true" />
            Entrega para todo o Brasil
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 shrink-0" aria-hidden="true" />
            Compra segura e garantida
          </li>
          <li className="flex items-center gap-3">
            <Heart className="h-8 w-8 shrink-0" aria-hidden="true" />
            Mais de 100 mil clientes satisfeitos
          </li>
        </ul>
      </div>

      <p
        className={`absolute left-[50%] top-12 hidden ${caveat.className} max-w-48 rotate-[-7deg] text-center text-3xl font-bold italic leading-7 text-institutional drop-shadow-sm xl:block`}
      >
        Valorizar
        <br />
        o que é nosso
        <br />
        também é
        <br />
        um bom negócio!
      </p>

      <ul className="absolute right-6 top-1/2 hidden -translate-y-1/2 grid-cols-1 gap-4 xl:grid">
        {[
          { icon: Heart, text: "Produtos brasileiros" },
          { icon: Sparkles, text: "Mais economia para voce" },
          { icon: Users, text: "Juntos por um Brasil mais forte" },
        ].map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex min-h-14 w-44 items-center gap-3 rounded-full bg-white px-4 text-xs font-black leading-tight text-institutional shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
