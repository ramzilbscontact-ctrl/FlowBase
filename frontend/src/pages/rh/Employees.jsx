import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { rhAPI } from '../../api/rh'
import DataTable from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'

export default function Employees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({ first_name: '', last_name: '', email: '', position: '', department: '', salary: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn:  () => rhAPI.getEmployees({ search }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => rhAPI.createEmployee(d),
    onSuccess:  () => { qc.invalidateQueries(['employees']); setModal(false) },
  })

  const employees = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'name',       label: 'Nom',       render: r => `${r.first_name} ${r.last_name}` },
    { key: 'position',   label: 'Poste' },
    { key: 'department', label: 'Département', render: r => r.department?.name || r.department || '—' },
    { key: 'email',      label: 'Email' },
    { key: 'salary',     label: 'Salaire',   render: r => r.salary ? `${Number(r.salary).toLocaleString()} DZD` : '—' },
    { key: 'status',     label: 'Statut',    render: r => <span className="badge-green">{r.status || 'actif'}</span> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-64" placeholder="Rechercher un employé…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Nouvel employé</button>
      </div>
      <DataTable columns={columns} data={employees} loading={isLoading} emptyMsg="Aucun employé" />
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvel employé">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input className="input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input className="input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
              <input className="input" value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salaire (DZD)</label>
              <input type="number" className="input" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} />
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
