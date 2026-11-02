export const inr = (n: number): string =>
  '₹' + Math.round(n).toLocaleString('en-IN');

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + n);
  return toISODate(dt);
};

export const diffDays = (a: string, b: string): number => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((t2 - t1) / 86400000);
};

export const prettyDate = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const prettyDateLong = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const monthOf = (iso: string): number => Number((iso || '').split('-')[1] || 1);

export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const mapsSearchUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const mapsDirectionsUrl = (from: string, to: string): string =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;

export const hhmm = (minutes: number): string => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
};

export const durationLabel = (h: number): string => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
};
