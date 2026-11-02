// Server-only: these values are read from process.env inside API routes and never sent to the browser.
const read = (name: string): string => (process.env[name] ?? '').trim();

export const geminiKey = (): string => read('GEMINI_API_KEY');
export const geminiModel = (): string => read('GEMINI_MODEL') || 'gemini-2.5-flash';
export const placesKey = (): string => read('GOOGLE_PLACES_API_KEY');
export const unsplashKey = (): string => read('UNSPLASH_ACCESS_KEY');

export const capabilities = () => ({
  gemini: !!geminiKey(),
  places: !!placesKey(),
  unsplash: !!unsplashKey(),
});
