-- 0011_email_cron.sql
-- Retries the email outbox every five minutes (Tech.md §9).
-- Needs two Vault secrets per environment, created once in the dashboard
-- (Project Settings → Vault) or with vault.create_secret():
--   app_url      the deployed origin, for example https://workboard.olifant.digital
--   cron_secret  the same value as CRON_SECRET in the Vercel project
-- Not exercised by the local test harness (no pg_cron there).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'dispatch-emails',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url')
               || '/api/cron/dispatch-emails',
    headers := jsonb_build_object(
                 'Authorization',
                 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
                 'Content-Type', 'application/json'),
    body    := '{}'::jsonb
  );
  $$
);
