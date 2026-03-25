'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserCheck, Pencil, Trash2, Search } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeptRow = {
  id: string
  name: string
}

type EmployeeRow = {
  id: string
  full_name: string
  email: string | null
  job_title: string | null
  base_salary: number
  status: 'active' | 'inactive'
  start_date: string | null
  department_id: string | null
  departments: { name: string } | null
}

type EmployeeForm = {
  full_name: string
  email: string
  job_title: string
  department_id: string
  base_salary: string
  start_date: string
  status: string
}

const EMPTY_FORM: EmployeeForm = {
  full_name: '',
  email: '',
  job_title: '',
  department_id: '',
  base_salary: '',
  start_date: '',
  status: 'active',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM)

  // ---- Departments query (for filter + modal dropdown) ----
  const { data: deptsResult } = useQuery({
    queryKey: ['departments'],
    queryFn: async () =>
      supabase.from('departments').select('id, name').is('deleted_at', null).order('name'),
  })
  const depts: DeptRow[] = (deptsResult?.data as DeptRow[] | undefined) ?? []

  // ---- Employees query ----
  const { data: empResult, isLoading } = useQuery({
    queryKey: ['employees', search, deptFilter],
    queryFn: async () => {
      let q = supabase
        .from('employees')
        .select('id, full_name, email, job_title, base_salary, status, start_date, department_id, departments(name)')
        .is('deleted_at', null)
        .order('full_name')
      if (search) q = q.ilike('full_name', `%${search}%`)
      if (deptFilter) q = q.eq('department_id', deptFilter)
      return q
    },
  })
  const employees: EmployeeRow[] = (empResult?.data as EmployeeRow[] | undefined) ?? []

  // ---- Save mutation (create / edit) ----
  const saveMut = useMutation({
    mutationFn: async (f: EmployeeForm) => {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        full_name: f.full_name,
        email: f.email || null,
        job_title: f.job_title || null,
        department_id: f.department_id || null,
        base_salary: parseFloat(f.base_salary) || 0,
        start_date: f.start_date || null,
        status: f.status,
      }
      if (editingEmployee) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployee.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('employees').insert({ ...payload, owner_id: user!.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success(editingEmployee ? 'Employé mis à jour' : 'Employé créé')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Delete mutation (soft) ----
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employé supprimé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Helpers ----
  function openCreate() {
    setEditingEmployee(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(emp: EmployeeRow) {
    setEditingEmployee(emp)
    setForm({
      full_name: emp.full_name,
      email: emp.email ?? '',
      job_title: emp.job_title ?? '',
      department_id: emp.department_id ?? '',
      base_salary: String(emp.base_salary),
      start_date: emp.start_date ?? '',
      status: emp.status,
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingEmployee(null)
    setForm(EMPTY_FORM)
  }

  const subtitle = useMemo(
    () => `${employees.length} employé${employees.length !== 1 ? 's' : ''}`,
    [employees.length],
  )

  // ---- Toolbar ----
  const toolbar = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un employé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>
      <select
        value={deptFilter}
        onChange={(e) => setDeptFilter(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
      >
        <option value="">Tous les départements</option>
        {depts.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </div>
  )

  return (
    <>
      <PageShell
        title="Employés"
        subtitle={subtitle}
        icon={UserCheck}
        iconBg="bg-teal-100"
        iconColor="text-teal-600"
        actionLabel="Nouvel employé"
        onAction={openCreate}
        toolbar={toolbar}
      >
        <TableHead cols={['Nom', 'Poste', 'Département', 'Email', 'Salaire brut', 'Statut', '']} />
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</td>
            </tr>
          )}
          {!isLoading && employees.length === 0 && (
            <EmptyRow
              colSpan={7}
              icon={UserCheck}
              message="Aucun employé"
              hint='Cliquez sur "Nouvel employé" pour commencer.'
            />
          )}
          {employees.map((emp) => (
            <TableRow key={emp.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{emp.full_name}</td>
              <td className="px-4 py-3 text-gray-600">{emp.job_title ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{emp.departments?.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{emp.email ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">
                {emp.base_salary ? `${Number(emp.base_salary).toLocaleString('fr-DZ')} DZD` : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge
                  label={emp.status === 'active' ? 'Actif' : 'Inactif'}
                  colorClass={emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEdit(emp)}
                    className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer ${emp.full_name} ?`)) deleteMut.mutate(emp.id)
                    }}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </TableRow>
          ))}
        </tbody>
      </PageShell>

      {/* Create / Edit modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          {/* Nom complet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="Ahmed Boudali"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="ahmed@example.com"
            />
          </div>

          {/* Poste + Département */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
              <input
                type="text"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Développeur"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
              >
                <option value="">— Sélectionner —</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Salaire + Date d'entrée */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salaire brut (DZD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'entrée</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {saveMut.isPending ? 'Enregistrement…' : (editingEmployee ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
