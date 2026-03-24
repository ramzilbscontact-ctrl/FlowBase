import type { ReactNode, FC } from 'react'
import type { LucideProps } from 'lucide-react'
import { Plus } from 'lucide-react'

interface PageShellProps {
  /** Page title (h1) */
  title: string
  /** Subtitle / count line */
  subtitle?: string
  /** Icon component from lucide-react */
  icon: FC<LucideProps>
  /** Background color class for the icon container, e.g. "bg-violet-100" */
  iconBg?: string
  /** Icon color class, e.g. "text-violet-600" */
  iconColor?: string
  /** Label for the primary action button */
  actionLabel?: string
  /** Click handler for the primary action button */
  onAction?: () => void
  /** Optional slot above the table (search bar, filters…) */
  toolbar?: ReactNode
  /** Table content (thead + tbody) — will be wrapped in overflow-x-auto */
  children: ReactNode
}

/**
 * Standard page wrapper used by every module list page.
 * Handles: page padding, header row, responsive table scroll, consistent spacing.
 */
export function PageShell({
  title,
  subtitle,
  icon: Icon,
  iconBg = 'bg-violet-100',
  iconColor = 'text-violet-600',
  actionLabel = 'Ajouter',
  onAction,
  toolbar,
  children,
}: PageShellProps) {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {actionLabel}
          </button>
        )}
      </div>

      {/* Optional toolbar (search, filters) */}
      {toolbar && <div>{toolbar}</div>}

      {/* Responsive table card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            {children}
          </table>
        </div>
      </div>
    </div>
  )
}

/** Reusable thead row with consistent styling */
export function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        {cols.map((col, i) => (
          <th
            key={i}
            className={`px-4 py-3 font-semibold text-gray-600 ${i === cols.length - 1 ? 'text-right' : 'text-left'}`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

/** Empty state row spanning all columns */
export function EmptyRow({
  colSpan,
  icon: Icon,
  message,
  hint,
}: {
  colSpan: number
  icon: FC<LucideProps>
  message: string
  hint?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <Icon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="font-medium text-gray-500">{message}</p>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </td>
    </tr>
  )
}

/** Standard tbody row with hover */
export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      {children}
    </tr>
  )
}

/** Colored badge pill */
export function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
