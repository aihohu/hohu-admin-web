/** A replacement UI requires a bounded tree with unique IDs and real labels. */
export function completeTreeIds(nodes: unknown, maximum = 8192): Set<string> | null {
  if (!Array.isArray(nodes)) return null;
  const ids = new Set<string>();
  function visit(rows: unknown[], depth: number): boolean {
    if (depth > 16) return false;
    for (const item of rows) {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== 'string' || !row.id || typeof row.label !== 'string' || !row.label || ids.has(row.id))
        return false;
      ids.add(row.id);
      if (
        ids.size > maximum ||
        (row.children !== undefined && (!Array.isArray(row.children) || !visit(row.children, depth + 1)))
      )
        return false;
    }
    return true;
  }
  return visit(nodes, 1) ? ids : null;
}
