'use client'

const steps = [
  { label: 'Profil' },
  { label: 'Outils' },
  { label: 'Premier deal' },
]

interface ProgressBarProps {
  currentStep: number // 0-indexed
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="mb-10">
      {/* Brand */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">GetAgenzia</h1>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          return (
            <div key={i} className="flex items-center gap-2">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-indigo-600 text-white'
                      : isCurrent
                        ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium ${
                    isCurrent ? 'text-indigo-700' : isCompleted ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mb-5 transition-colors ${
                    i < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
