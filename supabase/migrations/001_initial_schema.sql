-- ============================================================
-- Raptor Bot — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- WORKSPACES
-- Each user gets one workspace (can expand to teams later)
-- ============================================================
create table workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  slug        text unique not null,
  plan        text not null default 'free', -- free | pro | enterprise
  created_at  timestamptz default now()
);

alter table workspaces enable row level security;

create policy "Users can view own workspace"
  on workspaces for select using (auth.uid() = owner_id);

create policy "Users can update own workspace"
  on workspaces for update using (auth.uid() = owner_id);

-- ============================================================
-- BOTS
-- ============================================================
create table bots (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  name              text not null,
  avatar            text not null default '🤖',
  status            text not null default 'inactive', -- active | inactive

  -- LLM config
  llm_provider      text not null default 'anthropic', -- anthropic | openai | gemini | groq
  llm_api_key_enc   text,           -- AES-encrypted API key
  llm_model         text,           -- optional model override

  -- Bot mode
  mode              text not null default 'hybrid', -- kb | agentic | hybrid

  -- Agentic touchpoints (user fields to fetch from client DB)
  touchpoints       text[] default '{}',

  -- Prompts & knowledge
  system_instructions text not null default 'You are a helpful assistant.',
  knowledge_base    text not null default '',

  -- UI customization
  primary_color     text not null default '#7c6af5',
  bubble_color      text not null default '#1a1a2e',
  text_color        text not null default '#ffffff',
  position          text not null default 'bottom-right', -- bottom-right | bottom-left | top-right | top-left
  welcome_message   text not null default 'Hi! How can I help you today?',

  -- Widget
  widget_token      text unique not null default uuid_generate_v4()::text,

  -- Allowed origins for CORS (empty = all)
  allowed_origins   text[] default '{}',

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table bots enable row level security;

create policy "Workspace owners can CRUD bots"
  on bots for all using (
    workspace_id in (
      select id from workspaces where owner_id = auth.uid()
    )
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table conversations (
  id            uuid primary key default uuid_generate_v4(),
  bot_id        uuid not null references bots(id) on delete cascade,
  session_id    text not null,           -- client-generated session ID
  visitor_id    text,                    -- optional visitor identifier
  resolved      boolean default false,
  started_at    timestamptz default now(),
  last_message_at timestamptz default now()
);

alter table conversations enable row level security;

create policy "Workspace owners can view conversations"
  on conversations for select using (
    bot_id in (
      select b.id from bots b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ============================================================
-- MESSAGES
-- ============================================================
create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  bot_id          uuid not null references bots(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  tokens_used     int default 0,
  created_at      timestamptz default now()
);

alter table messages enable row level security;

create policy "Workspace owners can view messages"
  on messages for select using (
    bot_id in (
      select b.id from bots b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ============================================================
-- ANALYTICS (daily aggregates — updated by Edge Function)
-- ============================================================
create table analytics_daily (
  id            uuid primary key default uuid_generate_v4(),
  bot_id        uuid not null references bots(id) on delete cascade,
  date          date not null,
  total_messages int default 0,
  total_conversations int default 0,
  resolved_count int default 0,
  unique_visitors int default 0,
  constraint uniq_bot_date unique (bot_id, date)
);

alter table analytics_daily enable row level security;

create policy "Workspace owners can view analytics"
  on analytics_daily for select using (
    bot_id in (
      select b.id from bots b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ============================================================
-- AUTO-UPDATE updated_at on bots
-- ============================================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bots_updated_at
  before update on bots
  for each row execute procedure handle_updated_at();

-- ============================================================
-- AUTO-CREATE WORKSPACE on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  ws_slug text;
begin
  ws_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || substr(new.id::text, 1, 6);

  insert into workspaces (name, owner_id, slug)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.id,
    ws_slug
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
