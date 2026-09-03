create table public.stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text not null unique,
  stripe_checkout_session_id text unique,
  stripe_price_id text not null,
  status text not null,
  access_enabled boolean not null default false,
  next_billing_at timestamptz,
  cancel_at_period_end boolean not null default false,
  last_stripe_event_created bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stripe_subscriptions_user_id_idx
  on public.stripe_subscriptions (user_id);

create table public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  error_message text,
  event_created bigint not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy "stripe_subscriptions_select_member"
on public.stripe_subscriptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or organization_id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
);

revoke all on table public.stripe_subscriptions from public, anon, authenticated;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant select on table public.stripe_subscriptions to authenticated;

comment on table public.stripe_subscriptions is
  'Estado local de Stripe controlado exclusivamente por webhooks verificados.';
comment on table public.stripe_webhook_events is
  'Registro idempotente de eventos Stripe; no almacena el payload ni datos de pago.';
