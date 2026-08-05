/**
 * Central media URL resolver.
 * Today: local public paths.
 * Tomorrow: set NEXT_PUBLIC_MEDIA_BASE_URL to an S3 (or CDN) origin.
 */
export function getMediaUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "") ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
