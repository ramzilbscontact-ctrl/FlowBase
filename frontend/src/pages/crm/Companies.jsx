import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import { crmAPI } from '../../api/crm'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

export default function Companies() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({ name: '', industry: '', website: '', phone: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search],
    queryFn:  () => crmAPI.getCompanies({ search }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => crmAPI.createCompany(d),
    onSuccess:  () => { qc.invalidateQueries(['companies']); setModal(false); setForm({ name: '', industry: '', website: '', phone: '' }) },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => crmAPI.deleteCompany(id),
    onSuccess:  () => qc.invalidateQueries(['companies']),
  })

  const companies = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'name',     label: 'Nom' },
    { key: 'industry', label: 'Secteur' },
    { key: 'website',  label: 'Site web', render: (r) => r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{r.website}</a> : '—' },
    { key: 'phone',    label: 'Téléphone' },
    { key: 'actions',  label: '', render: (r) => (
      <button onClick={() => deleteMut.mutate(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
        <Trash2 size={14} />
      </button>
    )},
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-64" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Nouvelle entreprise
        </button>
      </div>

      <DataTable columns={columns} data={companies} loading={isLoading} emptyMsg="Aucune entreprise" />

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle entreprise">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
            <input className="input" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
              <input className="input" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
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
