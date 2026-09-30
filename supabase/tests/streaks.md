# Rachas por cuotas

La migración `093_authoritative_installment_streaks.sql` instala el cálculo,
la persistencia y los permisos. Aplicar antes de publicar el frontend.

- `junta_streaks`: resultado por usuario y junta, con fecha de actualización.
- `profiles.racha_actual`, `record_racha`, `estado_racha` y
  `junta_members.racha_semanas`, `racha_record`: campos de compatibilidad actualizados
  por el servidor. Los contadores son cuotas, aunque conservan nombres históricos.
- `racha_hitos`: hitos de 4/8/12 por junta. Ya no permite altas desde el cliente.
- `streak_rewards`: recompensa permanente de 6 puntos, una sola vez por usuario.
  Los hitos de 8/12 no conceden puntos adicionales. Un cambio posterior de racha
  no retira una recompensa ya otorgada. Los reclamos semanales antiguos de esta
  misión dejan de sumar en el dashboard.

Los triggers recalculan al cambiar pagos, cronogramas, integrantes y estados de
junta. `get_my_streaks()` obtiene la identidad desde `auth.uid()`, refresca y
persiste antes de responder. La pantalla consulta al entrar, al recuperar foco,
al cambiar los datos y cada minuto. Los errores se muestran; no se presenta una
racha local como si hubiese sido confirmada por el servidor.

Si el host ofrece `pg_cron`, la migración lo habilita y registra
`refresh-installment-streaks` cada 15 minutos. En un host sin esa extensión,
programar `select public.refresh_all_streaks()` con un servicio de confianza;
la función solo es ejecutable por el propietario y `service_role`. Sin ese
programador, las lecturas siguen actualizando vencimientos, pero la caché puede
quedar desactualizada cuando no hay actividad. El score calcula la racha desde
los pagos, sin depender de la antigüedad de esa caché.

Reglas compartidas con `lib/racha.ts`: fecha completa en America/Lima; solo
pagos aprobados registrados antes del cierre; revisión puntual conserva la
racha confirmada pendiente de resolución, sin sumar cuotas ni premios; cuota
vencida incumplida corta; recepción omite; una cuota pendiente anterior impide
adelantar hitos con pagos de cuotas posteriores. El dashboard y la constancia
del score usan la mayor racha confirmada de las juntas activas o cerradas
vigentes; no suman rachas de distintas juntas.

## Verificación reproducible

```sh
npm test
npm run check
npm install --prefix /tmp/juntaz-streak-validation @electric-sql/pglite
node scripts/test-streak-backend.mjs /tmp/juntaz-streak-validation/node_modules/@electric-sql/pglite/dist/index.js
```

El contrato ejecuta la migración real en PostgreSQL temporal con el esquema
mínimo previo. Comprueba aprobación/rechazo, límites horarios, turnos de
recepción, persistencia en perfiles/integrantes, duplicados, lectura autenticada,
RLS y bloqueo de reclamos manuales. No reemplaza la verificación de despliegue
contra todas las migraciones y datos del proyecto remoto.

Después de aplicar en Supabase, comprobar que la versión 093 está registrada,
que existe la tarea de cron y que `get_my_streaks()` devuelve los resultados del
usuario autenticado. Nunca invocar esta RPC con una identidad arbitraria en producción.
