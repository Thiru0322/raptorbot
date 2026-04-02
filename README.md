# 🦖 Raptor Bot

Deploy intelligent AI chatbots on any website in 60 seconds.
Multi-LLM support · Knowledge base · Agentic mode · White-label embed widget.

---

## What it does

Raptor Bot is a SaaS chatbot platform. You sign up, create a bot, connect your LLM API key (Anthropic, OpenAI, Gemini, or Groq), write a knowledge base, and get a one-line embed snippet to paste on any website.

**Key features:**
- **Multi-LLM** — Anthropic Claude, OpenAI GPT, Google Gemini, Groq (plug in your own key)
- **Two bot modes** — KB-only (deterministic FAQ answers) or Agentic (dynamic reasoning with user context)
- **Hybrid mode** — KB for FAQs, agentic for user-specific queries (recommended)
- **Sandbox** — test your bot in real-time before going live
- **White-label widget** — embeds as a floating chat bubble on any site, any framework
- **API** — REST + streaming SSE endpoint for custom integrations
- **Analytics** — message volume, resolution rate, top questions

---

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database + Auth**: Supabase (Postgres + Row Level Security)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS
- **API key security**: AES-256-GCM encryption at rest

---

## Setup Guide

### 1. Clone and install

```bash
git clone https://github.com/your-org/raptorbot
cd raptorbot
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Also copy the **service_role key** (keep this secret — server-side only)

### 3. Run the database migrations

In Supabase Dashboard → SQL Editor, run these files in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_analytics_rpc.sql`

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=your-32-byte-hex-key
```

Generate an encryption key:
```bash
openssl rand -hex 32
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to login.

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create raptorbot --public --push
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your GitHub repo
3. Add all environment variables from `.env.local`
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g. `https://raptorbot.vercel.app`)

### 3. Configure Supabase Auth redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

### 4. Deploy

Vercel auto-deploys on every push to `main`. Your app is live.

---

## How the embed widget works

Each bot has a unique `widget_token` (UUID). When you embed the snippet:

```html
<script>
  (function(w,d,s,o,f,js,fjs){
    w['RaptorBot']=o; w[o]=w[o]||function(){ (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s); fjs=d.getElementsByTagName(s)[0];
    js.id=o; js.src=f; js.async=1; fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','bf','https://your-app.vercel.app/widget.js'));
  bf('init', {
    botId: 'YOUR_WIDGET_TOKEN',
    position: 'bottom-right',
    primaryColor: '#7c6af5',
  });
</script>
```

The widget:
1. Loads `/widget.js` from your Vercel deployment (pure JS, no framework)
2. Fetches bot display config from `/api/widget/[token]/config` (name, avatar, colors)
3. Streams chat via SSE to `/api/widget/[token]` — your LLM API key is decrypted server-side and never exposed to the client

### Passing user context (Agentic mode)

If your bot is in `agentic` or `hybrid` mode, pass user data at init:

```javascript
bf('init', {
  botId: 'YOUR_WIDGET_TOKEN',
  userContext: {
    name: currentUser.name,
    email: currentUser.email,
    plan: currentUser.plan,
    last_login: currentUser.lastLoginAt,
  }
})
```

This context is injected into the system prompt before each conversation.

---

## REST API

```
POST /api/widget/:token
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "Hello" }],
  "sessionId": "session_xyz",
  "userContext": { "name": "Jane", "plan": "pro" }
}
```

Returns: `text/event-stream` (Server-Sent Events)

Each event: `data: {"text": "chunk"}\n\n`
End: `data: [DONE]\n\n`

---

## Security

- **API keys**: AES-256-GCM encrypted before storing in Supabase. The plaintext key only exists in server memory during request processing.
- **Row Level Security**: All Supabase tables have RLS policies — users can only access their own workspace's data.
- **Widget token**: A separate token (not the bot ID) is used for public widget access — limits exposure.
- **CORS**: Widget API allows all origins by default. Set `allowed_origins` on a bot to restrict to specific domains.
- **Service role key**: Only used server-side in API routes. Never exposed to client.

---

## Project Structure

```
raptorbot/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx          # Login + signup page
│   │   └── callback/route.ts       # Supabase OAuth callback
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard shell with sidebar
│   │   ├── page.tsx                # Bot list
│   │   ├── bots/new/page.tsx       # Create bot
│   │   └── bots/[botId]/
│   │       ├── layout.tsx          # Bot tabs shell
│   │       ├── page.tsx            # Customize tab
│   │       ├── knowledge/page.tsx  # Knowledge base tab
│   │       ├── sandbox/page.tsx    # Test chat tab
│   │       ├── deploy/page.tsx     # Embed snippet tab
│   │       └── analytics/page.tsx  # Analytics tab
│   ├── api/
│   │   ├── bots/[botId]/route.ts   # PATCH/DELETE bot (auth required)
│   │   └── widget/[botId]/
│   │       ├── route.ts            # Chat endpoint (public, SSE)
│   │       └── config/route.ts     # Display config (public)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── BotTabs.tsx
│   └── bot/
│       ├── CustomizeForm.tsx
│       ├── KnowledgeForm.tsx
│       ├── SandboxChat.tsx
│       ├── DeployPanel.tsx
│       └── AnalyticsView.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client
│   │   └── middleware.ts           # Session refresh middleware
│   ├── crypto.ts                   # AES-256 encryption for API keys
│   ├── llm.ts                      # LLM router (Anthropic/OpenAI/Gemini/Groq)
│   └── types.ts                    # TypeScript types
├── public/
│   └── widget.js                   # Embeddable chatbot widget (vanilla JS)
├── supabase/migrations/
│   ├── 001_initial_schema.sql
│   └── 002_analytics_rpc.sql
├── middleware.ts                    # Auth middleware (protects /dashboard)
├── .env.local.example
└── README.md
```

---

## What to build next

- [ ] **Team workspaces** — invite teammates, role-based access
- [ ] **File upload** — attach PDFs/docs to knowledge base
- [ ] **Billing** — Stripe integration, usage-based limits per plan
- [ ] **Conversation inbox** — view and replay all chat sessions
- [ ] **Human handoff** — escalate to live agent via Slack/email trigger
- [ ] **Custom domain** — white-label the widget CDN URL
- [ ] **A/B testing** — test two instruction sets against each other
- [ ] **Webhooks** — notify your backend on conversation events

---

## License

MIT
