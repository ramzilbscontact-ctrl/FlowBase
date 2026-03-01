import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Clock } from 'lucide-react'
import { calendarAPI } from '../api/calendar'
import Modal from '../components/shared/Modal'

export default function CalendarPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ title: '', start: '', end: '', location: '' })

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn:  () => calendarAPI.getEvents().then(r => r.data),
  })

  const { data: upcoming } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn:  () => calendarAPI.getUpcoming().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => calendarAPI.createEvent(d),
    onSuccess:  () => { qc.invalidateQueries(['events']); setModal(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => calendarAPI.deleteEvent(id),
    onSuccess:  () => qc.invalidateQueries(['events']),
  })

  const allEvents  = Array.isArray(events)   ? events   : events?.results   || []
  const upcomingEv = Array.isArray(upcoming) ? upcoming : upcoming?.results  || []

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Nouvel événement</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary-500" /> À venir
          </h3>
          {upcomingEv.length === 0 && <p className="text-sm text-gray-400">Aucun événement à venir</p>}
          <ul className="space-y-3">
            {upcomingEv.map(ev => (
              <li key={ev.id} className="text-sm border-l-2 border-primary-400 pl-3">
                <p className="font-medium text-gray-800">{ev.title}</p>
                <p className="text-gray-400 text-xs">{ev.start}</p>
                {ev.location && <p className="text-gray-400 text-xs">{ev.location}</p>}
              </li>
            ))}
          </ul>
        </div>

        {/* All events */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tous les événements</h3>
          {isLoading && <p className="text-sm text-gray-400">Chargement…</p>}
          <ul className="space-y-2">
            {allEvents.map(ev => (
              <li key={ev.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ev.title}</p>
                  <p className="text-xs text-gray-400">{ev.start} {ev.end ? `→ ${ev.end}` : ''}</p>
                </div>
                <button
                  onClick={() => deleteMut.mutate(ev.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >Supprimer</button>
              </li>
            ))}
            {allEvents.length === 0 && !isLoading && <p className="text-sm text-gray-400">Aucun événement</p>}
          </ul>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvel événement">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
              <input type="datetime-local" className="input" value={form.start} onChange={e => setForm({...form, start: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
              <input type="datetime-local" className="input" value={form.end} onChange={e => setForm({...form, end: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>Créer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
