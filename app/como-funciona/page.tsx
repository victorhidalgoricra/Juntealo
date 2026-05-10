import type { Metadata } from 'next';
import { ComoFuncionaPage } from '@/components/landing/como-funciona-page';

export const metadata: Metadata = {
  title: '¿Cómo funciona? — Juntealo',
  description:
    'Aprende cómo funcionan las juntas de ahorro en Juntealo: junta normal y junta con incentivos. Simulador interactivo incluido.',
};

export default function ComoFuncionaRoute() {
  return <ComoFuncionaPage />;
}
