'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CalendarDays, Check, X } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmployeeOption = {
  id: string
  full_name: string
}

type LeaveRow = {
  id: string
  type: string | null
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  employee_id: string
  employees: { full_name: string } | null
}

type LeaveForm = {
  employee_id: string
  type: string
  start_date: string
  end_date: string
  notes: string
}

const EMPTY_FORM: LeaveForm = {
  employee_id: '',
  type: 'annual',
  start_date: '',
  end_date: '',
  notes: '',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
}

const TYPE_LABELS: Record<string, string> = {
  annual: 'Congé annuel',
  sick: 'Congé maladie',
  unpaid: 'Congé non payé',
  other: 'Autre',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeavesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<LeaveForm>(EMPTY_FORM)

  // ---- Employees dropdown ----
  const { data: empResult } = useQuery({
    queryKey: ['employees', '', ''],
    queryFn: async () =>
      supabase.from('employees').select('id, full_name').is('deleted_at', null).order('full_name'),
  })
  const employees: EmployeeOption[] = (empResult?.data as EmployeeOption[] | undefined) ?? []

  // ---- Leave requests query ----
  const { data: leavesResult, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: async () =>
      supabase
        .from('leave_requests')
        .select('id, type, start_date, end_date, status, notes, employee_id, employees(full_name)')
        .order('created_at', { ascending: false })
        .limit(100),
  })
  const leaves: LeaveRow[] = (leavesResult?.data as LeaveRow[] | undefined) ?? []

  // ---- Create mutation ----
  const createMut = useMutation({
    mutationFn: async (f: LeaveForm) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: f.employee_id,
        type: f.type,
        start_date: f.start_date,
        end_date: f.end_date,
        notes: f.notes || null,
        status: 'pending',
        owner_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      toast.success('Demande soumise')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Approve/Reject mutation ----
  const reviewMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('leave_requests')
        .update({ status, approved_by: user!.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      toast.success('Statut mis à jour')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Helpers ----
  function closeModal() {
    setModal(false)
    setForm(EMPTY_FORM)
  }

  const subtitle = useMemo(
    () => `${leaves.length} demande${leaves.length !== 1 ? 's' : ''}`,
    [leaves.length],
  )

  return (
    <>
      <PageShell
        title="Congés"
        subtitle={subtitle}
        icon={CalendarDays}
        iconBg="bg-rose-100"
        iconColor="text-rose-600"
        actionLabel="Nouvelle demande"
        onAction={() => setModal(true)}
      >
        <TableHead cols={['Employé', 'Type', 'Début', 'Fin', 'Statut', '']} />
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</td>
            </tr>
          )}
          {!isLoading && leaves.length === 0 && (
            <EmptyRow
              colSpan={6}
              icon={CalendarDays}
              message="Aucune demande de congé"
              hint='Cliquez sur "Nouvelle demande" pour soumettre.'
            />
          )}
          {leaves.map((l) => (
            <TableRow key={l.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{l.employees?.full_name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{l.type ? (TYPE_LABELS[l.type] ?? l.type) : '—'}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {l.start_date ? new Date(l.start_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {l.end_date ? new Date(l.end_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge
                  label={STATUS_LABELS[l.status] ?? l.status}
                  colorClass={STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}
                />
              </td>
              <td className="px-4 py-3 text-right">
                {l.status === 'pending' && (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => reviewMut.mutate({ id: l.id, status: 'approved' })}
                      disabled={reviewMut.isPending}
                      className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                      title="Approuver"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => reviewMut.mutate({ id: l.id, status: 'rejected' })}
                      disabled={reviewMut.isPending}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Refuser"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </td>
            </TableRow>
          ))}
        </tbody>
      </PageShell>

      {/* New leave request modal */}
      <Modal open={modal} onClose={closeModal} title="Nouvelle demande de congé" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate(form)
          }}
          className="space-y-4"
        >
          {/* Employé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé *</label>
            <select
              required
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
            >
              <option value="">— Sélectionner un employé —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
            >
              <option value="annual">Congé annuel</option>
              <option value="sick">Congé maladie</option>
              <option value="unpaid">Congé non payé</option>
              <option value="other">Autre</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin *</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
              placeholder="Motif optionnel…"
            />
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
              disabled={createMut.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? 'Envoi…' : 'Soumettre'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
