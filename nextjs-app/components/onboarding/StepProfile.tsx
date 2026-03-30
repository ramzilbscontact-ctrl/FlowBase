'use client'

import { useState } from 'react'
import {
  Megaphone,
  TrendingUp,
  Target,
  Crown,
  MoreHorizontal,
  User,
  Users,
  Building2,
  Building,
} from 'lucide-react'

const roles = [
  { value: 'sales', label: 'Sales', icon: Target },
  { value: 'growth', label: 'Growth', icon: TrendingUp },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'founder', label: 'Founder', icon: Crown },
  { value: 'other', label: 'Autre', icon: MoreHorizontal },
]

const teamSizes = [
  { value: 'solo', label: 'Solo', icon: User },
  { value: '2-5', label: '2-5', icon: Users },
  { value: '6-20', label: '6-20', icon: Building2 },
  { value: '20+', label: '20+', icon: Building },
]

const industries = [
  'SaaS',
  'E-commerce',
  'Agency',
  'Consulting',
  'Finance',
  'Healthcare',
  'Autre',
]

export interface ProfileData {
  fullName: string
  companyName: string
  role: string
  teamSize: string
  industry: string
}

interface StepProfileProps {
  initialData: ProfileData
  onNext: (data: ProfileData) => void
}

export default function StepProfile({ initialData, onNext }: StepProfileProps) {
  const [data, setData] = useState<ProfileData>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({})

  function validate(): boolean {
    const e: typeof errors = {}
    if (!data.fullName.trim()) e.fullName = 'Requis'
    if (!data.companyName.trim()) e.companyName = 'Requis'
    if (!data.role) e.role = 'Choisissez un rôle'
    if (!data.teamSize) e.teamSize = 'Choisissez une taille'
    if (!data.industry) e.industry = 'Choisissez un secteur'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (validate()) onNext(data)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Qui êtes-vous ?</h2>
      <p className="text-gray-500 mb-8">Dites-nous en plus pour personnaliser votre expérience.</p>

      <div className="space-y-6">
        {/* Full name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => setData({ ...data, fullName: e.target.value })}
            placeholder="Jean Dupont"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.fullName ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
        </div>

        {/* Company name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l&apos;entreprise</label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => setData({ ...data, companyName: e.target.value })}
            placeholder="Mon Entreprise SAS"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.companyName ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Votre rôle</label>
          {errors.role && <p className="text-red-500 text-xs mb-2">{errors.role}</p>}
          <div className="grid grid-cols-5 gap-2">
            {roles.map((r) => {
              const Icon = r.icon
              const selected = data.role === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setData({ ...data, role: r.value })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Team size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Taille de l&apos;équipe</label>
          {errors.teamSize && <p className="text-red-500 text-xs mb-2">{errors.teamSize}</p>}
          <div className="grid grid-cols-4 gap-2">
            {teamSizes.map((t) => {
              const Icon = t.icon
              const selected = data.teamSize === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setData({ ...data, teamSize: t.value })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Secteur d&apos;activité</label>
          <select
            value={data.industry}
            onChange={(e) => setData({ ...data, industry: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${
              errors.industry ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <option value="">Sélectionnez un secteur</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
          {errors.industry && <p className="text-red-500 text-xs mt-1">{errors.industry}</p>}
        </div>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="mt-8 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Continuer
      </button>
    </div>
  )
}
