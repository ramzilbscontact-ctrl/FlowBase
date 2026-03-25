'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JournalEntry = {
  id: string
  date: string
  description: string | null
  invoice_id: string | null
  created_at: string
  invoices?: { invoice_number: string } | null
}

type AccountOption = {
  id: string
  code: string
  name: string
  type: string
}

type InvoiceOption = {
  id: string
  invoice_number: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  date: todayISO(),
  description: '',
  debit_account_id: '',
  credit_account_id: '',
  amount: '',
  invoice_id: '',
}

export default function JournalPage() {
  const qc = useQueryClient()

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function closeModal() {
    setModal(false)
    setForm({ ...EMPTY_FORM, date: todayISO() })
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('id, date, description, invoice_id, created_at, invoices(invoice_number)')
        .order('date', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data as JournalEntry[]) ?? []
    },
  })

  const { data: accountsData = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type')
        .order('code')
      if (error) throw error
      return (data as AccountOption[]) ?? []
    },
  })

  const { data: invoicesData = [] } = useQuery({
    queryKey: ['invoices', ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as InvoiceOption[]) ?? []
    },
  })

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const saveMut = useMutation({
    mutationFn: async (payload: typeof form) => {
      const amount = parseFloat(payload.amount)
      if (isNaN(amount) || amount <= 0) throw new Error('Montant invalide')

      if (!payload.debit_account_id || !payload.credit_account_id)
        throw new Error('Sélectionnez les deux comptes')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          date: payload.date,
          description: payload.description,
          invoice_id: payload.invoice_id || null,
          owner_id: user!.id,
        } as any)
        .select('id')
        .single()
      if (entryError) throw entryError

      const { error: linesError } = await supabase.from('journal_lines').insert([
        {
          journal_entry_id: entry.id,
          account_id: payload.debit_account_id,
          debit: amount,
          credit: 0,
          description: payload.description,
        },
        {
          journal_entry_id: entry.id,
          account_id: payload.credit_account_id,
          debit: 0,
          credit: amount,
          description: payload.description,
        },
      ] as any)
      if (linesError) throw linesError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] })
      toast.success('Écriture enregistrée')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <PageShell
        title="Journal comptable"
        subtitle={`${entries.length} écriture${entries.length !== 1 ? 's' : ''}`}
        icon={BookOpen}
        iconBg="bg-slate-100"
        iconColor="text-slate-600"
        actionLabel="Nouvelle écriture"
        onAction={() => setModal(true)}
      >
        <TableHead cols={['Date', 'Description', 'Facture liée']} />
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                Chargement…
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <EmptyRow
              colSpan={3}
              icon={BookOpen}
              message="Aucune écriture"
              hint='Cliquez sur "Nouvelle écriture" pour créer votre première écriture comptable.'
            />
          ) : (
            entries.map((e) => (
              <TableRow key={e.id}>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{e.description ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(e.invoices as any)?.invoice_number ?? '—'}
                </td>
              </TableRow>
            ))
          )}
        </tbody>
      </PageShell>

      {/* Create modal */}
      <Modal open={modal} onClose={closeModal} title="Nouvelle écriture comptable" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
              placeholder="Ex. Vente de marchandises"
            />
          </div>

          {/* Compte débiteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte débiteur <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.debit_account_id}
              onChange={(e) => setForm({ ...form, debit_account_id: e.target.value })}
              className={inputCls}
            >
              <option value="">— Sélectionnez un compte —</option>
              {accountsData.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compte créditeur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte créditeur <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.credit_account_id}
              onChange={(e) => setForm({ ...form, credit_account_id: e.target.value })}
              className={inputCls}
            >
              <option value="">— Sélectionnez un compte —</option>
              {accountsData.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant DZD <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputCls}
              placeholder="0.00"
            />
          </div>

          {/* Facture liée (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facture liée (optionnel)</label>
            <select
              value={form.invoice_id}
              onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
              className={inputCls}
            >
              <option value="">— Aucune facture —</option>
              {invoicesData.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
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
              {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
