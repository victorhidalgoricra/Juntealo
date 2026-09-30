import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RachaCard, type RachaCardProps } from '../racha-card';

const base: RachaCardProps = {
  juntaId: 'j1', href: '/juntas/j1/payments', juntaNombre: 'Ahorro familiar',
  semanasActual: 0, recordPersonal: 0, proximoHito: 4, estado: 'rota',
  pendientesRevision: 0, tieneDeuda: true, cuotaInterrumpida: 1, fechaInterrupcion: '2026-09-15',
};
const render = (props: Partial<RachaCardProps>) => renderToStaticMarkup(createElement(RachaCard, { ...base, ...props }));

describe('streak explanations', () => {
  it('does not claim that a first-time payer lost a streak', () => {
    const html = render({});
    expect(html).toContain('Empieza tu primera racha');
    expect(html).toMatch(/15 de se(p)?tiembre/);
    expect(html).toContain('Ahorro familiar');
    expect(html).toContain('Ver cuota pendiente');
    expect(html).not.toContain('perdida esta semana');
  });
  it('distinguishes review from confirmed points', () => {
    const html = render({ estado: 'en_revision', semanasActual: 3, pendientesRevision: 1, tieneDeuda: false });
    expect(html).toContain('Pago en revisión');
    expect(html).toContain('3 cuotas confirmadas');
    expect(html).toContain('Ver pago en revisión');
    expect(html).not.toContain('puntos otorgados');
  });
  it('does not show negative milestone progress beyond twelve installments', () => {
    const html = render({ estado: 'activa', semanasActual: 15, recordPersonal: 15, proximoHito: 12, rewardEarned: true });
    expect(html).toContain('15 cuotas seguidas a tiempo');
    expect(html).toContain('puntos otorgados una sola vez');
    expect(html).toContain('sin puntos extra');
    expect(html).not.toContain('Faltan -');
  });
});
