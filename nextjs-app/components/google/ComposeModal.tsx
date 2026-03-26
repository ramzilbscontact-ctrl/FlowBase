'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'

interface ComposeModalProps {
  open: boolean
  onClose: () => void
  defaultTo?: string
}

export function ComposeModal({ open, onClose, defaultTo = '' }: ComposeModalProps) {
  const [form, setForm] = useState({ to: defaultTo, subject: '', body: '' })

  const sendMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/google/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur envoi')
      return json
    },
    onSuccess: () => {
      toast.success('Email envoye')
      onClose()
      setForm({ to: defaultTo, subject: '', body: '' })
    },
    onError: (err: Error) => {
      if (err.message === 'google_not_connected') {
        toast.error('Connectez votre compte Google dans les Parametres')
      } else {
        toast.error(`Erreur: ${err.message}`)
      }
    },
  })

  function handleField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <Modal open={open} onClose={onClose} title="Envoyer un email">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">A</label>
          <input
            type="email"
            value={form.to}
            onChange={handleField('to')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="destinataire@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objet</label>
          <input
            type="text"
            value={form.subject}
            onChange={handleField('subject')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Objet de l'email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={form.body}
            onChange={handleField('body')}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Votre message..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !form.to || !form.subject || !form.body}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {sendMut.isPending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
