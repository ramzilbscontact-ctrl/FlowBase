'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Building2, Trash2, Pencil } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'
import type { Database } from '@/lib/types/database.types'

type CompanyRow = Database['public']['Tables']['companies']['Row']
type CompanyWithCount = CompanyRow & {
  contacts?: { count: number }[]
}

const supabase = createClient()

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null)
  const [form, setForm] = useState({
    name: '',
    industry: '',
    website: '',
    address: '',
  })

  function openEdit(company: CompanyRow) {
    setEditingCompany(company)
    setForm({
      name: company.name ?? '',
      industry: company.industry ?? '',
      website: company.website ?? '',
      address: company.address ?? '',
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingCompany(null)
    setForm({ name: '', industry: '', website: '', address: '' })
  }

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', search],
    queryFn: async () => {
      let q = (supabase as any)
        .from('companies')
        .select('id, name, industry, website, address, created_at, contacts(count)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)
      if (search.trim()) {
        q = q.textSearch('search_vector', search, { type: 'websearch', config: 'simple' })
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as CompanyWithCount[]
    },
  })

  const saveMut = useMutation({
    mutationFn: async (f: {
      name: string
      industry: string
      website: string
      address: string
    }) => {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: f.name,
            industry: f.industry || null,
            website: f.website || null,
            address: f.address || null,
          })
          .eq('id', editingCompany.id)
        if (error) throw error
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('companies').insert({
          name: f.name,
          industry: f.industry || null,
          website: f.website || null,
          address: f.address || null,
          owner_id: user!.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success(editingCompany ? 'Entreprise modifiée' : 'Entreprise créée')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Entreprise supprimée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const searchInput = (
    <div className="relative max-w-sm">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher une entreprise..."
        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
  )

  return (
    <>
      <PageShell
        title="Entreprises"
        subtitle={isLoading ? '…' : `${companies?.length ?? 0} entreprise(s)`}
        icon={Building2}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        actionLabel="Nouvelle entreprise"
        onAction={() => {
          setEditingCompany(null)
          setModal(true)
        }}
        toolbar={searchInput}
      >
        <TableHead
          cols={['Nom', 'Secteur', 'Site web', 'Adresse', 'Contacts', 'Créé le', 'Actions']}
        />
        <tbody>
          {isLoading ? (
            <EmptyRow colSpan={7} icon={Building2} message="Chargement…" />
          ) : !companies || companies.length === 0 ? (
            <EmptyRow
              colSpan={7}
              icon={Building2}
              message="Aucune entreprise"
              hint={'Cliquez sur "Nouvelle entreprise" pour créer votre première entreprise.'}
            />
          ) : (
            companies.map((c) => (
              <TableRow key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.industry ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.website ? (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-[160px] block"
                    >
                      {c.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{c.address ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">
                    {c.contacts?.[0]?.count ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteMut.mutate(c.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </TableRow>
            ))
          )}
        </tbody>
      </PageShell>

      <Modal
        open={modal}
        onClose={closeModal}
        title={editingCompany ? "Modifier l'entreprise" : 'Nouvelle entreprise'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="ex: 5 Rue Didouche Mourad, Alger"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {saveMut.isPending
                ? 'Enregistrement…'
                : editingCompany
                ? 'Enregistrer'
                : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
