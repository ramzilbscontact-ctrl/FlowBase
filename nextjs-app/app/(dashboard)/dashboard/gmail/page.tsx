'use client'

import { useQuery } from '@tanstack/react-query'
import { Mail, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type GmailMessage = {
  id: string
  threadId: string
  from: string
  subject: string
  date: string
  snippet: string
}

export default function GmailPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['gmail-messages'],
    queryFn: async () => {
      const res = await fetch('/api/google/gmail/messages?limit=20')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      return json as { messages: GmailMessage[] }
    },
    retry: false,
  })

  const isNotConnected = (error as Error)?.message === 'google_not_connected'

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
          <Mail className="w-5 h-5 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Gmail</h1>
      </div>

      {/* Content card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && (
          <div className="py-12 text-center text-sm text-gray-400">Chargement...</div>
        )}

        {isNotConnected && (
          <div className="py-12 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              Connectez votre compte Google pour voir vos emails.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Connecter Google
            </Link>
          </div>
        )}

        {data?.messages && (
          <div className="divide-y divide-gray-100">
            {data.messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{msg.from}</span>
                    <span className="text-xs text-gray-400 shrink-0">{new Date(msg.date).toLocaleDateString('fr-DZ')}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{msg.subject}</p>
                  <p className="text-xs text-gray-400 truncate">{msg.snippet}</p>
                </div>
              </div>
            ))}
            {data.messages.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">Aucun email dans la boite de reception.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
