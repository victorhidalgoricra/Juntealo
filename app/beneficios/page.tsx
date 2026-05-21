import type { Metadata } from 'next';
import { BenefitsPage } from '@/components/landing/benefits-page';

export const metadata: Metadata = {
  title: 'Beneficios — Juntealo',
  description:
    'Descubre cómo Juntealo convierte tu historial de pagos en reputación dentro de la plataforma. Niveles, score de confianza, misiones y más.',
};

export default function BeneficiosRoute() {
  return <BenefitsPage />;
}
