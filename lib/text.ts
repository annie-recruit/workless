export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMentionIds(html: string): string[] {
  if (!html) return [];
  const ids = new Set<string>();
  const regex = /data-memory-id="([^"]+)"/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}
