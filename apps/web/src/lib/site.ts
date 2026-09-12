export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'VUZKI';
export const APP_TAGLINE = 'Meet • Talk • Connect';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function absoluteUrl(path = ''): string {
  if (!path) return SITE_URL.replace(/\/$/, '');
  return `${SITE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}