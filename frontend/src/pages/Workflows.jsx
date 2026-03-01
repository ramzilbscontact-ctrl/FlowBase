import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Play } from 'lucide-react'
import api from '../api/axios'
import Modal from '../components/shared/Modal'

const workflowsAPI = {
  list:    () => api.get('/api/workflows/'),
  create:  (d) => api.post('/api/workflows/', d),
  trigger: (id) => api.post(`/api/workflows/${id}/trigger/`),
}

export default function Workflows() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ name: '', description: '', trigger: 'manual' })

  const { data, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: () => workflowsAPI.list().then(r => r.data) })
  const createMut  = useMutation({ mutationFn: (d) => workflowsAPI.create(d),     onSuccess: () => { qc.invalidateQueries(['workflows']); setModal(false) } })
  const triggerMut = useMutation({ mutationFn: (id) => workflowsAPI.trigger(id),  onSuccess: () => qc.invalidateQueries(['workflows']) })

  const workflows = Array.isArray(data) ? data : data?.results || []

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Nouveau workflow</button>
      </div>

      {isLoading && <p className="text-center text-gray-400">Chargement…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map(wf => (
          <div key={wf.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-gray-800">{wf.name}</h4>
              <span className={`badge ${wf.is_active ? 'badge-green' : 'badge-gray'}`}>
                {wf.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            {wf.description && <p className="text-sm text-gray-500 mb-4">{wf.description}</p>}
            <button
              onClick={() => triggerMut.mutate(wf.id)}
              className="btn-secondary text-xs w-full justify-center"
              disabled={triggerMut.isPending}
            >
              <Play size={12} /> Déclencher
            </button>
          </div>
        ))}
        {workflows.length === 0 && !isLoading && (
          <div className="col-span-3 text-center py-12 text-gray-400 text-sm">
            Aucun workflow configuré
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau workflow">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
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
