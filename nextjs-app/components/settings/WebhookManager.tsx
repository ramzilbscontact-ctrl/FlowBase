'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

const AVAILABLE_EVENTS = [
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'deal.created',
  'deal.updated',
  'invoice.created',
  'invoice.paid',
  'task.created',
  'task.updated',
]

interface WebhookRow {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
  last_triggered_at: string | null
  failure_count: number
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  const fetchWebhooks = useCallback(async () => {
    const { data } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false })
    setWebhooks(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  const createWebhook = async () => {
    if (!newUrl.trim() || selectedEvents.length === 0) return
    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Generate a signing secret
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`

      const { error } = await supabase.from('webhooks').insert({
        user_id: user.id,
        url: newUrl.trim(),
        events: selectedEvents,
        secret,
        active: true,
      })

      if (error) {
        console.error('Error creating webhook:', error)
        return
      }

      setNewUrl('')
      setSelectedEvents([])
      setShowForm(false)
      await fetchWebhooks()
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase
      .from('webhooks')
      .update({ active: !currentActive })
      .eq('id', id)
    await fetchWebhooks()
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Supprimer ce webhook ?')) return
    await supabase.from('webhooks').delete().eq('id', id)
    await fetchWebhooks()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-blue-600" />
          Webhooks
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un webhook
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de destination</label>
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://example.com/webhooks/flowbase"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evenements</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map(event => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    selectedEvents.includes(event)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={createWebhook}
              disabled={creating || !newUrl.trim() || selectedEvents.length === 0}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creation...' : 'Creer le webhook'}
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="text-sm text-gray-500 py-4">Chargement...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
          Aucun webhook configure. Ajoutez-en un pour recevoir des notifications en temps reel.
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <div
              key={wh.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => toggleActive(wh.id, wh.active)}
                    className="flex-shrink-0"
                    title={wh.active ? 'Desactiver' : 'Activer'}
                  >
                    {wh.active ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                  <span className="text-sm font-mono text-gray-700 truncate">
                    {wh.url}
                  </span>
                </div>
                <button
                  onClick={() => deleteWebhook(wh.id)}
                  className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {wh.events.map(ev => (
                  <span key={ev} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {ev}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {wh.last_triggered_at && (
                  <span className="flex items-center gap-1">
                    {wh.failure_count === 0 ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    Dernier envoi : {new Date(wh.last_triggered_at).toLocaleString('fr-FR')}
                  </span>
                )}
                {wh.failure_count > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {wh.failure_count} echec(s)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
