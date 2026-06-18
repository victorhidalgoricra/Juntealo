import type { Metadata } from 'next';
import { AmbassadorHero } from '@/components/landing/ambassador/AmbassadorHero';
import { AmbassadorSteps } from '@/components/landing/ambassador/AmbassadorSteps';
import { AmbassadorBenefits } from '@/components/landing/ambassador/AmbassadorBenefits';
import { AmbassadorActiveUser } from '@/components/landing/ambassador/AmbassadorActiveUser';
import { AmbassadorProfile } from '@/components/landing/ambassador/AmbassadorProfile';
import { AmbassadorCta } from '@/components/landing/ambassador/AmbassadorCta';
import { AmbassadorFaq } from '@/components/landing/ambassador/AmbassadorFaq';

export const metadata: Metadata = {
  title: 'Programa de Embajadores | Juntealo',
  description:
    'Conviértete en embajador de Juntealo, invita a tu comunidad y obtén beneficios por los usuarios referidos que se mantengan activos.',
};

export default function EmbajadorPage() {
  return (
    <>
      <AmbassadorHero />
      <AmbassadorSteps />
      <AmbassadorBenefits />
      <AmbassadorActiveUser />
      <AmbassadorProfile />
      <AmbassadorCta />
      <AmbassadorFaq />
    </>
  );
}
