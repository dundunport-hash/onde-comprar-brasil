/**
 * Espelho em TS dos tokens de cor definidos em `src/app/globals.css`
 * (fonte de runtime consumida pelo Tailwind v4). Mantenha os dois em sincronia.
 * Identidade: Onde Comprar Brasil (base clara, verde comercial, amarelo CTA e azul institucional).
 */
export const colorTokens = {
  background: "#f4f8f3",
  foreground: "#082252",
  surface: "#ffffff",
  border: "#d9e6d8",
  primary: "#008f3f",
  primaryForeground: "#ffffff",
  secondary: "#ffd500",
  muted: "#536176",
  success: "#008f3f",
  warning: "#d88a00",
  danger: "#dc2626",
  accent: "#003b91",
  institutional: "#003b91",
};

/** Valores aplicados em `@media (prefers-color-scheme: dark)`. */
export const darkColorTokens = {
  background: "#f4f8f3",
  foreground: "#082252",
  surface: "#ffffff",
  border: "#d9e6d8",
  muted: "#536176",
  primary: "#008f3f",
  primaryForeground: "#ffffff",
  secondary: "#ffd500",
  accent: "#003b91",
};

export const radiusTokens = {
  none: "0",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1.125rem",
  pill: "999px",
};

export const spacingTokens = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2.5rem",
};

export const shadowTokens = {
  sm: "0 2px 8px rgba(8, 34, 82, 0.06)",
  md: "0 12px 30px rgba(8, 34, 82, 0.1)",
  lg: "0 24px 80px rgba(8, 34, 82, 0.16)",
};

export const breakpointTokens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
};
