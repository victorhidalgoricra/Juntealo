export type TipoJunta = 'normal' | 'incentivos';
export type Frecuencia = 'Semanal' | 'Quincenal' | 'Mensual';

export function calcSimulador(cuota: number, personas: number, frecuencia: Frecuencia) {
  const bolsa = personas * cuota;
  const duracionLabel = `${personas} ${frecuencia === 'Semanal' ? 'semanas' : frecuencia === 'Quincenal' ? 'quincenas' : 'meses'}`;
  const periodoLabel = frecuencia === 'Semanal' ? 'semana' : frecuencia === 'Quincenal' ? 'quincena' : 'mes';
  const cuotaMax = Math.round(cuota * 1.2);
  const cuotaMin = Math.round(cuota * 0.8);

  // Redistributción lineal simétrica: suma de turnosCuota = personas × cuota exactamente.
  // Turno i=0 paga +20%, turno i=N-1 paga -20%, el central queda neutro.
  const turnosCuota = Array.from({ length: personas }, (_, i) => {
    if (personas === 1) return cuota;
    const delta = Math.round(cuota * 0.2 * (1 - (2 * i) / (personas - 1)));
    return cuota + delta;
  });

  return { bolsa, duracionLabel, periodoLabel, cuotaMax, cuotaMin, turnosCuota };
}
