begin;

select plan(3);

select has_table('public', 'stripe_subscriptions', 'Existe la tabla de suscripciones');
select results_eq('SELECT relrowsecurity FROM pg_class WHERE oid = ''public.stripe_subscriptions''::regclass', ARRAY[true], 'RLS estÃ¡ activa en suscripciones');
select policies_are(
  'public',
  'stripe_subscriptions',
  array['stripe_subscriptions_select_member'],
  'Solo existe la polÃ­tica de lectura para miembros'
);

select * from finish();
rollback;

