-- Periodo de gracia ante un pago fallido: guarda desde cuándo la suscripción está
-- en past_due. Solo lo escriben los webhooks verificados (el rol authenticated
-- únicamente puede leer la tabla).
alter table public.stripe_subscriptions
  add column past_due_since timestamptz;

comment on column public.stripe_subscriptions.past_due_since is
  'Momento en que Stripe marcó la suscripción como past_due; null si está al corriente. El acceso se mantiene mientras dure el periodo de gracia configurado.';
