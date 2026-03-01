import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle } from 'lucide-react'
import { comptaAPI } from '../../api/comptabilite'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

export default function Journal() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ description: '', debit: '', credit: '', date: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn:  () => comptaAPI.getJournal().then(r => r.data),
  })

  const createMut = useMutation({ mutationFn: (d) => comptaAPI.createJournal(d), onSuccess: () => { qc.invalidateQueries(['journal']); setModal(false) } })
  const postMut   = useMutation({ mutationFn: (id) => comptaAPI.postJournal(id), onSuccess: () => qc.invalidateQueries(['journal']) })

  const entries = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'date',        label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'debit',       label: 'Débit',  render: r => r.debit  ? `${Number(r.debit).toLocaleString()}  DZD` : '—' },
    { key: 'credit',      label: 'Crédit', render: r => r.credit ? `${Number(r.credit).toLocaleString()} DZD` : '—' },
    { key: 'is_posted',   label: 'Statut', render: r => r.is_posted ? <span className="badge-green">Validé</span> : <span className="badge-yellow">Brouillon</span> },
    {
      key: 'actions', label: '',
      render: r => !r.is_posted && (
        <button onClick={() => postMut.mutate(r.id)} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Valider">
          <CheckCircle size={14} />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Nouvelle écriture</button>
      </div>
      <DataTable columns={columns} data={entries} loading={isLoading} emptyMsg="Aucune écriture" />
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle écriture comptable">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Débit (DZD)</label>
              <input type="number" className="input" value={form.debit} onChange={e => setForm({...form, debit: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crédit (DZD)</label>
              <input type="number" className="input" value={form.credit} onChange={e => setForm({...form, credit: e.target.value})} />
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
