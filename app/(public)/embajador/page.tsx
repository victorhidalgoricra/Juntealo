import type { Metadata } from 'next';
import { AmbassadorHero } from '@/components/landing/ambassador/AmbassadorHero';
import { AmbassadorBenefits } from '@/components/landing/ambassador/AmbassadorBenefits';
import { AmbassadorSteps } from '@/components/landing/ambassador/AmbassadorSteps';
import { AmbassadorActiveUser } from '@/components/landing/ambassador/AmbassadorActiveUser';
import { AmbassadorPurpose } from '@/components/landing/ambassador/AmbassadorPurpose';
import { AmbassadorProfile } from '@/components/landing/ambassador/AmbassadorProfile';
import { AmbassadorCta } from '@/components/landing/ambassador/AmbassadorCta';

export const metadata: Metadata = {
  title: 'Programa de Embajadores | Juntealo',
  description:
    'Conviértete en embajador de Juntealo. Ayuda a más personas a organizar sus juntas, acompaña a tu comunidad y crece a medida que generas un mayor impacto.',
};

export default function EmbajadorPage() {
  return (
    <>
      <AmbassadorHero />
      <AmbassadorBenefits />
      <AmbassadorSteps />
      <AmbassadorActiveUser />
      <AmbassadorPurpose />
      <AmbassadorProfile />
      <AmbassadorCta />
    </>
  );
}
