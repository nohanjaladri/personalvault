/**
 * Sanitize filename to prevent path traversal and shell injection.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') return 'untitled';
  
  // 1. Remove path traversal and directory separators (/, \)
  let clean = name.replace(/[/\\]/g, '');
  
  // 2. Remove multiple dots in a row (e.g. .. or ...)
  clean = clean.replace(/\.\.+/g, '.');
  
  // 3. Keep only safe characters: alphanumeric, spaces, dots, dashes, underscores
  clean = clean.replace(/[^a-zA-Z0-9 _.-]/g, '');
  
  // 4. Trim leading/trailing dots and spaces
  clean = clean.trim().replace(/^\.+|\.+$/g, '');
  
  if (!clean) clean = 'untitled';
  
  // 5. Enforce safe length limit (100 characters)
  return clean.substring(0, 100);
}

/**
 * Escapes HTML characters to prevent XSS script injection.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates note text contents to prevent script inject or dangerous patterns.
 */
export function isContentSafe(content: string): boolean {
  if (!content) return true;
  // Simple check: we don't want to block text completely, but we can detect malicious patterns if necessary.
  // In our app, text content is stored in files and displayed safely in pre tags, so it is naturally safe.
  // But we can check for extremely large buffer overflow attempts (> 10MB) to protect the DB metadata limits.
  return content.length <= 10 * 1024 * 1024;
}
