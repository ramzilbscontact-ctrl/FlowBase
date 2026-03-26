'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type CalendarEvent = {
  id: string
  title: string
  description: string
  start: string
  end: string
  htmlLink: string
}

export default function CalendarPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const res = await fetch('/api/google/calendar/events?upcoming=true')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      return json as { events: CalendarEvent[] }
    },
    retry: false,
  })

  const isNotConnected = (error as Error)?.message === 'google_not_connected'

  function formatEventDate(iso: string) {
    return new Date(iso).toLocaleString('fr-DZ', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Calendrier Google</h1>
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
              Connectez votre compte Google pour voir vos evenements.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Connecter Google
            </Link>
          </div>
        )}

        {data?.events && (
          <div className="divide-y divide-gray-100">
            {data.events.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">
                Aucun evenement a venir.
              </div>
            )}
            {data.events.map((evt) => (
              <div key={evt.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="mt-0.5 rounded bg-green-100 p-1.5">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{evt.title}</span>
                    {evt.htmlLink && (
                      <a
                        href={evt.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{formatEventDate(evt.start)}</p>
                  {evt.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{evt.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
