'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Building2, Pencil, Trash2 } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeptRow = {
  id: string
  name: string
  created_at: string
}

type DeptForm = {
  name: string
}

const EMPTY_FORM: DeptForm = { name: '' }

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DepartmentsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editingDept, setEditingDept] = useState<DeptRow | null>(null)
  const [form, setForm] = useState<DeptForm>(EMPTY_FORM)

  // ---- Query ----
  const { data: result, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () =>
      supabase.from('departments').select('id, name, created_at').is('deleted_at', null).order('name'),
  })
  const depts: DeptRow[] = (result?.data as DeptRow[] | undefined) ?? []

  // ---- Save mutation ----
  const saveMut = useMutation({
    mutationFn: async (f: DeptForm) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (editingDept) {
        const { error } = await supabase.from('departments').update({ name: f.name }).eq('id', editingDept.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('departments').insert({ name: f.name, owner_id: user!.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success(editingDept ? 'Département mis à jour' : 'Département créé')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Delete mutation (soft) ----
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Département supprimé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Helpers ----
  function openCreate() {
    setEditingDept(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(dept: DeptRow) {
    setEditingDept(dept)
    setForm({ name: dept.name })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingDept(null)
    setForm(EMPTY_FORM)
  }

  const subtitle = useMemo(
    () => `${depts.length} département${depts.length !== 1 ? 's' : ''}`,
    [depts.length],
  )

  return (
    <>
      <PageShell
        title="Départements"
        subtitle={subtitle}
        icon={Building2}
        iconBg="bg-cyan-100"
        iconColor="text-cyan-600"
        actionLabel="Nouveau département"
        onAction={openCreate}
      >
        <TableHead cols={['Nom', 'Créé le', '']} />
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</td>
            </tr>
          )}
          {!isLoading && depts.length === 0 && (
            <EmptyRow
              colSpan={3}
              icon={Building2}
              message="Aucun département"
              hint='Cliquez sur "Nouveau département" pour commencer.'
            />
          )}
          {depts.map((dept) => (
            <TableRow key={dept.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {new Date(dept.created_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEdit(dept)}
                    className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer le département "${dept.name}" ?`)) deleteMut.mutate(dept.id)
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
        title={editingDept ? 'Modifier le département' : 'Nouveau département'}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="Ressources Humaines"
            />
          </div>
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
              {saveMut.isPending ? 'Enregistrement…' : (editingDept ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
