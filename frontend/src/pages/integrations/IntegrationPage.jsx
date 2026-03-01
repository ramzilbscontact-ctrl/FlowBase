import { useQuery, useMutation } from '@tanstack/react-query'
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import api from '../../api/axios'

const integrationsAPI = {
  googleStatus:     () => api.get('/api/integrations/google/status/'),
  googleConnect:    () => api.get('/api/integrations/google/connect/'),
  googleDisconnect: () => api.post('/api/integrations/google/disconnect/'),
}

function IntegCard({ name, icon, description, connected, onConnect, onDisconnect }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <h4 className="font-semibold text-gray-800">{name}</h4>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        {connected
          ? <span className="badge-green flex items-center gap-1"><CheckCircle size={11} /> Connecté</span>
          : <span className="badge-gray flex items-center gap-1"><XCircle size={11} /> Non connecté</span>
        }
      </div>
      <button
        onClick={connected ? onDisconnect : onConnect}
        className={connected ? 'btn-danger text-xs w-full justify-center' : 'btn-primary text-xs w-full justify-center'}
      >
        {connected ? 'Déconnecter' : 'Connecter'}
        {!connected && <ExternalLink size={11} />}
      </button>
    </div>
  )
}

export default function IntegrationsPage() {
  const { data: googleStatus } = useQuery({
    queryKey: ['google-status'],
    queryFn:  () => integrationsAPI.googleStatus().then(r => r.data),
  })

  const connectMut    = useMutation({ mutationFn: () => integrationsAPI.googleConnect(),    onSuccess: (r) => { if (r.data?.auth_url) window.location.href = r.data.auth_url } })
  const disconnectMut = useMutation({ mutationFn: () => integrationsAPI.googleDisconnect() })

  const integrations = [
    { name: 'Google / Gmail', icon: '📧', description: 'Synchronisez vos emails et contacts', connected: googleStatus?.connected, onConnect: () => connectMut.mutate(), onDisconnect: () => disconnectMut.mutate() },
    { name: 'WhatsApp', icon: '💬', description: 'Envoyez des messages WhatsApp', connected: false, onConnect: () => {}, onDisconnect: () => {} },
    { name: 'Instagram', icon: '📸', description: 'Gérez vos messages Instagram', connected: false, onConnect: () => {}, onDisconnect: () => {} },
    { name: 'Stripe', icon: '💳', description: 'Paiements en ligne', connected: false, onConnect: () => {}, onDisconnect: () => {} },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(int => <IntegCard key={int.name} {...int} />)}
      </div>
    </div>
  )
}
