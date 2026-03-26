'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'

interface CalendarEventModalProps {
  open: boolean
  onClose: () => void
  defaultTitle?: string
  defaultDate?: string // YYYY-MM-DD format
}

export function CalendarEventModal({ open, onClose, defaultTitle = '', defaultDate = '' }: CalendarEventModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    title: defaultTitle,
    date: defaultDate || today,
    time: '09:00',
    description: '',
  })

  const createMut = useMutation({
    mutationFn: async () => {
      const startDateTime = `${form.date}T${form.time}:00`
      // endDateTime = start + 1 hour
      const startMs = new Date(startDateTime).getTime()
      const endDateTime = new Date(startMs + 60 * 60 * 1000).toISOString().slice(0, 19)

      const res = await fetch('/api/google/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          startDateTime,
          endDateTime,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      return json
    },
    onSuccess: () => {
      toast.success('Evenement cree dans Google Calendar')
      onClose()
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
    <Modal open={open} onClose={onClose} title="Ajouter au calendrier">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
          <input
            type="text"
            value={form.title}
            onChange={handleField('title')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Titre de l'evenement"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={handleField('date')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
            <input
              type="time"
              value={form.time}
              onChange={handleField('time')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
          <textarea
            value={form.description}
            onChange={handleField('description')}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Notes supplementaires..."
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
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !form.title || !form.date}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {createMut.isPending ? 'Creation...' : "Creer l'evenement"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
