'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Key, Copy, Trash2, Plus, Check, Eye, EyeOff } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: Record<string, string>
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const supabase = createClient()

  const fetchKeys = useCallback(async () => {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    setKeys(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const generateKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)

    try {
      // Generate a random API key
      const rawKey = `fb_live_${crypto.randomUUID().replace(/-/g, '')}`
      const keyPrefix = rawKey.slice(0, 16)

      // Hash the key with SHA-256
      const encoder = new TextEncoder()
      const data = encoder.encode(rawKey)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('api_keys').insert({
        user_id: user.id,
        name: newKeyName.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
      })

      if (error) {
        console.error('Error creating API key:', error)
        return
      }

      setNewlyCreatedKey(rawKey)
      setNewKeyName('')
      setShowForm(false)
      await fetchKeys()
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: string) => {
    if (!confirm('Revoquer cette cle API ? Cette action est irreversible.')) return

    await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)

    await fetchKeys()
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Key className="h-5 w-5 text-violet-600" />
          Cles API
        </h3>
        <button
          onClick={() => { setShowForm(!showForm); setNewlyCreatedKey(null) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Generer une cle
        </button>
      </div>

      {/* New key creation banner */}
      {newlyCreatedKey && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800">
            Cle API creee avec succes ! Copiez-la maintenant, elle ne sera plus affichee.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white border border-green-300 rounded px-3 py-2 font-mono text-green-900 select-all">
              {revealedKey === newlyCreatedKey ? newlyCreatedKey : `${newlyCreatedKey.slice(0, 16)}${'*'.repeat(32)}`}
            </code>
            <button
              onClick={() => setRevealedKey(revealedKey === newlyCreatedKey ? null : newlyCreatedKey)}
              className="p-2 rounded-md hover:bg-green-100 text-green-700"
              title={revealedKey === newlyCreatedKey ? 'Masquer' : 'Afficher'}
            >
              {revealedKey === newlyCreatedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(newlyCreatedKey)}
              className="p-2 rounded-md hover:bg-green-100 text-green-700"
              title="Copier"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Create key form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Nom de la cle
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="Ex: Integration n8n, App mobile..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
            <button
              onClick={generateKey}
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Generation...' : 'Creer'}
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      {loading ? (
        <div className="text-sm text-gray-500 py-4">Chargement...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
          Aucune cle API. Generez-en une pour utiliser l&apos;API REST.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-gray-900">{key.name}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {key.key_prefix}{'*'.repeat(24)}
                </p>
                <p className="text-xs text-gray-400">
                  Cree le {new Date(key.created_at).toLocaleDateString('fr-FR')}
                  {key.last_used_at && ` · Derniere utilisation ${new Date(key.last_used_at).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                className="p-2 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                title="Revoquer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
