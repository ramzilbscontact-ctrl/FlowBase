'use client'

import { Bell, LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface TopbarProps {
  title?: string
}

export default function Topbar({ title }: TopbarProps) {
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok || res.redirected) {
        toast.success('Déconnexion réussie')
        router.push('/login')
        router.refresh()
      } else {
        throw new Error('Logout failed')
      }
    } catch {
      toast.error('Erreur lors de la déconnexion')
      setLoggingOut(false)
    }
  }

  const markRead = () => {
    setUnread(0)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          onClick={markRead}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {/* User + Logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={14} className="text-blue-600" />
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Déconnexion"
            aria-label="Se déconnecter"
          >
            {loggingOut ? (
              <svg
                className="w-4 h-4 animate-spin text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              <LogOut size={15} />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
