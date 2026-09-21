"use client";

import { useEffect, useState } from "react";
import { Cookie, Settings, ShieldCheck, X } from "lucide-react";

type ConsentCategory = "analytics" | "personalization" | "marketing";

type ConsentPreferences = Record<ConsentCategory, boolean>;

const STORAGE_KEY = "drogaria-lgpd-consent-v1";
const defaultPreferences: ConsentPreferences = {
  analytics: false,
  personalization: false,
  marketing: false,
};

const categories: Array<{
  key: ConsentCategory;
  title: string;
  description: string;
}> = [
  {
    key: "analytics",
    title: "Analiticos",
    description: "Ajudam a entender uso de paginas e fluxos da loja.",
  },
  {
    key: "personalization",
    title: "Personalizacao",
    description: "Guardam preferencias para melhorar a experiencia.",
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Apoiam campanhas e comunicacoes promocionais.",
  },
];

function readStoredPreferences() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return storedValue
      ? ({
          ...defaultPreferences,
          ...JSON.parse(storedValue),
        } as ConsentPreferences)
      : null;
  } catch {
    return null;
  }
}

function savePreferences(preferences: ConsentPreferences) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...preferences,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function CookieConsentBanner() {
  const [preferences, setPreferences] =
    useState<ConsentPreferences>(defaultPreferences);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedPreferences = readStoredPreferences();

      if (storedPreferences) {
        setPreferences(storedPreferences);
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!isReady) {
    return null;
  }

  function persist(nextPreferences: ConsentPreferences) {
    setPreferences(nextPreferences);
    savePreferences(nextPreferences);
    setIsVisible(false);
    setIsCustomizing(false);
  }

  function updateCategory(category: ConsentCategory) {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [category]: !currentPreferences[category],
    }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsVisible(true);
          setIsCustomizing(true);
        }}
        className="fixed bottom-4 left-4 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-lg transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Cookie className="h-4 w-4" aria-hidden="true" />
        Privacidade
      </button>

      {isVisible && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-lg">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Preferencias de privacidade
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  Usamos cookies essenciais para login, carrinho e seguranca.
                  Cookies opcionais so ficam ativos com sua escolha, que pode
                  ser alterada a qualquer momento.
                </p>

                {isCustomizing && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {categories.map((category) => (
                      <label
                        key={category.key}
                        className="flex cursor-pointer gap-3 rounded-lg border border-border bg-background p-3"
                      >
                        <input
                          type="checkbox"
                          checked={preferences[category.key]}
                          onChange={() => updateCategory(category.key)}
                          className="mt-1 h-4 w-4 accent-primary"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-foreground">
                            {category.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            {category.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={() =>
                  persist({
                    analytics: true,
                    personalization: true,
                    marketing: true,
                  })
                }
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
              >
                Aceitar todos
              </button>
              <button
                type="button"
                onClick={() => persist(defaultPreferences)}
                className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
              >
                Recusar opcionais
              </button>
              {isCustomizing ? (
                <button
                  type="button"
                  onClick={() => persist(preferences)}
                  className="inline-flex items-center justify-center rounded-lg border border-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-background"
                >
                  Salvar escolhas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Personalizar
                </button>
              )}
              <button
                type="button"
                aria-label="Fechar preferencias de privacidade"
                onClick={() => setIsVisible(false)}
                className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
