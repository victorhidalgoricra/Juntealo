import { ExploreJuntasSection } from '@/components/landing/explore-juntas-section';
import { AmbassadorInviteSection } from '@/components/landing/ambassador-invite-section';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { FinalCTASection } from '@/components/landing/final-cta-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { LandingHero } from '@/components/landing/landing-hero';
import { SocialProofSection } from '@/components/landing/social-proof-section';

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <HowItWorksSection />
      <FeaturesGrid />
      <AmbassadorInviteSection />
      <ExploreJuntasSection />
      <SocialProofSection />
      <FinalCTASection />
    </>
  );
}
