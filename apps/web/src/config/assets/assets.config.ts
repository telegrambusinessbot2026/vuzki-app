export const BRAND_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'VUZKI',
  tagline: 'Real People. Real Connections.',
  seoTagline: 'Meet • Talk • Connect',
  logo: {
    primary: '/assets/brand/logo-primary.svg',
    dark: '/assets/brand/logo-dark.svg',
    light: '/assets/brand/logo-light.svg',
    mark: '/assets/brand/logo-mark.svg',
    favicon: '/assets/brand/favicon.ico',
    appIcon: '/assets/brand/app-icon.png'
  },
  assets: {
    onboarding: [
      '/assets/onboarding/onboarding-01.webp',
      '/assets/onboarding/onboarding-02.webp',
      '/assets/onboarding/onboarding-03.webp',
      '/assets/onboarding/onboarding-04.webp'
    ],
    auth: {
      background: '/assets/auth/auth-bg.webp',
      illustration: '/assets/auth/auth-illustration.webp'
    }
  }
};
