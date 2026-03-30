'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyUrlButtonClient({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
      title="Copier l'URL"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
