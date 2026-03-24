'use client'

import type { FC } from 'react'
import type { LucideProps } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: number | string | null | undefined
  icon: FC<LucideProps>
  color?: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'violet'
  hint?: string
}

type ColorKey = NonNullable<StatsCardProps['color']>

const colorMap: Record<
  ColorKey,
  { iconBg: string; iconColor: string; border: string }
> = {
  blue:   { iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   border: 'border-l-blue-500' },
  purple: { iconBg: 'bg-purple-100', iconColor: 'text-purple-600', border: 'border-l-purple-500' },
  green:  { iconBg: 'bg-green-100',  iconColor: 'text-green-600',  border: 'border-l-green-500' },
  yellow: { iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', border: 'border-l-yellow-500' },
  red:    { iconBg: 'bg-red-100',    iconColor: 'text-red-600',    border: 'border-l-red-500' },
  violet: { iconBg: 'bg-violet-100', iconColor: 'text-violet-600', border: 'border-l-violet-500' },
}

export function StatsCard({ label, value, icon: Icon, color = 'violet', hint }: StatsCardProps) {
  const { iconBg, iconColor, border } = colorMap[color]

  return (
    <div
      className={`bg-white border border-gray-200 border-l-4 ${border} rounded-xl p-5 shadow-sm flex items-center gap-4`}
    >
      {/* Icon container */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      {/* Text block */}
      <div className="flex-1">
        <p className="text-2xl font-bold text-gray-900">
          {value == null ? '—' : value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    </div>
  )
}
