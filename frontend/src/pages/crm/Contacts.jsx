import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { crmAPI } from '../../api/crm'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

export default function Contacts() {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '', phone: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn:  () => crmAPI.getContacts({ search }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => crmAPI.createContact(d),
    onSuccess:  () => { qc.invalidateQueries(['contacts']); setModal(false); setForm({ first_name: '', last_name: '', email: '', phone: '' }) },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => crmAPI.deleteContact(id),
    onSuccess:  () => qc.invalidateQueries(['contacts']),
  })

  const contacts = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'full_name',   label: 'Nom',      render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'email',       label: 'Email' },
    { key: 'phone',       label: 'Téléphone' },
    { key: 'company',     label: 'Entreprise', render: (r) => r.company?.name || '—' },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button onClick={() => deleteMut.mutate(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
          <Trash2 size={14} />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-64"
            placeholder="Rechercher un contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Nouveau contact
        </button>
      </div>

      <DataTable columns={columns} data={contacts} loading={isLoading} emptyMsg="Aucun contact trouvé" />

      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau contact">
        <form
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input className="input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input className="input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
