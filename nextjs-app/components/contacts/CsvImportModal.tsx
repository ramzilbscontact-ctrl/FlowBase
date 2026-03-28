'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2 } from 'lucide-react'
import {
  parseCsv,
  decodeBuffer,
  type ParsedCsv,
  type ColumnMapping,
  type ContactField,
} from '@/lib/utils/csv-parser'

const FIELD_OPTIONS: { value: ContactField; label: string }[] = [
  { value: 'first_name', label: 'Prénom' },
  { value: 'last_name', label: 'Nom' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '— Ignorer —' },
]

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function CsvImportModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    total: number
    errors: { row: number; message: string }[]
  } | null>(null)
  const [fileName, setFileName] = useState('')

  const reset = useCallback(() => {
    setStep('upload')
    setParsed(null)
    setMapping([])
    setResult(null)
    setFileName('')
    setImporting(false)
  }, [])

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    try {
      const buffer = await file.arrayBuffer()
      const text = decodeBuffer(buffer)
      const data = parseCsv(text)

      if (data.headers.length === 0 || data.rows.length === 0) {
        toast.error('Le fichier est vide ou invalide')
        return
      }

      setParsed(data)
      setMapping(data.mapping)
      setFileName(file.name)
      setStep('preview')
    } catch {
      toast.error('Erreur de lecture du fichier')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file)
    } else {
      toast.error('Veuillez déposer un fichier .csv')
    }
  }

  function updateMapping(index: number, field: ContactField) {
    setMapping(prev => prev.map((m, i) => i === index ? { ...m, field } : m))
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)

    try {
      // Re-read the file and send to API with our mapping
      const formData = new FormData()
      // We need to reconstruct the CSV text from parsed data
      const csvText = [
        parsed.headers.join(parsed.separator),
        ...parsed.rows.map(row => row.join(parsed.separator)),
      ].join('\n')
      const blob = new Blob([csvText], { type: 'text/csv' })
      formData.append('file', blob, fileName)
      formData.append('mapping', JSON.stringify(mapping))

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l\'import')
        setImporting(false)
        return
      }

      setResult(data)
      setStep('result')
      if (data.imported > 0) {
        onImported()
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer des contacts"
      size="lg"
    >
      {step === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-violet-300 transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.csv,text/csv'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) handleFile(file)
            }
            input.click()
          }}
        >
          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Glissez un fichier CSV ici
          </p>
          <p className="text-xs text-gray-400">
            ou cliquez pour sélectionner • Séparateurs , ; | tab détectés automatiquement
          </p>
        </div>
      )}

      {step === 'preview' && parsed && (
        <div className="space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-violet-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-500">
                {parsed.totalRows} lignes • {parsed.headers.length} colonnes •
                Séparateur : {parsed.separator === '\t' ? 'tab' : `"${parsed.separator}"`}
              </p>
            </div>
          </div>

          {/* Column mapping */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Mapping des colonnes</h4>
            <div className="grid grid-cols-2 gap-2">
              {parsed.headers.map((header, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-[120px]" title={header}>
                    {header}
                  </span>
                  <span className="text-gray-400 text-xs">→</span>
                  <select
                    value={mapping[i]?.field ?? 'skip'}
                    onChange={(e) => updateMapping(i, e.target.value as ContactField)}
                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {FIELD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Aperçu (5 premières lignes)
            </h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {parsed.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                        {h}
                        {mapping[i]?.field !== 'skip' && (
                          <span className="ml-1 text-violet-500">→ {mapping[i]?.field}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                          {cell || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Changer de fichier
            </button>
            <button
              onClick={handleImport}
              disabled={importing || mapping.every(m => m.field === 'skip')}
              className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Import en cours…
                </>
              ) : (
                <>Importer {parsed.totalRows} contact(s)</>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-4 text-center py-4">
          {result.imported > 0 ? (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-2">
              <Check className="w-7 h-7 text-green-500" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-2">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
          )}

          <h3 className="text-lg font-semibold text-gray-900">
            {result.imported} contact(s) importé(s)
          </h3>
          <p className="text-sm text-gray-500">
            sur {result.total} ligne(s) dans le fichier
          </p>

          {result.errors.length > 0 && (
            <div className="mt-4 text-left max-h-40 overflow-y-auto bg-amber-50 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-2">
                {result.errors.length} erreur(s) :
              </p>
              {result.errors.slice(0, 20).map((err, i) => (
                <p key={i} className="text-xs text-amber-600">
                  Ligne {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={handleClose}
            className="mt-4 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
          >
            Fermer
          </button>
        </div>
      )}
    </Modal>
  )
}
