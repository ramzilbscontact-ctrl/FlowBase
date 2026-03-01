import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Check, X } from 'lucide-react'
import { rhAPI } from '../../api/rh'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

const statusBadge = (s) => ({
  pending:  <span className="badge-yellow">En attente</span>,
  approved: <span className="badge-green">Approuvé</span>,
  rejected: <span className="badge-red">Refusé</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function Leaves() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ employee: '', start_date: '', end_date: '', reason: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn:  () => rhAPI.getLeaves().then(r => r.data),
  })

  const createMut = useMutation({ mutationFn: (d) => rhAPI.createLeave(d), onSuccess: () => { qc.invalidateQueries(['leaves']); setModal(false) } })
  const reviewMut = useMutation({ mutationFn: ({ id, status }) => rhAPI.reviewLeave(id, { status }), onSuccess: () => qc.invalidateQueries(['leaves']) })

  const leaves = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'employee',   label: 'Employé',    render: r => r.employee?.first_name ? `${r.employee.first_name} ${r.employee.last_name}` : r.employee || '—' },
    { key: 'start_date', label: 'Début' },
    { key: 'end_date',   label: 'Fin' },
    { key: 'reason',     label: 'Motif' },
    { key: 'status',     label: 'Statut',     render: r => statusBadge(r.status) },
    {
      key: 'actions', label: '',
      render: r => r.status === 'pending' && (
        <div className="flex gap-1">
          <button onClick={() => reviewMut.mutate({ id: r.id, status: 'approved' })} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"><Check size={13} /></button>
          <button onClick={() => reviewMut.mutate({ id: r.id, status: 'rejected' })} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><X size={13} /></button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Demande de congé</button>
      </div>
      <DataTable columns={columns} data={leaves} loading={isLoading} emptyMsg="Aucune demande de congé" />
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle demande de congé">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input type="date" className="input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input type="date" className="input" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <textarea className="input resize-none" rows={3} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>Soumettre</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
