import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'

const searchBar = (
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
      placeholder="Rechercher un contact..."
      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
    />
  </div>
)

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Contacts"
      subtitle={`${contacts?.length ?? 0} contact${(contacts?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={Users}
      iconBg="bg-violet-100"
      iconColor="text-violet-600"
      toolbar={searchBar}
    >
      <TableHead cols={['Nom', 'Email', 'Téléphone', 'Créé le', '']} />
      <tbody>
        {error && (
          <tr>
            <td colSpan={5} className="px-4 py-3">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                Erreur lors du chargement : {error.message}
              </div>
            </td>
          </tr>
        )}
        {!contacts || contacts.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={Users}
            message="Aucun contact"
            hint={'Cliquez sur "Ajouter" pour créer votre premier contact.'}
          />
        ) : (
          contacts.map((c) => (
            <TableRow key={c.id}>
              <td className="px-4 py-3 font-medium text-gray-900">
                {c.first_name} {c.last_name}
              </td>
              <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {new Date(c.created_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-3 text-right">
                <button className="text-xs text-violet-600 hover:underline">Voir</button>
              </td>
            </TableRow>
          ))
        )}
      </tbody>
    </PageShell>
  )
}
