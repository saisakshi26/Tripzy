import Hero from '@/components/home/Hero';
import { FeaturedDestinations, FinalCTA, HowItWorks, WhyTripzy } from '@/components/home/Sections';

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedDestinations />
      <WhyTripzy />
      <HowItWorks />
      <FinalCTA />
    </>
  );
}
