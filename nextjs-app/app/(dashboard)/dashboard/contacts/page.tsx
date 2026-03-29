'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Users, Trash2, Pencil, Mail, Upload, Loader2 } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'
import { ComposeModal } from '@/components/google/ComposeModal'
import { CsvImportModal } from '@/components/contacts/CsvImportModal'
import type { Database } from '@/lib/types/database.types'

type ContactRow = Database['public']['Tables']['contacts']['Row']
type ContactWithCompany = ContactRow & { companies: { name: string } | null }

const supabase = createClient()

export default function ContactsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [directImporting, setDirectImporting] = useState(false)

  /** Direct CSV import — no preview, auto-detect & insert */
  async function handleDirectImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,text/csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setDirectImporting(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/contacts/import-direct', {
          method: 'POST',
          body: fd,
        })
        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error || "Erreur lors de l'import")
          return
        }

        if (data.imported > 0) {
          toast.success(`${data.imported} contact(s) importé(s)`)
          qc.invalidateQueries({ queryKey: ['contacts'] })
        } else {
          toast.warning('Aucun contact importé')
        }

        if (data.errors?.length > 0) {
          toast.info(`${data.errors.length} ligne(s) ignorée(s)`)
        }
      } catch {
        toast.error('Erreur réseau')
      } finally {
        setDirectImporting(false)
      }
    }
    input.click()
  }

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    tags: '',
  })

  function openCompose(email: string) {
    setComposeTo(email)
    setComposeOpen(true)
  }

  function openEdit(contact: ContactRow) {
    setEditingContact(contact)
    setForm({
      first_name: contact.first_name ?? '',
      last_name: contact.last_name ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      tags: Array.isArray(contact.tags)
        ? contact.tags.join(', ')
        : (contact.tags ?? ''),
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingContact(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', tags: '' })
  }

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      let q = supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company_id, tags, companies(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)
      if (search.trim()) {
        q = q.textSearch('search_vector', search, { type: 'websearch', config: 'simple' })
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ContactWithCompany[]
    },
  })

  const saveMut = useMutation({
    mutationFn: async (f: {
      first_name: string
      last_name: string
      email: string
      phone: string
      tags: string
    }) => {
      const tagsArray = f.tags
        ? f.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update({
            first_name: f.first_name,
            last_name: f.last_name,
            email: f.email,
            phone: f.phone,
            tags: tagsArray,
          })
          .eq('id', editingContact.id)
        if (error) throw error
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('contacts').insert({
          first_name: f.first_name,
          last_name: f.last_name,
          email: f.email,
          phone: f.phone,
          tags: tagsArray,
          owner_id: user!.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success(editingContact ? 'Contact modifié' : 'Contact créé')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact supprimé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const searchInput = (
    <div className="flex items-center gap-3">
    <button
      onClick={handleDirectImport}
      disabled={directImporting}
      className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
    >
      {directImporting ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Upload size={15} />
      )}
      {directImporting ? 'Import…' : 'Importer CSV'}
    </button>
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
        placeholder="Rechercher un contact..."
        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
    </div>
  )

  return (
    <>
      <PageShell
        title="Contacts"
        subtitle={isLoading ? '…' : `${contacts?.length ?? 0} contact(s)`}
        icon={Users}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
        actionLabel="Nouveau contact"
        onAction={() => {
          setEditingContact(null)
          setModal(true)
        }}
        toolbar={searchInput}
      >
        <TableHead cols={['Nom', 'Email', 'Téléphone', 'Entreprise', 'Tags', 'Actions']} />
        <tbody>
          {isLoading ? (
            <EmptyRow colSpan={6} icon={Users} message="Chargement…" />
          ) : !contacts || contacts.length === 0 ? (
            <EmptyRow
              colSpan={6}
              icon={Users}
              message="Aucun contact"
              hint={'Cliquez sur "Nouveau contact" pour créer votre premier contact.'}
            />
          ) : (
            contacts.map((c) => {
              const tagList = Array.isArray(c.tags)
                ? c.tags
                : typeof c.tags === 'string'
                ? (c.tags as string).split(',').map((t: string) => t.trim())
                : []
              return (
                <TableRow key={c.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.companies?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {tagList.length > 0 ? (
                      <div className="inline-flex flex-wrap gap-1">
                        {tagList.map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      {c.email && (
                        <button
                          onClick={() => openCompose(c.email!)}
                          className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                          title="Envoyer un email"
                        >
                          <Mail size={15} />
                        </button>
                      )}
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
              )
            })
          )}
        </tbody>
      </PageShell>

      <Modal
        open={modal}
        onClose={closeModal}
        title={editingContact ? 'Modifier le contact' : 'Nouveau contact'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="ex: client, vip, prospect — séparés par des virgules"
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
                : editingContact
                ? 'Enregistrer'
                : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ComposeModal
        key={composeTo}
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultTo={composeTo}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries({ queryKey: ['contacts'] })}
      />
    </>
  )
}
