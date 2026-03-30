'use client'

import { useState } from 'react'
import { Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type ExportType = 'contacts' | 'deals' | 'invoices'

export default function NotionExportButton() {
  const [exportType, setExportType] = useState<ExportType>('contacts')
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [notionDbId, setNotionDbId] = useState('')

  const handleExport = async () => {
    setExporting(true)
    setResult(null)

    try {
      const res = await fetch('/api/notion/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          notion_database_id: notionDbId.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `${data.exported} ${exportType} exporte(s) vers Notion avec succes.`,
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Erreur lors de l\'export.',
        })
      }
    } catch {
      setResult({
        success: false,
        message: 'Erreur reseau. Veuillez reessayer.',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={exportType}
          onChange={e => setExportType(e.target.value as ExportType)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="contacts">Contacts</option>
          <option value="deals">Deals</option>
          <option value="invoices">Factures</option>
        </select>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {exporting ? 'Export en cours...' : 'Exporter vers Notion'}
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          ID base Notion (optionnel — laissez vide pour en creer une nouvelle)
        </label>
        <input
          type="text"
          value={notionDbId}
          onChange={e => setNotionDbId(e.target.value)}
          placeholder="Coller l'ID d'une base Notion existante..."
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        />
      </div>

      {result && (
        <div
          className={`rounded-md p-3 text-sm flex items-start gap-2 ${
            result.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          {result.message}
        </div>
      )}
    </div>
  )
}
