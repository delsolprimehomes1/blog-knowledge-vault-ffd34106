export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/^XX\+?/, '+');
}
