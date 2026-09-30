'use client';

import React from 'react';
import Link from 'next/link';
import type { RachaResult } from '@/lib/racha';

export type RachaCardProps = RachaResult & { href: string; juntaNombre?: string; rewardEarned?: boolean; juntaCerrada?: boolean };

export function RachaCard({ semanasActual, recordPersonal, proximoHito, estado, horasRestantes,
  cuotaInterrumpida, fechaInterrupcion, pendientesRevision, tieneDeuda, href, juntaNombre, rewardEarned, juntaCerrada }: RachaCardProps) {
  const broken = estado === 'rota';
  const title = estado === 'en_revision' ? 'Pago en revisión'
    : broken ? (recordPersonal > 0 ? 'Tu racha se interrumpió' : 'Empieza tu primera racha')
    : semanasActual === 0 ? 'Empieza tu primera racha'
    : `${semanasActual} cuota${semanasActual === 1 ? '' : 's'} seguidas a tiempo`;
  const date = fechaInterrupcion ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })
    .format(new Date(fechaInterrupcion.length === 10 ? `${fechaInterrupcion}T12:00:00-05:00` : fechaInterrupcion)) : '';
  const detail = estado === 'en_revision'
    ? `${pendientesRevision} pago(s) registrado(s) a tiempo pendiente(s) de aprobación. Llevas ${semanasActual} cuotas confirmadas; sumarán al aprobarse.`
    : broken ? `La cuota ${cuotaInterrumpida ?? ''}${date ? ` del ${date}` : ''} venció sin un pago puntual aprobado. Tu récord es de ${recordPersonal} cuotas.`
    : estado === 'en_riesgo' ? `Te quedan ${horasRestantes} h para registrar tu próxima cuota a tiempo.`
    : 'Cada cuota puntual aprobada suma. El turno en que recibes no interrumpe tu racha.';
  const benefit = rewardEarned
    ? 'Misión de 4 cuotas completada: +6 puntos otorgados una sola vez.'
    : `${Math.min(semanasActual, 4)} de 4 cuotas para ganar +6 puntos una sola vez.`;
  return (
    <Link href={href} className={`mb-3 block rounded-xl border p-4 transition-opacity hover:opacity-85 ${broken ? 'border-slate-200 bg-slate-50' : 'border-amber-300 bg-amber-50'}`}>
      {juntaNombre && <p className="mb-1 text-xs font-medium text-slate-600">{juntaNombre}</p>}
      <p className="font-bold text-slate-900">{broken ? '↻' : '🔥'} {title}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
      <p className="mt-2 text-xs text-amber-800">{benefit}</p>
      <p className="mt-1 text-xs text-slate-500">{juntaCerrada ? 'Esta junta finalizó. Conservas tu historial de puntualidad.' : semanasActual >= 12 ? 'Hitos de 4, 8 y 12 cuotas alcanzados.' : `Próximo hito: ${proximoHito} cuotas.`} Los hitos de 8 y 12 son reconocimientos sin puntos extra.</p>
      <span className="mt-3 inline-block text-sm font-semibold text-slate-800">{juntaCerrada ? 'Ver historial de cuotas' : tieneDeuda ? 'Ver cuota pendiente' : estado === 'en_revision' ? 'Ver pago en revisión' : broken ? 'Ver próxima cuota' : 'Ver cuotas'} →</span>
    </Link>
  );
}
