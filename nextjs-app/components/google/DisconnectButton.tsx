'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DisconnectButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDisconnect() {
    setLoading(true)
    try {
      await fetch('/api/google/disconnect', { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDisconnect}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
    >
      {loading ? 'Déconnexion...' : 'Déconnecter'}
    </button>
  )
}
