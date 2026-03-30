'use client'

import { useState, useRef } from 'react'
import { Mail, Calendar, FileSpreadsheet, Code2, Check, Loader2 } from 'lucide-react'

interface StepConnectProps {
  onNext: () => void
  onBack: () => void
}

export default function StepConnect({ onNext, onBack }: StepConnectProps) {
  const [googleConnected, setGoogleConnected] = useState(false)
  const [csvImported, setCsvImported] = useState(false)
  const [importingCsv, setImportingCsv] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleGoogleConnect() {
    setConnectingGoogle(true)
    try {
      // Redirect to Google OAuth connect flow
      window.location.href = '/api/google/connect'
    } catch {
      setConnectingGoogle(false)
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportingCsv(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/contacts/import-direct', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setCsvImported(true)
      }
    } catch {
      // silently handle error
    } finally {
      setImportingCsv(false)
    }
  }

  const integrations = [
    {
      icon: <div className="flex gap-1"><Mail className="w-5 h-5" /><Calendar className="w-5 h-5" /></div>,
      title: 'Google Workspace',
      description: 'Connectez Gmail et Google Calendar pour synchroniser vos emails et événements.',
      action: googleConnected ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
          <Check className="w-4 h-4" /> Connecté
        </span>
      ) : (
        <button
          onClick={handleGoogleConnect}
          disabled={connectingGoogle}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {connectingGoogle && <Loader2 className="w-4 h-4 animate-spin" />}
          Connecter Google
        </button>
      ),
      skip: googleConnected,
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5" />,
      title: 'Importer des contacts CSV',
      description: 'Importez vos contacts existants depuis un fichier CSV en un clic.',
      action: csvImported ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
          <Check className="w-4 h-4" /> Importé
        </span>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importingCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {importingCsv && <Loader2 className="w-4 h-4 animate-spin" />}
            Importer
          </button>
        </>
      ),
      skip: csvImported,
    },
    {
      icon: <Code2 className="w-5 h-5" />,
      title: 'API & Webhooks',
      description: 'Intégrez GetAgenzia avec vos outils via notre API REST et nos webhooks.',
      action: (
        <a
          href="/settings/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Voir la documentation
        </a>
      ),
      skip: false,
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Connectez vos outils</h2>
      <p className="text-gray-500 mb-8">
        Connectez vos services existants pour tirer le meilleur parti de GetAgenzia.
      </p>

      <div className="space-y-4">
        {integrations.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5 transition-colors hover:bg-gray-50"
          >
            <div className="flex-shrink-0 mt-0.5 text-indigo-600">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {item.action}
              {!item.skip && (
                <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Plus tard
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Continuer
        </button>
      </div>
    </div>
  )
}
