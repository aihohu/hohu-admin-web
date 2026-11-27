/** Only the fenced controller adds this marker to the verified console HTML. */
export function isMaintenanceConsole() {
  return (
    typeof document !== 'undefined' &&
    document.querySelector('meta[name="hohu-admission"]')?.getAttribute('content') === 'field-management/2'
  );
}
