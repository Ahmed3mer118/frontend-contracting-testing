/** Client-side text filter — avoids API reload on each keystroke. */
export function matchesSearch(text: string, query?: string): boolean {
  if (!query?.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}
