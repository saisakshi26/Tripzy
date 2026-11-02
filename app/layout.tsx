import type { Metadata, Viewport } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { TripProvider } from '@/hooks/useTrip';
import { PhotoProvider } from '@/hooks/usePhotos';
import { destinations } from '@/lib/data/destinations';
import { localPhotos } from '@/lib/server/localPhotos';
import { unsplashKey } from '@/lib/server/env';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Tripzy — Your Trip. Your Vibe.', template: '%s · Tripzy' },
  description: 'A luxury AI travel concierge for India: discover destinations, tell us your travel personality and get a day-by-day plan that fits your budget.',
};

export const viewport: Viewport = { themeColor: '#24130F', width: 'device-width', initialScale: 1 };

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const photos = { local: localPhotos(destinations.map((d) => d.id)), unsplash: !!unsplashKey() };
  return (
    <html lang="en" className={`${playfair.variable} ${manrope.variable}`}>
      <body>
        <PhotoProvider value={photos}>
          <TripProvider>
            <Navbar />
            {children}
            <Footer />
          </TripProvider>
        </PhotoProvider>
      </body>
    </html>
  );
}
