import type { Metadata } from 'next';
import Wizard from '@/components/preferences/Wizard';

export const metadata: Metadata = { title: 'Your Travel Style' };

export default function PreferencesPage() {
  return <Wizard />;
}
