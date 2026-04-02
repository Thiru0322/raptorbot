'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  botId: string
  botName: string
  botAvatar: string
}

export default function BotTabs({ botId, botName, botAvatar }: Props) {
  const pathname = usePathname()
  const base = `/dashboard/bots/${botId}`

  const tabs = [
    { href: base, label: 'Customize', exact: true },
    { href: `${base}/knowledge`, label: 'Knowledge' },
    { href: `${base}/sandbox`, label: 'Sandbox' },
    { href: `${base}/deploy`, label: 'Deploy' },
    { href: `${base}/analytics`, label: 'Analytics' },
  ]

  return (
    <div className="border-b border-surface-3 bg-surface-1 px-8 pt-6 pb-0">
      {/* Bot header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-400 text-sm transition-colors no-underline">
          ← All Bots
        </Link>
        <span className="text-gray-700">/</span>
        <div className="flex items-center gap-2">
          <span className="text-lg">{botAvatar}</span>
          <span className="text-sm font-medium text-gray-200">{botName}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0">
        {tabs.map(tab => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors no-underline -mb-px ${
                active
                  ? 'border-raptor-400 text-raptor-400 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
