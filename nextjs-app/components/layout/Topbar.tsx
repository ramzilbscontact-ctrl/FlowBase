'use client'

import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

interface TopbarProps {
  title?: string
}

export default function Topbar({ title }: TopbarProps) {
  const [unread] = useState(0)

  return (
    <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Global search */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-400 text-xs transition-colors"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-400 border border-gray-200">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          R
        </div>
      </div>
    </header>
  )
}
