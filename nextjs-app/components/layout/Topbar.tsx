'use client'

import { Bell, LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TopbarProps {
  title?: string
}

export default function Topbar({ title }: TopbarProps) {
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const markRead = () => {
    setUnread(0)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notifs */}
        <button
          onClick={markRead}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={14} className="text-blue-600" />
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
