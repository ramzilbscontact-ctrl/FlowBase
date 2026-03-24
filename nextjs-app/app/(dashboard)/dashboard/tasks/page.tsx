'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckSquare, Pencil, Trash2 } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Task = {
  id: string
  title: string
  completed: boolean
  due_date: string | null
  priority: string
  assigned_to: string | null
  created_at: string
  profiles?: { full_name: string | null } | null
}

type Profile = {
  id: string
  full_name: string | null
}

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

const priorityLabel: Record<string, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
}

const priorityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const qc = useQueryClient()

  const [modal, setModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [form, setForm] = useState({
    title: '',
    due_date: '',
    priority: 'medium',
    assigned_to: '',
  })

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function openEdit(task: Task) {
    setEditingTask(task)
    setForm({
      title: task.title ?? '',
      due_date: task.due_date ?? '',
      priority: task.priority ?? 'medium',
      assigned_to: task.assigned_to ?? '',
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingTask(null)
    setForm({ title: '', due_date: '', priority: 'medium', assigned_to: '' })
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      let q = (supabase as any)
        .from('tasks')
        .select('id, title, completed, due_date, priority, assigned_to, created_at, profiles!tasks_assigned_to_fkey(full_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter === 'pending') q = q.eq('completed', false)
      if (filter === 'done') q = q.eq('completed', true)

      const { data, error } = await q
      if (error) throw error
      return (data as Task[]) ?? []
    },
  })

  const { data: profilesList = [] } = useQuery({
    queryKey: ['profiles-select'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name', { ascending: true })
          .limit(100)
        if (error) return []
        return (data as Profile[]) ?? []
      } catch {
        return []
      }
    },
  })

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const toggleMut = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('tasks').update({ completed } as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const saveMut = useMutation({
    mutationFn: async (f: { title: string; due_date: string; priority: string; assigned_to: string }) => {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: f.title,
            due_date: f.due_date || null,
            priority: f.priority,
            assigned_to: f.assigned_to || null,
          } as any)
          .eq('id', editingTask.id)
        if (error) throw error
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('tasks').insert({
          title: f.title,
          due_date: f.due_date || null,
          priority: f.priority,
          assigned_to: f.assigned_to || null,
          owner_id: user!.id,
          completed: false,
        } as any)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(editingTask ? 'Tâche modifiée' : 'Tâche créée')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tâche supprimée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // -------------------------------------------------------------------------
  // Toolbar
  // -------------------------------------------------------------------------

  const filterTabs = (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {(['all', 'pending', 'done'] as const).map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === f
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {f === 'all' ? 'Toutes' : f === 'pending' ? 'En cours' : 'Terminées'}
        </button>
      ))}
    </div>
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <PageShell
        title="Tâches"
        subtitle={`${tasks.length} tâche${tasks.length !== 1 ? 's' : ''}`}
        icon={CheckSquare}
        iconBg="bg-purple-100"
        iconColor="text-purple-600"
        actionLabel="Nouvelle tâche"
        onAction={() => {
          setEditingTask(null)
          setModal(true)
        }}
        toolbar={filterTabs}
      >
        <TableHead cols={['Titre', 'Statut', 'Priorité', 'Assigné à', 'Échéance', '']} />
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                Chargement…
              </td>
            </tr>
          ) : tasks.length === 0 ? (
            <EmptyRow
              colSpan={6}
              icon={CheckSquare}
              message="Aucune tâche"
              hint='Cliquez sur "Nouvelle tâche" pour créer votre première tâche.'
            />
          ) : (
            tasks.map((t) => (
              <TableRow key={t.id}>
                {/* Titre */}
                <td
                  className={`px-4 py-3 ${
                    t.completed
                      ? 'line-through text-gray-400'
                      : 'font-medium text-gray-900'
                  }`}
                >
                  {t.title}
                </td>

                {/* Statut */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleMut.mutate({ id: t.id, completed: !t.completed })}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition ${
                      t.completed
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {t.completed ? 'Terminé' : 'En cours'}
                  </button>
                </td>

                {/* Priorité */}
                <td className="px-4 py-3">
                  <Badge
                    label={priorityLabel[t.priority] ?? t.priority}
                    colorClass={priorityColor[t.priority] ?? 'bg-gray-100 text-gray-600'}
                  />
                </td>

                {/* Assigné à */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {t.profiles?.full_name ?? '—'}
                </td>

                {/* Échéance */}
                <td className="px-4 py-3 text-xs text-gray-400">
                  {t.due_date
                    ? new Date(t.due_date).toLocaleDateString('fr-FR')
                    : '—'}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                      title="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteMut.mutate(t.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </TableRow>
            ))
          )}
        </tbody>
      </PageShell>

      {/* Create / Edit modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Titre de la tâche"
            />
          </div>

          {/* Échéance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Échéance
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorité
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>

          {/* Assigner à */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigner à
            </label>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">— Non assigné —</option>
              {profilesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.id}
                </option>
              ))}
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {saveMut.isPending
                ? 'Enregistrement…'
                : editingTask
                ? 'Enregistrer'
                : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
