export default function DataTable({ columns, data, loading, emptyMsg = 'Aucune donnée' }) {
  if (loading) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm">
        Chargement…
      </div>
    )
  }
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                {emptyMsg}
              </td>
            </tr>
          ) : (
            data?.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-gray-50 transition">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-gray-700">
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
