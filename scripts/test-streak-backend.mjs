/** Usage: node scripts/test-streak-backend.mjs /path/to/@electric-sql/pglite/dist/index.js */
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
process.on('uncaughtException', error => { console.error(error.message, error.where ?? '', error.actual ?? '', error.expected ?? ''); process.exit(1); });
const { PGlite } = await import(process.argv[2] ?? '@electric-sql/pglite');
const db = new PGlite();
// Minimal pre-existing schema: runs the actual migration and its triggers in PostgreSQL.
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table profiles(id uuid primary key, racha_actual integer default 0, record_racha integer default 0, estado_racha text default 'activa');
create table juntas(id uuid primary key, admin_id uuid, estado text, bloqueada boolean default false, deleted_at timestamptz);
create table junta_members(id uuid primary key, profile_id uuid, junta_id uuid, estado text, orden_turno integer, racha_semanas integer default 0, racha_record integer default 0);
create table payment_schedules(id uuid primary key, junta_id uuid, cuota_numero integer, fecha_vencimiento date, estado text default 'pendiente');
create table payments(id uuid primary key, junta_id uuid, profile_id uuid, schedule_id uuid, payment_status text, estado text,
submitted_at timestamptz, pagado_en timestamptz, validated_at timestamptz, created_at timestamptz default now(), internal_note text, rejection_reason text);
create table racha_hitos(profile_id uuid, junta_id uuid, hito_semanas integer, unique(profile_id,junta_id,hito_semanas));
alter table racha_hitos enable row level security;
create policy "Users can insert their own racha hitos" on racha_hitos for insert with check (profile_id=auth.uid());
create table claimed_missions(profile_id uuid, mission_id text, bonus_points integer, week_key text);
`);
await db.exec(await readFile(new URL('../supabase/migrations/093_authoritative_installment_streaks.sql', import.meta.url), 'utf8'));
const u = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const j = '00000000-0000-0000-0000-000000000010';
const sid = i => `00000000-0000-0000-0000-${String(100+i).padStart(12,'0')}`;
const pid = i => `00000000-0000-0000-0000-${String(200+i).padStart(12,'0')}`;
const value = async sql => (await db.query(sql)).rows[0];
const snapshot = async () => (await value(`select result from junta_streaks where profile_id='${u}'`)).result;
await db.exec(`insert into profiles(id) values('${u}'),('${other}'); insert into juntas(id,admin_id,estado) values('${j}','${u}','activa');`);
for (let i=1; i<=4; i++) {
  await db.exec(`insert into payment_schedules(id,junta_id,cuota_numero,fecha_vencimiento) values('${sid(i)}','${j}',${i},'2024-0${i}-01');
  insert into payments(id,junta_id,profile_id,schedule_id,payment_status,submitted_at) values('${pid(i)}','${j}','${u}','${sid(i)}','${i===4?'submitted':'approved'}','2024-0${i}-02T04:59:59Z');`);
}
assert.equal((await snapshot()).estado,'en_revision');
assert.equal((await snapshot()).semanasActual,3);
assert.equal((await value('select count(*)::integer as n from streak_rewards')).n,0);
await db.exec(`update payments set payment_status='approved', validated_at=now() where id='${pid(4)}';`);
assert.equal((await snapshot()).semanasActual,4);
assert.equal((await value('select count(*)::integer as n from streak_rewards')).n,1);
assert.equal((await value('select count(*)::integer as n from racha_hitos')).n,1);
await db.exec(`select refresh_all_streaks(); select refresh_all_streaks();`);
assert.equal((await value('select count(*)::integer as n from streak_rewards')).n,1);
assert.equal((await value('select count(*)::integer as n from racha_hitos')).n,1);
assert.equal((await value(`select racha_actual from profiles where id='${u}'`)).racha_actual,4);
assert.equal((await value(`select current_junta_score('${u}') as score`)).score,23);
await db.exec(`update payments set payment_status='rejected' where id='${pid(4)}';`);
assert.equal((await snapshot()).estado,'rota');
assert.equal((await snapshot()).semanasActual,0);
assert.equal((await snapshot()).recordPersonal,3);
assert.equal((await value('select count(*)::integer as n from streak_rewards')).n,1);
await db.exec(`update payments set payment_status='approved', submitted_at='2024-04-02T05:00:00Z' where id='${pid(4)}';`);
assert.equal((await snapshot()).semanasActual,0);
assert.equal((await snapshot()).tieneDeuda,false);
// Receiver turn is ignored; adding members also refreshes the cached result.
await db.exec(`insert into junta_members(id,profile_id,junta_id,estado,orden_turno) values
('${sid(20)}','${other}','${j}','activo',1),('${sid(21)}','${u}','${j}','activo',2);`);
assert.equal((await snapshot()).semanasActual,2);
assert.equal((await value(`select racha_semanas from junta_members where profile_id='${u}'`)).racha_semanas,2);
// Removing membership/archiving removes an obsolete active snapshot, while the earned reward remains.
await db.exec(`update juntas set bloqueada=true where id='${j}';`);
assert.equal((await value('select count(*)::integer as n from junta_streaks')).n,0);
await db.exec(`update juntas set bloqueada=false where id='${j}';`);
// Read-through RPC refreshes and does not accept another user's ID.
await db.exec(`set request.jwt.claim.sub='${u}'; set role authenticated;`);
assert.equal((await value('select get_my_streaks() as data')).data.rewardPoints,6);
await assert.rejects(db.exec(`insert into streak_rewards(profile_id) values('${other}')`), /permission denied/);
await assert.rejects(db.exec(`update junta_streaks set result='{}'`), /permission denied/);
await assert.rejects(db.exec(`select refresh_profile_streaks('${other}')`), /permission denied/);
await db.exec(`set request.jwt.claim.sub='${other}';`);
assert.equal((await value('select count(*)::integer as n from streak_rewards')).n,0);
await db.exec('reset role;');
await assert.rejects(db.exec(`insert into claimed_missions values('${u}','on_time_streak_4_rounds',6,'2024-01-01')`), /automáticamente/);
// Explicit clock checks deadline transitions even without a payment event.
const futureJunta = '00000000-0000-0000-0000-000000000099';
await db.exec(`insert into juntas(id,admin_id,estado) values('${futureJunta}','${other}','activa');
insert into payment_schedules(id,junta_id,cuota_numero,fecha_vencimiento) values('${sid(90)}','${futureJunta}',1,'2024-09-01');`);
const before = (await value(`select compute_installment_streak('${other}','${futureJunta}','2024-09-02T04:59:59Z') as r`)).r;
const after = (await value(`select compute_installment_streak('${other}','${futureJunta}','2024-09-02T05:00:00Z') as r`)).r;
assert.equal(before.estado,'en_riesgo');
assert.equal(after.estado,'rota');
assert.equal(after.cuotaInterrumpida,1);
// Simulate an obsolete persisted snapshot; authenticated reads repair it from evidence.
await db.exec(`update junta_streaks set result='{}' where profile_id='${other}';
set request.jwt.claim.sub='${other}'; set role authenticated;`);
assert.equal((await value('select get_my_streaks() as data')).data.streaks[0].estado,'rota');
await db.exec('reset role;');
await db.close();
console.log('Backend streak contract passed: migration, triggers, approvals/rejections, dates, receiver, idempotency, RPC and RLS.');
