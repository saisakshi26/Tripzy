import type { Metadata } from 'next';
import PlannerClient from '@/components/planner/PlannerClient';

export const metadata: Metadata = { title: 'Plan Your Trip' };

export default function PlannerPage() {
  return <PlannerClient />;
}
