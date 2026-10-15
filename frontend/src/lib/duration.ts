/** Display a decimal-hour estimate to the nearest whole minute. */
export function formatHoursMinutes(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return 'Not available'
  const totalMinutes = Math.round(Math.abs(hours) * 60)
  const sign = hours < 0 ? '-' : ''
  return `${sign}${Math.floor(totalMinutes / 60)} hr ${totalMinutes % 60} min`
}
