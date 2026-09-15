import type { ReactNode } from 'react'

export function Panel({
  title,
  subtitle,
  children,
  accent = 'teal',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  accent?: 'teal' | 'sky' | 'amber'
}) {
  const bar =
    accent === 'sky' ? 'from-accent-2/80' : accent === 'amber' ? 'from-warn/80' : 'from-accent/80'

  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-line bg-panel/80 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className={`h-1 bg-gradient-to-r ${bar} to-transparent`} />
      <div className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-text">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/20'

export const btnPrimary =
  'inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'

export const btnSecondary =
  'inline-flex items-center justify-center rounded-xl border border-line bg-panel-2 px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50'
