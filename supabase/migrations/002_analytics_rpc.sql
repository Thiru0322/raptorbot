-- Run this in Supabase SQL Editor after the initial schema migration

-- Upsert analytics counts (called from widget API after each message)
create or replace function upsert_analytics(p_bot_id uuid, p_date date)
returns void as $$
begin
  insert into analytics_daily (bot_id, date, total_messages, total_conversations, resolved_count, unique_visitors)
  values (p_bot_id, p_date, 1, 0, 0, 0)
  on conflict (bot_id, date)
  do update set
    total_messages = analytics_daily.total_messages + 1,
    updated_at = now();
exception when others then
  -- Silently ignore errors in analytics — never block the chat
  null;
end;
$$ language plpgsql security definer;

-- Add updated_at to analytics_daily if not present
alter table analytics_daily add column if not exists updated_at timestamptz default now();
