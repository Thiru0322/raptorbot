'use client'
import { useState } from 'react'
import type { Bot } from '@/lib/types'

interface Props { bot: Bot; appUrl: string }

export default function DeployPanel({ bot, appUrl }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const snippet = `<!-- Raptor Bot Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['RaptorBot']=o;w[o]=w[o]||function(){
      (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','bf','${appUrl}/widget.js'));
  bf('init', {
    botId: '${bot.widget_token}',
    position: '${bot.position}',
    primaryColor: '${bot.primary_color}',
  });
</script>`

  const apiExample = `POST ${appUrl}/api/widget/${bot.widget_token}
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "How do I reset my password?" }
  ],
  "sessionId": "session_abc123",
  "userContext": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "plan": "pro"
  }
}`

  const reactSnippet = `// In your _app.tsx or layout.tsx
useEffect(() => {
  const script = document.createElement('script')
  script.src = '${appUrl}/widget.js'
  script.async = true
  script.onload = () => {
    window.bf('init', {
      botId: '${bot.widget_token}',
      primaryColor: '${bot.primary_color}',
    })
  }
  document.head.appendChild(script)
}, [])`

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const isReady = bot.status === 'active' && !!bot.llm_api_key_enc

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="card p-5 flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full shrink-0 ${isReady ? 'bg-green-400' : 'bg-amber-400'}`}
             style={{ boxShadow: `0 0 8px ${isReady ? '#4ade8066' : '#fbbf2466'}` }} />
        <div>
          <p className="text-sm font-medium">{isReady ? 'Ready to deploy' : 'Setup incomplete'}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {isReady
              ? `Active · ${bot.llm_provider} · ${bot.mode} mode · Token: ${bot.widget_token.slice(0, 8)}…`
              : `${bot.status === 'inactive' ? 'Set status to Active' : 'Add your LLM API key'} in Customize`}
          </p>
        </div>
      </div>

      {/* Embed snippet */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="label mb-1">Embed Snippet</h3>
            <p className="text-xs text-gray-600">
              Paste before <code className="bg-surface-3 px-1.5 py-0.5 rounded text-[11px]">&lt;/body&gt;</code> on any page
            </p>
          </div>
          <button onClick={() => copy('snippet', snippet)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              copied === 'snippet'
                ? 'border-green-600/40 bg-green-950/40 text-green-400'
                : 'border-surface-3 text-gray-500 hover:text-gray-300'
            }`}>
            {copied === 'snippet' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="bg-surface-0 border border-surface-3 rounded-xl p-4 text-xs leading-relaxed text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">
          {snippet}
        </pre>
      </div>

      {/* React */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="label mb-1">React / Next.js</h3>
            <p className="text-xs text-gray-600">Add to your app layout or _app.tsx</p>
          </div>
          <button onClick={() => copy('react', reactSnippet)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              copied === 'react'
                ? 'border-green-600/40 bg-green-950/40 text-green-400'
                : 'border-surface-3 text-gray-500 hover:text-gray-300'
            }`}>
            {copied === 'react' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="bg-surface-0 border border-surface-3 rounded-xl p-4 text-xs leading-relaxed text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap">
          {reactSnippet}
        </pre>
      </div>

      {/* REST API */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="label mb-1">REST API</h3>
            <p className="text-xs text-gray-600">Call from your backend or custom frontend — returns Server-Sent Events</p>
          </div>
          <button onClick={() => copy('api', apiExample)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              copied === 'api'
                ? 'border-green-600/40 bg-green-950/40 text-green-400'
                : 'border-surface-3 text-gray-500 hover:text-gray-300'
            }`}>
            {copied === 'api' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="bg-surface-0 border border-surface-3 rounded-xl p-4 text-xs leading-relaxed text-purple-300 font-mono overflow-x-auto whitespace-pre-wrap">
          {apiExample}
        </pre>
      </div>

      {/* Platform guides */}
      <div className="card p-6">
        <h3 className="label mb-4">Platform Guides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'WordPress',   hint: 'Use WPCode → Footer Scripts' },
            { name: 'Webflow',     hint: 'Project Settings → Custom Code → Footer' },
            { name: 'Shopify',     hint: 'theme.liquid before </body>' },
            { name: 'Squarespace', hint: 'Settings → Advanced → Code Injection' },
            { name: 'Wix',         hint: 'Settings → Custom Code → Body - end' },
            { name: 'Framer',      hint: 'Site Settings → Custom Code → End of <body>' },
          ].map(p => (
            <div key={p.name} className="bg-surface-2 rounded-xl p-3.5">
              <p className="text-sm font-medium mb-1">{p.name}</p>
              <p className="text-xs text-gray-600 leading-snug">{p.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
