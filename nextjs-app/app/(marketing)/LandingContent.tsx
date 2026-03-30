'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Scroll-reveal hook                                                 */
/* ------------------------------------------------------------------ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return { ref, visible }
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              Get<span className="text-indigo-600">Agenzia</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#integrations"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Integrations
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Start Free
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#pricing" className="block text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <a href="#integrations" className="block text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileOpen(false)}>
              Integrations
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            >
              Start Free &rarr;
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Subtle gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-white to-white -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-violet-100/40 to-transparent rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Propulse par l&apos;IA
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                Le CRM intelligent qui{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                  close vos deals
                </span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg">
                Pipeline AI-powered, integrations natives, et assistant
                intelligent. Gratuit pour commencer.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Commencer gratuitement
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Voir la demo
                  <span aria-hidden="true">&darr;</span>
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right — dashboard mockup */}
          <Reveal delay={400}>
            <div className="relative">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-gray-200/60 p-1 overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-t-xl border-b border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 h-5 bg-gray-100 rounded-md" />
                </div>

                {/* Fake dashboard */}
                <div className="p-4 space-y-4 bg-gray-50/50">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Deals actifs', value: '47', color: 'text-indigo-600' },
                      { label: 'Revenue MRR', value: '24.8K', color: 'text-emerald-600' },
                      { label: 'Taux close', value: '68%', color: 'text-violet-600' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-white rounded-lg p-3 border border-gray-100"
                      >
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className={`text-xl font-bold ${stat.color} mt-0.5`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Kanban preview */}
                  <div className="grid grid-cols-3 gap-2">
                    {['Prospection', 'Negotiation', 'Closing'].map((col, i) => (
                      <div key={col} className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 px-1">
                          {col}
                        </p>
                        {Array.from({ length: 3 - i }).map((_, j) => (
                          <div
                            key={j}
                            className="bg-white rounded-lg p-2.5 border border-gray-100 shadow-sm"
                          >
                            <div className="h-2 w-3/4 bg-gray-200 rounded" />
                            <div className="h-2 w-1/2 bg-gray-100 rounded mt-1.5" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* AI chip */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg p-3 border border-indigo-100">
                    <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-indigo-900 truncate">
                        IA: &quot;3 deals a forte probabilite de close cette semaine&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Deal clos!</p>
                  <p className="text-xs text-gray-500">+12 400 EUR</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Social Proof                                                       */
/* ------------------------------------------------------------------ */
function SocialProof() {
  const logos = ['TechCorp', 'Nexus', 'Acme', 'DataFlow', 'CloudRun', 'Vertex']
  return (
    <section className="py-12 border-y border-gray-100 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-sm text-gray-500 mb-8">
            Utilise par <span className="font-semibold text-gray-700">200+</span>{' '}
            equipes commerciales
          </p>
        </Reveal>
        <Reveal delay={100}>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {logos.map((name) => (
              <span
                key={name}
                className="text-lg font-bold text-gray-300 hover:text-gray-400 transition-colors select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features Bento Grid                                                */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: 'Assistant IA',
    desc: 'Analysez votre pipeline, redigez des emails, predisez vos closes.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: 'Pipeline Visuel',
    desc: 'Kanban drag & drop, scoring automatique, alertes intelligentes.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
    title: '50+ Integrations',
    desc: 'Google, Notion, n8n, Make, Apollo, Clay et plus.',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
    title: 'Email & Calendar',
    desc: 'Gmail et Google Calendar integres nativement.',
    gradient: 'from-emerald-500 to-teal-500',
  },
]

function Features() {
  return (
    <section id="features" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
              Fonctionnalites
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Tout ce qu&apos;il vous faut pour closer
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Un CRM complet avec l&apos;intelligence artificielle integree a chaque
              etape de votre pipeline commercial.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 cursor-default">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4`}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */
const steps = [
  {
    num: '1',
    title: 'Creez votre compte',
    desc: '30 secondes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    num: '2',
    title: 'Connectez vos outils',
    desc: '1 clic',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
  {
    num: '3',
    title: "L'IA fait le reste",
    desc: 'automatique',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
]

function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-gray-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
              Comment ca marche
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Pret en 3 etapes
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i * 150}>
              <div className="relative text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-indigo-600 mb-5">
                  {s.icon}
                </div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Etape {s.num}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mt-1">
                  {s.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Integrations anchor                                                */
/* ------------------------------------------------------------------ */
function Integrations() {
  const tools = [
    'Google Workspace',
    'Notion',
    'n8n',
    'Make',
    'Apollo',
    'Clay',
    'Slack',
    'Zapier',
  ]
  return (
    <section id="integrations" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
              Integrations
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Connectez vos outils favoris
            </h2>
            <p className="mt-4 text-gray-600 max-w-xl mx-auto">
              Plus de 50 integrations natives pour centraliser votre stack commercial.
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="flex flex-wrap justify-center gap-3">
            {tools.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */
const plans = [
  {
    name: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'Pour demarrer gratuitement',
    features: [
      '100 contacts',
      '50 AI tokens/jour',
      '1 utilisateur',
      'Email support',
    ],
    cta: 'Commencer',
    popular: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 23,
    desc: 'Pour les equipes en croissance',
    features: [
      '10 000 contacts',
      '500 AI tokens/jour',
      '5 utilisateurs',
      'API access',
      'Priority support',
    ],
    cta: 'Essayer Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 79,
    annualPrice: 63,
    desc: 'Pour les grandes equipes',
    features: [
      'Contacts illimites',
      'AI illimite',
      'Utilisateurs illimites',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contacter',
    popular: false,
  },
]

function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 md:py-28 bg-gray-50/70 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
              Tarifs
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Un plan pour chaque equipe
            </h2>
            <p className="mt-4 text-gray-600">
              Commencez gratuitement, evoluez selon vos besoins.
            </p>
          </div>
        </Reveal>

        {/* Toggle */}
        <Reveal delay={100}>
          <div className="flex items-center justify-center gap-3 mb-12">
            <span
              className={`text-sm font-medium ${
                !annual ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Mensuel
            </span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                annual ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
              aria-label="Toggle annual pricing"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  annual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                annual ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Annuel{' '}
              <span className="text-xs text-emerald-600 font-semibold">-20%</span>
            </span>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice
            return (
              <Reveal key={plan.name} delay={i * 100}>
                <div
                  className={`relative rounded-2xl p-6 flex flex-col h-full ${
                    plan.popular
                      ? 'bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-100'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {price === 0 ? 'Gratuit' : `${price}\u20AC`}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-gray-500">/mois</span>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <svg
                          className="w-4 h-4 text-indigo-600 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`inline-flex items-center justify-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-16 sm:px-16 text-center overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />

            <h2 className="relative text-3xl sm:text-4xl font-bold text-white mb-4">
              Pret a closer plus de deals ?
            </h2>
            <p className="relative text-indigo-100 mb-8 max-w-md mx-auto">
              Rejoignez les 200+ equipes qui utilisent GetAgenzia pour
              accelerer leur cycle de vente.
            </p>
            <Link
              href="/login"
              className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Commencer gratuitement
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <p className="relative text-sm text-indigo-200 mt-4">
              Pas de carte bancaire requise
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">G</span>
              </div>
              <span className="text-base font-semibold text-gray-900">
                Get<span className="text-indigo-600">Agenzia</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 max-w-xs">
              Le CRM intelligent pour les equipes commerciales modernes.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Produit
            </h4>
            <ul className="space-y-2">
              {['Fonctionnalites', 'Tarifs', 'API Docs', 'Blog'].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {['Mentions legales', 'Confidentialite', 'CGV'].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Social
            </h4>
            <div className="flex gap-3">
              {/* Twitter */}
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              {/* GitHub */}
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            &copy; 2026 GetAgenzia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Composition                                                   */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Integrations />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
