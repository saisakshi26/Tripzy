import type { Metadata } from 'next';
import ExploreClient from '@/components/explore/ExploreClient';

export const metadata: Metadata = { title: 'Explore India' };

export default function ExplorePage() {
  return <ExploreClient />;
}
