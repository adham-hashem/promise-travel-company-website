export function packageShareUrl(packageId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/#package/${packageId}`;
}

export function offerShareUrl(offerId: string): string {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/#offer/${offerId}`;
}
