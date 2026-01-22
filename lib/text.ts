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

// HTML에서 URL 추출 (href 속성 및 일반 텍스트 URL)
export function extractUrls(html: string): string[] {
  if (!html) return [];
  const urls = new Set<string>();
  
  // href 속성에서 URL 추출
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null = null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      urls.add(url);
    }
  }
  
  // 일반 텍스트에서 URL 추출
  const textUrlRegex = /https?:\/\/[^\s<>"']+/gi;
  while ((match = textUrlRegex.exec(html)) !== null) {
    urls.add(match[0]);
  }
  
  return Array.from(urls);
}
