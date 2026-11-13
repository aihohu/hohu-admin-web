/** Only authenticated API responses enter this helper; returned URLs are never followed. */
export function downloadBlob(value: unknown, filename: string): boolean {
  if (!(value instanceof Blob) || value.size === 0 || value.type.includes('json') || value.type.includes('html'))
    return false;
  const url = URL.createObjectURL(value);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = Array.from(filename, char =>
      char === '/' || char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? '_' : char
    ).join('');
    document.body.appendChild(anchor);
    anchor.click();
    return true;
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
