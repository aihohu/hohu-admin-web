import dayjs from 'dayjs';

/** API timestamps include an offset; display every import date in browser local time. */
export function formatImportTime(value: string | null | undefined): string {
  if (!value) return '-';
  const instant = dayjs(value);
  return instant.isValid() ? instant.format('YYYY-MM-DD HH:mm:ss') : '-';
}
