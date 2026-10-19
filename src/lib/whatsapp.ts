/**
 * WhatsApp helpers.
 * Builds a WhatsApp deep link for a phone number. The message is opened in
 * WhatsApp for the user to review and send — we never claim it was sent.
 */

/** Normalize a Tunisian (or any) phone number to international E.164-ish format. */
export function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/\s/g, '')
  // Remove leading +
  const hasPlus = p.startsWith('+')
  p = p.replace(/^\+/, '')

  // If it looks like a local Tunisian number (8 digits), prefix with country code 216
  if (!hasPlus && /^\d{8}$/.test(p)) {
    return '216' + p
  }
  // If it starts with 00, convert to + style digits
  if (p.startsWith('00')) {
    return p.slice(2)
  }
  return p
}

/** Build a WhatsApp web link. Open in a new tab so the user can review & send. */
export function whatsappLink(phone: string, message: string): string {
  const to = normalizePhone(phone)
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${to}?text=${encoded}`
}

/** Open WhatsApp link in a new tab. Returns the link. */
export function openWhatsApp(phone: string, message: string): string {
  const link = whatsappLink(phone, message)
  window.open(link, '_blank', 'noopener,noreferrer')
  return link
}
