'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@/lib/types'

interface Props {
  workspace: Workspace | null
  userEmail: string
}

const NAV = [
  { href: '/dashboard', label: 'All Bots', icon: '◈' },
]

export default function Sidebar({ workspace, userEmail }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[220px] bg-surface-1 border-r border-surface-3 flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
               style={{ background: 'linear-gradient(135deg,#7c6af5,#5eead4)' }}>
            🦖
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">Raptor Bot</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="px-2.5 py-3 flex-1">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors no-underline ${
                active
                  ? 'bg-surface-3 text-raptor-400 font-medium'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-surface-2'
              }`}>
              <span className="text-[13px]">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 pb-4 border-t border-surface-3 pt-3">
        <div className="px-3 py-2 mb-1">
          <p className="text-[12px] font-medium text-gray-400 truncate">{userEmail}</p>
          <p className="text-[11px] text-gray-600 capitalize mt-0.5">{workspace?.plan ?? 'free'} plan</p>
        </div>
        <button onClick={signOut}
          className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-400 hover:bg-surface-2 rounded-lg transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  )
}
