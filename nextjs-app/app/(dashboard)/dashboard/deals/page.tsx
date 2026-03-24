'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { TrendingUp, Plus } from 'lucide-react'
import type { Database } from '@/lib/types/database.types'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { Modal } from '@/components/ui/Modal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DealRow = Database['public']['Tables']['deals']['Row'] & {
  contacts?: { first_name: string | null; last_name: string | null } | null
  companies?: { name: string } | null
}

type StageRow = {
  id: string
  name: string
  position: number
}

type ContactSelect = {
  id: string
  first_name: string | null
  last_name: string | null
}

type CompanySelect = {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Module-level Supabase client (client component)
// ---------------------------------------------------------------------------

const supabase = createClient()

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DealsPage() {
  const qc = useQueryClient()

  // --- modal state ---
  const [modal, setModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<DealRow | null>(null)
  const [form, setForm] = useState({
    title: '',
    value: '',
    stage_id: '',
    contact_id: '',
    company_id: '',
  })

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function openEdit(deal: DealRow) {
    setEditingDeal(deal)
    setForm({
      title: deal.title ?? '',
      value: String(deal.value ?? ''),
      stage_id: deal.stage_id ?? '',
      contact_id: deal.contact_id ?? '',
      company_id: deal.company_id ?? '',
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingDeal(null)
    setForm({
      title: '',
      value: '',
      stage_id: stages?.[0]?.id ?? '',
      contact_id: '',
      company_id: '',
    })
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const { data: stages } = useQuery<StageRow[]>({
    queryKey: ['pipeline_stages'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, position')
        .eq('owner_id', user!.id)
        .order('position', { ascending: true })

      if (error) throw error

      // Auto-seed if empty (handles fresh Supabase projects)
      if (!data || data.length === 0) {
        const defaults = [
          { name: 'Prospect', position: 0 },
          { name: 'Qualifié', position: 1 },
          { name: 'Proposition', position: 2 },
          { name: 'Négociation', position: 3 },
          { name: 'Gagné', position: 4 },
          { name: 'Perdu', position: 5 },
        ]
        const { data: seeded } = await supabase
          .from('pipeline_stages')
          .insert(defaults.map((s) => ({ ...s, owner_id: user!.id })))
          .select('id, name, position')
        return seeded ?? []
      }

      return data
    },
  })

  const { data: deals } = useQuery<DealRow[]>({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(
          'id, title, value, stage_id, contact_id, company_id, closed_at, created_at, deleted_at, assigned_to, owner_id, search_vector, updated_at, contacts(first_name, last_name), companies(name)'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as DealRow[]
    },
  })

  const { data: contactsList } = useQuery<ContactSelect[]>({
    queryKey: ['contacts-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .is('deleted_at', null)
        .order('first_name', { ascending: true })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })

  const { data: companiesList } = useQuery<CompanySelect[]>({
    queryKey: ['companies-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateStageMut = useMutation({
    mutationFn: async ({
      dealId,
      stageId,
    }: {
      dealId: string
      stageId: string
    }) => {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId })
        .eq('id', dealId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const saveMut = useMutation({
    mutationFn: async (f: typeof form) => {
      if (editingDeal) {
        // UPDATE path
        const { error } = await supabase
          .from('deals')
          .update({
            title: f.title,
            value: parseFloat(f.value) || 0,
            stage_id: f.stage_id || null,
            contact_id: f.contact_id || null,
            company_id: f.company_id || null,
          })
          .eq('id', editingDeal.id)
        if (error) throw error
      } else {
        // INSERT path
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('deals').insert({
          title: f.title,
          value: parseFloat(f.value) || 0,
          stage_id: f.stage_id || null,
          contact_id: f.contact_id || null,
          company_id: f.company_id || null,
          owner_id: user!.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      toast.success(editingDeal ? 'Opportunité modifiée' : 'Opportunité créée')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      toast.success('Opportunité supprimée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Pipeline de vente
            </h1>
            <p className="text-sm text-gray-500">
              {deals?.length ?? 0} opportunité(s)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingDeal(null)
            setForm({
              title: '',
              value: '',
              stage_id: stages?.[0]?.id ?? '',
              contact_id: '',
              company_id: '',
            })
            setModal(true)
          }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle opportunité
        </button>
      </div>

      {/* Kanban board */}
      <KanbanBoard
        deals={deals ?? []}
        stages={stages ?? []}
        onStageDrop={(dealId, stageId) =>
          updateStageMut.mutate({ dealId, stageId })
        }
        onDelete={(id) => deleteMut.mutate(id)}
        onEdit={openEdit}
      />

      {/* Create / Edit modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={
          editingDeal ? "Modifier l'opportunité" : 'Nouvelle opportunité'
        }
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
              required
              type="text"
              placeholder="Nom de l'opportunité"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant DZD
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* Étape */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Étape
            </label>
            <select
              value={form.stage_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, stage_id: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">— Aucune étape —</option>
              {stages?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact
            </label>
            <select
              value={form.contact_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, contact_id: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">— Aucun contact —</option>
              {contactsList?.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() ||
                    c.id}
                </option>
              ))}
            </select>
          </div>

          {/* Entreprise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entreprise
            </label>
            <select
              value={form.company_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_id: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">— Aucune entreprise —</option>
              {companiesList?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saveMut.isPending
                ? 'Enregistrement…'
                : editingDeal
                  ? 'Enregistrer'
                  : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
