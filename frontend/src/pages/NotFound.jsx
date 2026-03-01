import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Page introuvable</h2>
      <p className="text-gray-400 text-sm mb-6">Cette page n'existe pas.</p>
      <Link to="/" className="btn-primary">Retour au dashboard</Link>
    </div>
  )
}
