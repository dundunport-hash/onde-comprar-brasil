import {
  breakpointTokens,
  colorTokens,
  radiusTokens,
  shadowTokens,
  spacingTokens,
} from "./tokens";
import {
  fontFamilies,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
} from "./typography";

export const theme = {
  colors: colorTokens,
  radius: radiusTokens,
  spacing: spacingTokens,
  shadows: shadowTokens,
  breakpoints: breakpointTokens,
  typography: {
    fonts: fontFamilies,
    sizes: fontSizes,
    weights: fontWeights,
    lineHeights,
    letterSpacings,
  },
};

export type Theme = typeof theme;
