import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowRight, Trash2 } from 'lucide-react'
import { facturationAPI } from '../../api/facturation'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

export default function Quotes() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ client_name: '', amount: '', valid_until: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn:  () => facturationAPI.getQuotes().then(r => r.data),
  })

  const createMut  = useMutation({ mutationFn: (d) => facturationAPI.createQuote(d),    onSuccess: () => { qc.invalidateQueries(['quotes']); setModal(false) } })
  const convertMut = useMutation({ mutationFn: (id) => facturationAPI.convertQuote(id), onSuccess: () => qc.invalidateQueries(['quotes']) })
  const deleteMut  = useMutation({ mutationFn: (id) => facturationAPI.deleteQuote(id),  onSuccess: () => qc.invalidateQueries(['quotes']) })

  const quotes = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'client_name', label: 'Client' },
    { key: 'amount',      label: 'Montant', render: r => `${Number(r.amount || 0).toLocaleString()} DZD` },
    { key: 'valid_until', label: 'Valable jusqu\'au' },
    { key: 'status',      label: 'Statut', render: r => <span className="badge-blue">{r.status || 'draft'}</span> },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-1">
          <button onClick={() => convertMut.mutate(r.id)} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Convertir en facture">
            <ArrowRight size={13} />
          </button>
          <button onClick={() => deleteMut.mutate(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 size={13} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Nouveau devis</button>
      </div>
      <DataTable columns={columns} data={quotes} loading={isLoading} emptyMsg="Aucun devis" />
      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau devis">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <input className="input" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (DZD)</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valable jusqu'au</label>
              <input type="date" className="input" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} />
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
