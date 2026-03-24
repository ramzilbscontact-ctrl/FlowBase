import { Calendar, Plus, AlertTriangle } from 'lucide-react'

export default function CalendarPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Calendrier</h1>
            <p className="text-sm text-gray-500">Planification et événements</p>
          </div>
        </div>
        <button
          disabled
          className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Module calendrier en cours de développement</p>
          <p className="text-xs text-amber-600 mt-1">
            Ce module sera disponible dans une prochaine phase. Il permettra de gérer les rendez-vous,
            réunions et événements liés aux contacts, employés et opportunités.
          </p>
        </div>
      </div>

      {/* Placeholder calendar grid */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-40 pointer-events-none">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-gray-600">Vue mensuelle</p>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-400 border-b border-gray-200">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div key={d} className="py-2 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 p-1 text-xs text-gray-300">{i + 1 <= 31 ? i + 1 : ''}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
