# VUZKI Central Image Configuration

This is the ONE MASTER DOCUMENTATION FILE for all reusable image assets across the VUZKI project. All global images must be referenced through `assets.config.ts`. Do not hardcode image paths directly into components.

## 1. Brand Assets (Logos & Marks)

**Config key:** `BRAND_CONFIG.logo`
**Usage:** Used in `BrandLogo.tsx`, headers, footers, and SEO metadata.

| Config Key | Exact Filename | File Path | Asset Type | Purpose / Where it appears | Recommended Size | Ratio | Format |
|------------|----------------|-----------|------------|----------------------------|------------------|-------|--------|
| `primary` | `logo-primary.svg` | `/assets/brand/logo-primary.svg` | Logo | Main application logo with text | Scalable | — | SVG |
| `dark` | `logo-dark.svg` | `/assets/brand/logo-dark.svg` | Logo | Optimized for dark backgrounds | Scalable | — | SVG |
| `light` | `logo-light.svg` | `/assets/brand/logo-light.svg` | Logo | Optimized for light backgrounds | Scalable | — | SVG |
| `mark` | `logo-mark.svg` | `/assets/brand/logo-mark.svg` | Brand mark | The VUZKI heart icon without text | Scalable | 1:1 | SVG |
| `favicon` | `favicon.ico` | `/assets/brand/favicon.ico` | Favicon | Browser tab icon (`app/layout.tsx`) | 32x32 | 1:1 | ICO |
| `appIcon` | `app-icon.png` | `/assets/brand/app-icon.png` | App icon | PWA/Mobile home screen icon | 512x512 | 1:1 | PNG |

## 2. Onboarding Assets

**Config key:** `BRAND_CONFIG.assets.onboarding`
**Usage:** Used in the `/welcome` carousel and new-user introductory flows.

| Config Key | Exact Filename | File Path | Asset Type | Purpose / Where it appears | Recommended Size | Ratio | Format |
|------------|----------------|-----------|------------|----------------------------|------------------|-------|--------|
| `onboarding[0]` | `onboarding-01.webp` | `/assets/onboarding/onboarding-01.webp` | Onboarding | First intro screen / welcome | 1080×1920 | 9:16 | WEBP |
| `onboarding[1]` | `onboarding-02.webp` | `/assets/onboarding/onboarding-02.webp` | Onboarding | Second feature highlight | 1080×1920 | 9:16 | WEBP |
| `onboarding[2]` | `onboarding-03.webp` | `/assets/onboarding/onboarding-03.webp` | Onboarding | Third feature highlight | 1080×1920 | 9:16 | WEBP |
| `onboarding[3]` | `onboarding-04.webp` | `/assets/onboarding/onboarding-04.webp` | Onboarding | Final / 'Get Started' screen | 1080×1920 | 9:16 | WEBP |

## 3. Authentication UI Assets

**Config key:** `BRAND_CONFIG.assets.auth`
**Usage:** Visual elements for Login, Registration, and Forgot Password screens.

| Config Key | Exact Filename | File Path | Asset Type | Purpose / Where it appears | Recommended Size | Ratio | Format |
|------------|----------------|-----------|------------|----------------------------|------------------|-------|--------|
| `background` | `auth-bg.webp` | `/assets/auth/auth-bg.webp` | Background | Full-screen background image | 1920×1080 | 16:9 | WEBP |
| `illustration`| `auth-illustration.webp`| `/assets/auth/auth-illustration.webp`| Illustration| Thematic illustration | 800×800 | 1:1 | WEBP |

## 4. Other UI / Empty States

*(Add missing or future empty states, promotional banners, or placeholder illustrations here. Currently, user avatars and media messages are dynamically loaded via the API.)*

## How to replace an image:
1. Open this file to find the target asset's path and dimensions.
2. Replace the physical file in `apps/web/public/assets/...` keeping the exact name, OR
3. Update `assets.config.ts` to point to a new filename.
4. The change will automatically reflect across all pages/components importing the config.
