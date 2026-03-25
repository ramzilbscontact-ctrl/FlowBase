'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LayoutList, Pencil } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountRow = {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  parent_id: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabel: Record<string, string> = {
  asset: 'Actif',
  liability: 'Passif',
  equity: 'Capitaux propres',
  income: 'Produits',
  expense: 'Charges',
}

const typeColor: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-orange-100 text-orange-700',
  equity: 'bg-purple-100 text-purple-700',
  income: 'bg-green-100 text-green-700',
  expense: 'bg-red-100 text-red-700',
}

// Ordered list of account types for section rendering
const TYPE_ORDER: AccountRow['type'][] = ['asset', 'liability', 'equity', 'income', 'expense']

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const EMPTY_FORM = { code: '', name: '', type: 'asset', parent_id: '' }

export default function AccountsPage() {
  const qc = useQueryClient()

  const [modal, setModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null)
  const [form, setForm] = useState<{ code: string; name: string; type: string; parent_id: string }>(EMPTY_FORM)

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function openCreate() {
    setEditingAccount(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(account: AccountRow) {
    setEditingAccount(account)
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      parent_id: account.parent_id ?? '',
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingAccount(null)
    setForm(EMPTY_FORM)
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type, parent_id, created_at')
        .order('code')
      if (error) throw error
      return (data as AccountRow[]) ?? []
    },
  })

  // Group by type client-side
  const grouped = new Map<string, AccountRow[]>()
  for (const type of TYPE_ORDER) {
    grouped.set(type, [])
  }
  for (const account of accounts) {
    const list = grouped.get(account.type)
    if (list) list.push(account)
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const saveMut = useMutation({
    mutationFn: async (f: typeof form) => {
      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update({
            code: f.code,
            name: f.name,
            type: f.type,
            parent_id: f.parent_id || null,
          } as any)
          .eq('id', editingAccount.id)
        if (error) throw error
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('accounts').insert({
          code: f.code,
          name: f.name,
          type: f.type,
          parent_id: f.parent_id || null,
          owner_id: user!.id,
        } as any)
        if (error) {
          if (error.code === '23505') throw new Error('Code déjà utilisé')
          throw error
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(editingAccount ? 'Compte modifié' : 'Compte créé')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const cols = ['Code', 'Nom', 'Type', 'Actions']

  function renderSection(type: string, rows: AccountRow[]) {
    if (rows.length === 0) return null
    return (
      <>
        <tr key={`section-${type}`}>
          <td
            colSpan={4}
            className="px-4 py-2 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200"
          >
            {typeLabel[type] ?? type}
          </td>
        </tr>
        {rows.map((account) => (
          <TableRow key={account.id}>
            <td className="px-4 py-3 font-mono text-sm text-gray-700">{account.code}</td>
            <td className="px-4 py-3 font-medium text-gray-900">{account.name}</td>
            <td className="px-4 py-3">
              <Badge label={typeLabel[account.type] ?? account.type} colorClass={typeColor[account.type] ?? 'bg-gray-100 text-gray-600'} />
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={() => openEdit(account)}
                className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                title="Modifier"
              >
                <Pencil size={14} />
              </button>
            </td>
          </TableRow>
        ))}
      </>
    )
  }

  const hasAccounts = accounts.length > 0

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <PageShell
        title="Plan comptable"
        subtitle={`${accounts.length} compte${accounts.length !== 1 ? 's' : ''}`}
        icon={LayoutList}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        actionLabel="Nouveau compte"
        onAction={openCreate}
      >
        <TableHead cols={cols} />
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                Chargement…
              </td>
            </tr>
          ) : !hasAccounts ? (
            <EmptyRow
              colSpan={4}
              icon={LayoutList}
              message="Aucun compte"
              hint='Cliquez sur "Nouveau compte" pour créer votre premier compte comptable.'
            />
          ) : (
            TYPE_ORDER.map((type) => renderSection(type, grouped.get(type) ?? []))
          )}
        </tbody>
      </PageShell>

      {/* Create / Edit modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editingAccount ? 'Modifier le compte' : 'Nouveau compte'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={inputCls}
              placeholder="411000"
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Nom du compte"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={inputCls}
            >
              <option value="asset">Actif</option>
              <option value="liability">Passif</option>
              <option value="equity">Capitaux propres</option>
              <option value="income">Produits</option>
              <option value="expense">Charges</option>
            </select>
          </div>

          {/* Parent (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte parent (optionnel)
            </label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              {accounts
                .filter((a) => !editingAccount || a.id !== editingAccount.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
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
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {saveMut.isPending ? 'Enregistrement…' : editingAccount ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
