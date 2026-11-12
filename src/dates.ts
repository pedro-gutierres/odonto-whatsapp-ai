export function validLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(value)) return false;
  const normalized = value.replace(' ', 'T');
  const parsed = new Date(normalized + ':00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,16) === normalized;
}

export function durationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().toLowerCase().match(/^(?:(\d{1,2})\s*h(?:\s*(\d{1,2})(?:\s*min)?)?|(\d{1,3})(?:\s*(?:min|m))?)$/);
  if (!match) return null;
  const minutes = match[1] ? Number(match[1])*60+Number(match[2] || 0) : Number(match[3]);
  return minutes > 0 && minutes <= 720 ? minutes : null;
}

export function appointmentEnd(start: string, duration: string): string | null {
  const minutes=durationMinutes(duration);
  if (!validLocalDate(start) || minutes===null) return null;
  const normalized=start.replace(' ','T');
  return new Date(Date.parse(normalized+':00Z')+minutes*60000).toISOString().slice(0,16).replace('T',' ');
}
