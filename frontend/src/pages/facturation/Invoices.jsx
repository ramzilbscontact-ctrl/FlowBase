import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Trash2 } from 'lucide-react'
import { facturationAPI } from '../../api/facturation'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

const statusBadge = (s) => ({
  draft:    <span className="badge-gray">Brouillon</span>,
  sent:     <span className="badge-blue">Envoyée</span>,
  paid:     <span className="badge-green">Payée</span>,
  overdue:  <span className="badge-red">En retard</span>,
  cancelled:<span className="badge-gray">Annulée</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function Invoices() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ client_name: '', amount: '', due_date: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn:  () => facturationAPI.getInvoices().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => facturationAPI.createInvoice(d),
    onSuccess:  () => { qc.invalidateQueries(['invoices']); setModal(false) },
  })

  const sendMut = useMutation({
    mutationFn: (id) => facturationAPI.sendInvoice(id),
    onSuccess:  () => qc.invalidateQueries(['invoices']),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => facturationAPI.deleteInvoice(id),
    onSuccess:  () => qc.invalidateQueries(['invoices']),
  })

  const invoices = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'number',      label: 'N°',          render: r => r.number || `#${r.id?.slice(-6)}` },
    { key: 'client_name', label: 'Client' },
    { key: 'amount',      label: 'Montant',      render: r => `${Number(r.amount || 0).toLocaleString()} DZD` },
    { key: 'due_date',    label: 'Échéance' },
    { key: 'status',      label: 'Statut',       render: r => statusBadge(r.status) },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-1">
          {r.status === 'draft' && (
            <button onClick={() => sendMut.mutate(r.id)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition" title="Envoyer">
              <Send size={13} />
            </button>
          )}
          <button onClick={() => deleteMut.mutate(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
            <Trash2 size={13} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Nouvelle facture
        </button>
      </div>

      <DataTable columns={columns} data={invoices} loading={isLoading} emptyMsg="Aucune facture" />

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle facture">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
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
