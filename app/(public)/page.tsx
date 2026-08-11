import { ExploreJuntasSection } from '@/components/landing/explore-juntas-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { LandingHero } from '@/components/landing/landing-hero';
import { SocialProofSection } from '@/components/landing/social-proof-section';
import { DualPathSelector } from '@/components/landing/dual-path-selector';
import { MoneyTrustStrip } from '@/components/landing/money-trust-strip';
import { FinalCTASection } from '@/components/landing/final-cta-section';

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <DualPathSelector />

      <div id="necesito-dinero">
        <HowItWorksSection />
        <MoneyTrustStrip />
        <ExploreJuntasSection />
        <SocialProofSection />
      </div>
      <FinalCTASection />
    </>
  );
}
