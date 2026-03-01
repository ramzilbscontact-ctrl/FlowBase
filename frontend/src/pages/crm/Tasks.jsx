import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, Circle, Trash2 } from 'lucide-react'
import { crmAPI } from '../../api/crm'
import Modal from '../../components/shared/Modal'

export default function Tasks() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ title: '', due_date: '', priority: 'medium' })

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn:  () => crmAPI.getTasks().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => crmAPI.createTask(d),
    onSuccess:  () => { qc.invalidateQueries(['tasks']); setModal(false) },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, done }) => crmAPI.updateTask(id, { is_done: done }),
    onSuccess:  () => qc.invalidateQueries(['tasks']),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => crmAPI.deleteTask(id),
    onSuccess:  () => qc.invalidateQueries(['tasks']),
  })

  const tasks = Array.isArray(data) ? data : data?.results || []
  const pending   = tasks.filter(t => !t.is_done)
  const completed = tasks.filter(t => t.is_done)

  const priorityBadge = (p) => ({
    high:   'badge-red',
    medium: 'badge-yellow',
    low:    'badge-gray',
  }[p] || 'badge-gray')

  if (isLoading) return <div className="text-center text-gray-400 py-12">Chargement…</div>

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Nouvelle tâche
        </button>
      </div>

      <div className="card divide-y divide-gray-100">
        {pending.length === 0 && completed.length === 0 && (
          <p className="p-6 text-center text-gray-400 text-sm">Aucune tâche</p>
        )}
        {pending.map(task => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
            <button onClick={() => toggleMut.mutate({ id: task.id, done: true })}>
              <Circle size={18} className="text-gray-300 hover:text-primary-500 transition" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
              {task.due_date && <p className="text-xs text-gray-400">Échéance : {task.due_date}</p>}
            </div>
            <span className={priorityBadge(task.priority)}>{task.priority}</span>
            <button onClick={() => deleteMut.mutate(task.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {completed.map(task => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
            <button onClick={() => toggleMut.mutate({ id: task.id, done: false })}>
              <CheckCircle size={18} className="text-green-500" />
            </button>
            <p className="text-sm text-gray-500 line-through flex-1">{task.title}</p>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle tâche">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
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
