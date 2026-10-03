export interface LiveClipboardItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_CLIPBOARDS = 4;
export const MAX_CONTENT_LENGTH = 20000;

/**
 * Parses raw stored content from database into an array of LiveClipboardItem.
 * Handles:
 * 1. JSON array of multiple clipboards
 * 2. Legacy single-string clipboard content
 * 3. Empty or null content
 */
export function parseClipboards(rawContent: string | null | undefined): LiveClipboardItem[] {
  const defaultClipboard: LiveClipboardItem = {
    id: 'clip-1',
    title: 'Clipboard 1',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  if (!rawContent || typeof rawContent !== 'string') {
    return [defaultClipboard];
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return [defaultClipboard];
  }

  // Try parsing as JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeClipboards(parsed);
        if (sanitized.length > 0) {
          return sanitized;
        }
      }
    } catch {
      // Fall through to plain text
    }
  }

  // Legacy single plain string content
  return [
    {
      id: 'clip-1',
      title: 'Clipboard 1',
      content: rawContent.slice(0, MAX_CONTENT_LENGTH),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
}

/**
 * Sanitizes and validates an array of clipboard objects.
 * Enforces maximum of 4 clipboards, string content <= 20000 chars, and stable IDs.
 */
export function sanitizeClipboards(items: unknown[]): LiveClipboardItem[] {
  if (!Array.isArray(items)) return [];

  const result: LiveClipboardItem[] = [];
  const now = Date.now();

  for (let i = 0; i < Math.min(items.length, MAX_CLIPBOARDS); i++) {
    const raw = items[i];
    if (typeof raw !== 'object' || raw === null) continue;

    const obj = raw as Record<string, unknown>;
    const id = typeof obj.id === 'string' && obj.id.trim() 
      ? obj.id.trim().slice(0, 50) 
      : `clip-${i + 1}`;

    const title = typeof obj.title === 'string' && obj.title.trim() 
      ? obj.title.trim().slice(0, 50) 
      : `Clipboard ${i + 1}`;

    const content = typeof obj.content === 'string' 
      ? obj.content.slice(0, MAX_CONTENT_LENGTH) 
      : '';

    const createdAt = typeof obj.createdAt === 'number' && !isNaN(obj.createdAt) 
      ? obj.createdAt 
      : now;

    const updatedAt = typeof obj.updatedAt === 'number' && !isNaN(obj.updatedAt) 
      ? obj.updatedAt 
      : now;

    result.push({
      id,
      title,
      content,
      createdAt,
      updatedAt
    });
  }

  // Ensure at least Clipboard 1 exists
  if (result.length === 0) {
    result.push({
      id: 'clip-1',
      title: 'Clipboard 1',
      content: '',
      createdAt: now,
      updatedAt: now
    });
  }

  return result;
}
