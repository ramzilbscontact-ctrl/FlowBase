import { Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotifStore } from '../../store/notifStore'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title }) {
  const { user, logout }   = useAuthStore()
  const { unread, markRead } = useNotifStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notifs */}
        <button
          onClick={markRead}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
            <User size={14} className="text-primary-600" />
          </div>
          {user && (
            <span className="text-sm text-gray-600 font-medium">
              {user.first_name || user.username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
