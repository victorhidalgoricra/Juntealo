# Product analytics events

`user_activity_events` is the only analytics event store. Operational tables remain authoritative. Event metadata must never contain names, email addresses, phone numbers, identity documents, addresses, bank details, OTPs, message bodies, junta titles, or other free text.

## Event catalog

| Event | Trigger | Source | user_id | junta_id | payment_id | cycle_id | Metadata | Metric |
| ----- | ------- | ------ | ------- | -------- | ---------- | -------- | -------- | ------- |
| `user_registered` | Profile is inserted | DB | Registered user | — | — | — | `acquisition_source`, `referral_code_present`, `registration_channel` | Acquisition, registration cohorts |
| `junta_creation_started` | Creation page starts a user attempt | Frontend | Creator | — | — | — | `entry_point` | Creation conversion, abandonment |
| `junta_created` | Junta insert succeeds | DB | Creator | Yes | — | — | visibility, frequency, capacity, currency, amount, source | Created juntas, creation funnel |
| `junta_invite_created` | Invitation row is inserted | DB | Inviter | Yes | — | — | `invitation_channel` | Invites sent, invites per inviter |
| `junta_invite_link_opened` | Valid token is opened by a unique anonymous browser | Anonymous RPC | — | Yes | — | — | inviter, anonymous UUID, first-touch flag, channel | Unique opens, open rate |
| `junta_invite_registered` | First-touch attribution is bound to a new profile | DB/auth | Registered user | Yes | — | — | inviter, registered user, attribution UUID | Open-to-registration conversion |
| `junta_invite_accepted` | Attributed user actually becomes a junta member | DB | Joined user | Yes | — | — | inviter, registered user, attribution UUID | Invite-to-join conversion |
| `junta_joined` | Non-creator membership first becomes active | DB | Member | Yes | — | — | `join_source` | Registration-to-join, repeat junta, retention |
| `junta_member_left` | Member changes own membership to retired | DB | Member | Yes | — | — | — | Pre-activation abandonment |
| `junta_member_removed` | Creator changes another membership to retired | DB | Removed member | Yes | — | — | `removed_by`, `reason_code` | Pre-activation abandonment |
| `junta_first_member_joined` | First non-creator membership becomes active | DB | First member | Yes | — | — | `participant_count` | Time to first member |
| `junta_filled` | Active/moroso roster first reaches capacity | DB | Last member | Yes | — | — | participant count and capacity | Fill rate, time to fill |
| `junta_activated` | Junta first transitions to active | DB | Creator | Yes | — | — | participant/cycle count, activation source | Activation rate, time to activation |
| `payment_started` | Valid payment form is submitted before upload/persist | Frontend | Payer | Yes | Yes | Yes | `entry_point` | Payment start-to-submit conversion |
| `payment_submitted` | Payment row is submitted or resubmitted | DB | Payer | Yes | Yes | Yes | expected/submitted amount | Payment funnel |
| `payment_confirmed` | Payment first transitions to approved | DB | Payer | Yes | Yes | Yes | amounts, dates, punctuality, receiver UUID | Completion, punctuality, volume, MAS |
| `payment_rejected` | Payment first transitions to rejected | DB | Payer | Yes | Yes | Yes | stable `reason_code` | Payment failure rate |
| `payout_completed` | A delivered payout is inserted/marked delivered | DB | Receiver | Yes | — | Yes | expected/actual amount | Receivers and payout completion |
| `cycle_completed` | The delivered payout closes the round | DB | Receiver | Yes | — | Yes | cycle number and payment totals | Cycle completion |
| `junta_completed` | Junta first transitions to closed | DB | Creator | Yes | — | — | cycles, volume, participants | Junta completion, repeat after completion |
| `junta_cancelled` | Junta first becomes deleted or blocked | DB | Creator | Yes | — | — | lifecycle stage, reason code | Lifecycle abandonment |
| `payment_reminder_sent` | Payment-reminder notification is created | DB/notification | Sender | Yes | — | Current cycle | recipient UUID, channel, sequence | Reminder-to-payment conversion |

The database/RPC catalog also reserves names for future workflow facts (`junta_join_requested`, `junta_activation_started`, `cycle_started`, `payment_pending_validation`, `payment_overdue`, `payout_started`, exploration events, and generic notification events). They are not claimed as implemented until an unambiguous trigger exists.

## Idempotency

Critical facts use a deterministic `event_key` protected by a partial unique index:

- one-time lifecycle: `<event_name>:<junta_id>`
- payment transitions: `<event_name>:<payment_id>`
- membership: `junta_joined:<junta_id>:<user_id>`
- cycles: `cycle_completed:<cycle_id>`
- reminders: `payment_reminder_sent:<notification_id>`
- invite opens: `junta_invite_link_opened:<invite_id>:<anonymous_visitor_id>`
- registration/join: `<event_name>:<attribution_id>`

The common database writer uses `INSERT ... ON CONFLICT DO NOTHING` and catches all analytical write errors. Client attempts may provide an attempt UUID; product operations never depend on the analytics result. Migration 087 provides diagnosis and idempotent repair from operational truth.

## Invite attribution and K-factor

`invitations` represents a technical share link. `junta_invite_attributions` represents a unique invite/browser open and stores no PII. The browser keeps a random UUID plus the first valid attribution in local storage. Opening another invitation is recorded as an open but cannot replace the registration attribution. Signup passes only normalized campaign fields and technical UUIDs through Supabase auth metadata; profile creation binds them server-side. Joining the attributed junta completes the same attribution row.

The V2 viral coefficient is intentionally defined as:

`K = invitation links created / active inviters × attributed new registered users / invitation links created`

This simplifies to attributed new registered users per active inviter. A link can be shared with multiple people, so the second factor may exceed 1. “Invite open rate” is the percentage of created links with at least one unique open; registration and join conversions use unique invite/browser opens as their denominator.

## Backoffice dashboard metric definitions

- **Juntas con movimiento** counts distinct juntas with at least one confirmed payment in the selected period. It is intentionally not called “Juntas activas”; operationally active juntas are those whose current `juntas.estado` is `activa`.
- **Junta funnel** is based on the creation cohort. The denominator is the distinct juntas whose `junta_created` event falls inside the selected period. Every later stage checks those same junta IDs from creation through the dashboard observation time. All total conversion rates therefore use the creation cohort as denominator and cannot exceed 100%. Recent cohorts may not have had enough time to mature; the dashboard exposes how many remain open or in progress.
- **Fill ≤7d** uses juntas in the selected creation cohort whose `juntas.created_at <= now() - interval '7 days'`. Success means `first_filled_at` is not null and is no later than `created_at + interval '7 days'`. Its denominator excludes juntas without seven complete observation days.
- **Activation ≤7d** uses the same mature creation cohort. Success means `activated_at` is not null and is no later than `created_at + interval '7 days'`.
- **Repeat Junta Rate (acumulado)** uses completion as its eligibility milestone because `junta_completed` is an idempotent, reconcilable lifecycle fact. Eligible users are active/non-retired members of a junta completed in the selected period. A repeat requires a `junta_joined` event for a different junta at a timestamp strictly later than completion. The rate is repeat users divided by eligible users; the median time uses only those valid subsequent joins. Simultaneous or pre-completion memberships do not count.
- **Repeat ≤30d** uses a maturity-shifted completion cohort rather than completions from the latest selected period. For a selector of `N` days, current is `[now()-(N+30)d, now()-30d)` and previous is `[now()-(2N+30)d, now()-(N+30)d)`. Both cohorts therefore have `N` days of completions and a full 30-day observation window. Success requires a join to a different junta strictly after completion and no later than `completion_at + interval '30 days'`. The rate is unique users with a valid repeat divided by unique eligible users.
- **Retención de Active Savers** is the share of Active Savers from the previous period who are also Active Savers in the current period. This is period-over-period activity retention, not classic signup-cohort retention.
- **Volumen confirmado** includes approved, confirmed payments denominated in PEN only. Other currencies are neither added nor automatically converted.
- **K-factor** is the internal, explicitly scoped ratio of attributed registrations to active inviters. Invitations are technical links and one link can produce multiple attributed registrations; this metric must not be interpreted as a universal viral coefficient.

There is no defensible single date at which every lifecycle metric became complete: migrations 084–088 introduced tracking, backfills, reconciliation, and invite attribution in stages. Until an environment-specific verified date is configured, the dashboard states that history before Product Analytics may be incomplete instead of presenting an arbitrary date.

Acquisition is first-touch. Priority is: first valid invite; otherwise a valid signup referral; otherwise paid, organic search, direct, or unknown based on normalized UTM/referrer evidence. External referrers that cannot be classified remain `unknown`. Full URLs are never stored.

## Materialized lifecycle timestamps

`juntas.first_member_joined_at`, `first_filled_at`, `activated_at`, and `completed_at` are written only on their first deterministic transition. The event and timestamp are written in the same transaction. They accelerate lifecycle queries but do not replace `juntas.estado`, membership rows, payments, schedules, or payouts as sources of truth.

## Coverage of the 083 exports

| 083 export | New direct facts | Remaining operational validation / limitation |
| ---------- | ---------------- | --------------------------------------------- |
| 01 users | `user_registered`, all core events | Current score remains operational |
| 02 events | Expanded canonical catalog | Legacy event names are normalized |
| 03 juntas | created, first member, filled, activated, completed/cancelled timestamps | Current fill remains membership-derived |
| 04 members | `junta_joined`, left, removed | Turn and current status remain operational |
| 05 payments | submitted, confirmed, rejected | Unpaid obligations remain schedule/member-derived |
| 06 cycles/payouts | `cycle_completed`, `payout_completed` | Expected amount remains schedule-derived |
| 07 invites/referrals | created/opened/registered/accepted linked by attribution UUID | Complete only after migration 088; earlier opens are not invented |
| 08 notifications | `payment_reminder_sent` | Generic created/read/sent states already live in `notifications` |
| 09 activation funnel | Direct lifecycle events | Historical fill/activation are intentionally not guessed |
| 10 retention | Canonical core actions | Cohort definition remains profiles.created_at |
| 11 repeat juntas | `junta_joined`, `junta_completed` | Historical joins are deterministic; historical completion uses payout delivery |
| 12 payment reliability | `payment_confirmed` punctuality snapshot | Denominator/unpaid payments remain operational obligations |
| 13 volume | confirmed amount and receiver UUID | Financial totals must be checked against `payments` |
| 14 virality | unique opens, attributed registrations and joins, explicit K definition | Pre-088 traffic remains incomplete |
| 15 MAS | payment payer plus receiver UUID | Financial truth remains approved payments in active juntas |
| 16 summary | Direct lifecycle timestamps/events | Historical activation and first fill are partial by design |

## Backfill policy

Migration 085 reconstructs only facts with authoritative timestamps: profiles and juntas created, memberships created, first member, payment submission/validation, delivered payouts/cycles, closed juntas, invitation creation, and payment-reminder notification creation. It does not backfill first-fill or activation because current roster and schedule creation timestamps cannot prove the original transition time.

## Resilience and reconciliation

`record_product_event` catches analytical exceptions and returns `NULL`; callers never use its return value to decide an operational result. Consequently a constraint, metadata, permission, or availability problem in `user_activity_events` cannot reject payment confirmation, activation, payout delivery, cycle completion, or junta closure.

`product_analytics_data_quality_issues` diagnoses missing and contradictory financial/lifecycle events. `reconcile_product_analytics()` reads operational truth and idempotently recreates payment, activation, payout, cycle, and junta-completion facts. `product_analytics_invite_quality_issues` and `reconcile_invite_analytics()` provide the same mechanism for the invite funnel. Neither repair function updates operational records.
