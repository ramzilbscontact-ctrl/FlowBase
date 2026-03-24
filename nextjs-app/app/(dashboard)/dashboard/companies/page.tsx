import { createClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, industry, website, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Entreprises"
      subtitle={`${companies?.length ?? 0} entreprise${(companies?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={Building2}
      iconBg="bg-blue-100"
      iconColor="text-blue-600"
    >
      <TableHead cols={['Nom', 'Secteur', 'Site web', 'Créé le', '']} />
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
        {!companies || companies.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={Building2}
            message="Aucune entreprise"
            hint={'Cliquez sur "Ajouter" pour créer votre première entreprise.'}
          />
        ) : (
          companies.map((c) => (
            <TableRow key={c.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
              <td className="px-4 py-3 text-gray-600">{c.industry ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">
                {c.website ? (
                  <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {c.website}
                  </a>
                ) : '—'}
              </td>
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
