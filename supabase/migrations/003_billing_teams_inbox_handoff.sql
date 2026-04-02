-- ============================================================
-- Raptor Bot — Migration 003
-- Billing · Teams · Conversation Inbox · Human Handoff
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- BILLING / SUBSCRIPTIONS
-- ============================================================
alter table workspaces
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_status text default 'inactive',
  add column if not exists message_limit int default 200,
  add column if not exists messages_used_this_month int default 0,
  add column if not exists billing_period_end timestamptz;

-- Reset usage monthly (call via cron or Stripe webhook)
create or replace function reset_monthly_usage()
returns void as $$
begin
  update workspaces set messages_used_this_month = 0
  where billing_period_end < now();
end;
$$ language plpgsql security definer;

-- Increment message usage
create or replace function increment_message_usage(p_workspace_id uuid)
returns boolean as $$
declare
  ws workspaces%rowtype;
begin
  select * into ws from workspaces where id = p_workspace_id;
  if ws.messages_used_this_month >= ws.message_limit and ws.plan = 'free' then
    return false; -- limit reached
  end if;
  update workspaces
    set messages_used_this_month = messages_used_this_month + 1
    where id = p_workspace_id;
  return true;
end;
$$ language plpgsql security definer;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create table if not exists team_members (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  role         text not null default 'member', -- owner | admin | member
  status       text not null default 'pending', -- pending | active
  invite_token text unique default uuid_generate_v4()::text,
  invited_by   uuid references auth.users(id),
  joined_at    timestamptz,
  created_at   timestamptz default now(),
  constraint uniq_workspace_email unique (workspace_id, email)
);

alter table team_members enable row level security;

create policy "Workspace members can view team"
  on team_members for select using (
    workspace_id in (
      select id from workspaces where owner_id = auth.uid()
      union
      select workspace_id from team_members where user_id = auth.uid() and status = 'active'
    )
  );

create policy "Workspace owners/admins can manage team"
  on team_members for all using (
    workspace_id in (
      select id from workspaces where owner_id = auth.uid()
      union
      select workspace_id from team_members
        where user_id = auth.uid() and role in ('admin') and status = 'active'
    )
  );

-- ============================================================
-- CONVERSATION UPDATES (add fields to existing table)
-- ============================================================
alter table conversations
  add column if not exists status text default 'open',  -- open | resolved | escalated
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists visitor_name text,
  add column if not exists visitor_email text,
  add column if not exists tags text[] default '{}',
  add column if not exists handoff_requested_at timestamptz,
  add column if not exists handoff_resolved_at timestamptz,
  add column if not exists message_count int default 0;

-- ============================================================
-- HANDOFF EVENTS
-- ============================================================
create table if not exists handoff_events (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  bot_id          uuid not null references bots(id) on delete cascade,
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  trigger_reason  text,   -- 'user_requested' | 'bot_triggered' | 'keyword'
  status          text default 'pending', -- pending | claimed | resolved
  claimed_by      uuid references auth.users(id),
  claimed_at      timestamptz,
  resolved_at     timestamptz,
  slack_ts        text,   -- Slack message timestamp for threading
  notification_sent_at timestamptz,
  created_at      timestamptz default now()
);

alter table handoff_events enable row level security;

create policy "Workspace members can view handoffs"
  on handoff_events for select using (
    workspace_id in (
      select id from workspaces where owner_id = auth.uid()
      union
      select workspace_id from team_members where user_id = auth.uid() and status = 'active'
    )
  );

create policy "Workspace members can update handoffs"
  on handoff_events for update using (
    workspace_id in (
      select id from workspaces where owner_id = auth.uid()
      union
      select workspace_id from team_members where user_id = auth.uid() and status = 'active'
    )
  );

-- ============================================================
-- BOT: add handoff config fields
-- ============================================================
alter table bots
  add column if not exists handoff_enabled boolean default false,
  add column if not exists handoff_trigger_keywords text[] default '{}',
  add column if not exists handoff_message text default 'Let me connect you with a human agent.',
  add column if not exists slack_webhook_url text,
  add column if not exists notification_email text;

-- ============================================================
-- UPDATE analytics trigger to count message usage
-- ============================================================
create or replace function upsert_analytics(p_bot_id uuid, p_date date)
returns void as $$
begin
  insert into analytics_daily (bot_id, date, total_messages, total_conversations, resolved_count, unique_visitors)
  values (p_bot_id, p_date, 1, 0, 0, 0)
  on conflict (bot_id, date)
  do update set
    total_messages = analytics_daily.total_messages + 1,
    updated_at = now();
exception when others then null;
end;
$$ language plpgsql security definer;
