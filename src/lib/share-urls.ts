/**
 * Generates a shareable URL for a package that produces dynamic Open Graph
 * meta tags when crawled by social platforms (WhatsApp, Facebook, Telegram, etc.)
 *
 * The URL points to the `package-og` edge function which:
 *  1. Returns HTML with package-specific OG tags (image, title, price, etc.)
 *  2. Redirects real browsers to the SPA with `#package/{id}` hash
 *
 * This ensures each package gets its own rich preview when shared.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function packageShareUrl(packageId: string): string {
  return `${SUPABASE_URL}/functions/v1/package-og/package/${packageId}`;
}

export function offerShareUrl(offerId: string): string {
  // Offers don't have their own OG endpoint yet; use app deep-link.
  return `${typeof window !== "undefined" ? window.location.origin : ""}/#offer/${offerId}`;
}
