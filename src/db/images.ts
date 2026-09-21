export type ResponsiveBanner = {
  id: number;
  desktop: BannerSource;
  tablet: BannerSource;
  mobile: BannerSource;
};

type BannerSource = {
  src: string;
  width: number;
  height: number;
};

const officialBanner = {
  src: "/banner.png",
  width: 1672,
  height: 941,
};

export const images: ResponsiveBanner[] = Array.from(
  { length: 10 },
  (_, index) => ({
    id: index + 1,
    desktop: officialBanner,
    tablet: officialBanner,
    mobile: officialBanner,
  }),
);
