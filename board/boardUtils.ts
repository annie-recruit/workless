export const CARD_DIMENSIONS = {
  s: { width: 260, height: 200, centerX: 130, centerY: 100 },
  m: { width: 320, height: 240, centerX: 160, centerY: 120 },
  l: { width: 360, height: 280, centerX: 180, centerY: 140 },
} as const;

export const BOARD_PADDING = 100;

export const stripHtmlClient = (html: string) => {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // HTML 엔티티 디코딩
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const decoded = tempDiv.textContent || tempDiv.innerText || '';

  return decoded
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const sanitizeHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const allowedTags = new Set([
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'BR',
    'P',
    'DIV',
    'SPAN',
    'A',
    'UL',
    'OL',
    'LI',
    'FONT',
  ]);
  const allowedAttrs: Record<string, string[]> = {
    A: ['href', 'data-memory-id', 'class', 'target', 'rel'],
    SPAN: ['style', 'class', 'data-memory-id'],
    DIV: ['style', 'class'],
    P: ['style', 'class'],
    FONT: ['face', 'size', 'color'],
  };
  const allowedStyles = new Set([
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'text-decoration',
    'color',
  ]);

  doc.body.querySelectorAll('*').forEach((node) => {
    const tagName = node.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      const text = doc.createTextNode(node.textContent || '');
      node.replaceWith(text);
      return;
    }

    const allowed = (allowedAttrs[tagName] || []).map((a) => a.toLowerCase());
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }
      if (allowed.length > 0 && !allowed.includes(name)) {
        if (!name.startsWith('data-')) {
          node.removeAttribute(attr.name);
        }
      }
      if (name === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
        node.removeAttribute(attr.name);
      }
      if (name === 'style') {
        const safeStyles = attr.value
          .split(';')
          .map((rule) => rule.trim())
          .filter(Boolean)
          .map((rule) => {
            const [prop, value] = rule.split(':').map((v) => v.trim());
            if (!prop || !value) return null;
            return allowedStyles.has(prop.toLowerCase()) ? `${prop}: ${value}` : null;
          })
          .filter(Boolean)
          .join('; ');
        if (safeStyles) {
          node.setAttribute('style', safeStyles);
        } else {
          node.removeAttribute('style');
        }
      }
    });
  });

  return doc.body.innerHTML;
};


export const resolveTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
};
