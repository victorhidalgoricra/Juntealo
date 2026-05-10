'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { EstadoRacha } from '@/lib/racha';

export type RachaCardProps = {
  semanasActual: number;
  recordPersonal: number;
  proximoHito: number;
  estado: EstadoRacha;
  horasRestantes?: number;
};

export function RachaCard({ semanasActual, recordPersonal, proximoHito, estado, horasRestantes }: RachaCardProps) {
  const router = useRouter();

  if (semanasActual === 0 && estado !== 'rota') return null;

  const isRota = estado === 'rota';
  const isEnRiesgo = estado === 'en_riesgo';

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    marginBottom: 12,
    background: isRota ? '#fafafa' : '#fff8e6',
    border: isRota ? '1px solid #ebebeb' : '1.5px solid #f0a500',
  };

  const badgeStyle: CSSProperties = {
    background: isEnRiesgo ? '#e07000' : isRota ? '#f0f0ec' : '#f0a500',
    color: isRota ? '#666' : '#fff',
    borderRadius: 20,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={containerStyle}
      onClick={() => router.push('/mi-racha')}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>
        {isRota ? <span style={{ color: '#bbb' }}>—</span> : '🔥'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {estado === 'activa' && (
          <>
            <p style={{ fontWeight: 700, color: '#111', margin: 0, lineHeight: '1.3' }}>
              {semanasActual} semana{semanasActual !== 1 ? 's' : ''} pagando a tiempo
            </p>
            <p style={{ fontSize: 11, color: '#b37800', margin: '2px 0 0' }}>
              Faltan {proximoHito - semanasActual} para el hito de {proximoHito} semanas
            </p>
          </>
        )}
        {estado === 'en_riesgo' && (
          <>
            <p style={{ fontWeight: 700, color: '#111', margin: 0, lineHeight: '1.3' }}>
              {semanasActual} semana{semanasActual !== 1 ? 's' : ''} — te quedan {horasRestantes}h
            </p>
            <p style={{ fontSize: 11, color: '#b37800', margin: '2px 0 0' }}>
              Paga ahora para no perder tu racha
            </p>
          </>
        )}
        {estado === 'rota' && (
          <>
            <p style={{ fontWeight: 700, color: '#999', margin: 0, lineHeight: '1.3' }}>
              Racha perdida esta semana
            </p>
            <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>
              Tu récord de {recordPersonal} semanas queda guardado — empieza una nueva hoy
            </p>
          </>
        )}
      </div>

      <span style={badgeStyle}>
        {estado === 'activa' && `${proximoHito} sem →`}
        {estado === 'en_riesgo' && `⚠ ${horasRestantes}h`}
        {estado === 'rota' && 'Empezar →'}
      </span>
    </div>
  );
}
