begin;

select plan(3);

select has_table('public', 'stripe_subscriptions', 'Existe la tabla de suscripciones');
select row_security_active('public.stripe_subscriptions', 'RLS está activa en suscripciones');
select policies_are(
  'public',
  'stripe_subscriptions',
  array['stripe_subscriptions_select_member'],
  'Solo existe la política de lectura para miembros'
);

select * from finish();
rollback;
