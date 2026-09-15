import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import userGuideMd from '../../../docs/USER_GUIDE.md?raw'
import developerGuideMd from '../../../docs/DEVELOPER_GUIDE.md?raw'

type GuideTab = 'user' | 'developer'

function renderInline(text: string) {
  const parts: Array<string | { href: string; label: string } | { code: string } | { bold: string }> = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push({ bold: token.slice(2, -2) })
    } else if (token.startsWith('`')) {
      parts.push({ code: token.slice(1, -1) })
    } else {
      const m = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (m) parts.push({ href: m[2], label: m[1] })
      else parts.push(token)
    }
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))

  return parts.map((p, i) => {
    if (typeof p === 'string') return <span key={i}>{p}</span>
    if ('bold' in p) return <strong key={i} className="font-semibold text-text">{p.bold}</strong>
    if ('code' in p)
      return (
        <code key={i} className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
          {p.code}
        </code>
      )
    return (
      <a
        key={i}
        href={p.href}
        target="_blank"
        rel="noreferrer"
        className="text-accent underline-offset-2 hover:underline"
      >
        {p.label}
      </a>
    )
  })
}

function GuideBody({ md }: { md: string }) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const buf: string[] = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i += 1
      }
      nodes.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-xl border border-line bg-ink/80 p-3 font-mono text-xs text-accent-2"
        >
          <code>{buf.join('\n')}</code>
          {lang ? <span className="sr-only">{lang}</span> : null}
        </pre>,
      )
      i += 1
      continue
    }

    if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={key++} className="font-display text-2xl font-extrabold tracking-tight text-text">
          {renderInline(line.slice(2))}
        </h1>,
      )
      i += 1
      continue
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="mt-2 border-t border-line pt-4 font-display text-lg font-bold text-accent">
          {renderInline(line.slice(3))}
        </h2>,
      )
      i += 1
      continue
    }
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={key++} className="mt-1 text-sm font-semibold uppercase tracking-wider text-muted">
          {renderInline(line.slice(4))}
        </h3>,
      )
      i += 1
      continue
    }

    if (line.trim() === '---') {
      nodes.push(<hr key={key++} className="border-line/80" />)
      i += 1
      continue
    }

    if (line.startsWith('| ') && lines[i + 1]?.includes('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
        if (!row.every((c) => /^[-:]+$/.test(c))) rows.push(row)
        i += 1
      }
      if (rows.length) {
        const [head, ...body] = rows
        nodes.push(
          <div key={key++} className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-2 text-muted">
                <tr>
                  {head.map((c, ci) => (
                    <th key={ci} className="px-3 py-2 font-semibold">
                      {renderInline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-t border-line">
                    {row.map((c, ci) => (
                      <td key={ci} className="px-3 py-2 align-top text-text">
                        {renderInline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
      }
      continue
    }

    if (/^\d+\.\s/.test(line) || line.startsWith('- ')) {
      const items: string[] = []
      const ordered = /^\d+\.\s/.test(line)
      while (i < lines.length && (ordered ? /^\d+\.\s/.test(lines[i]) : lines[i].startsWith('- '))) {
        items.push(lines[i].replace(/^\d+\.\s/, '').replace(/^- /, ''))
        i += 1
      }
      const Tag = ordered ? 'ol' : 'ul'
      nodes.push(
        <Tag
          key={key++}
          className={`space-y-1.5 pl-5 text-sm text-text ${ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </Tag>,
      )
      continue
    }

    if (line.trim() === '') {
      i += 1
      continue
    }

    nodes.push(
      <p key={key++} className="text-sm leading-relaxed text-muted">
        {renderInline(line)}
      </p>,
    )
    i += 1
  }

  return <div className="space-y-3">{nodes}</div>
}

const TABS: Array<{
  id: GuideTab
  label: string
  blurb: string
  accent: string
}> = [
  {
    id: 'user',
    label: 'User guide',
    blurb: 'Click-by-click steps for Hedera & Ethereum',
    accent: 'border-accent/50 bg-accent/10 text-accent',
  },
  {
    id: 'developer',
    label: 'Developer guide',
    blurb: 'Setup, contracts, scripts & architecture',
    accent: 'border-accent-2/50 bg-accent-2/10 text-accent-2',
  },
]

export function HelpFab() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<GuideTab>('user')
  const titleId = useId()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [tab, open])

  const md = tab === 'user' ? userGuideMd : developerGuideMd

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-ink shadow-[0_12px_40px_rgba(45,212,191,0.45)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/15 text-base font-bold">
          ?
        </span>
        <span className="pr-1 text-sm">Guides</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-ink/75 backdrop-blur-sm"
            aria-label="Close help"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl animate-fade-up flex-col overflow-hidden rounded-t-2xl border border-line bg-panel shadow-2xl sm:mx-4 sm:rounded-2xl"
          >
            <div className="h-1 bg-gradient-to-r from-accent via-accent-2 to-transparent" />

            <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Blockora Bridge</p>
                <h2 id={titleId} className="font-display text-2xl font-extrabold tracking-tight text-text">
                  Guides
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-line px-3 py-1.5 text-sm text-muted transition hover:border-accent/40 hover:text-text"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 sm:px-6">
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? `${t.accent} shadow-[0_0_0_1px_rgba(45,212,191,0.15)]`
                        : 'border-line bg-panel-2/40 text-muted hover:border-line hover:bg-panel-2/70 hover:text-text'
                    }`}
                  >
                    <p className={`font-display text-base font-bold ${active ? '' : 'text-text'}`}>{t.label}</p>
                    <p className={`mt-1 text-xs leading-snug ${active ? 'opacity-90' : 'text-muted'}`}>{t.blurb}</p>
                  </button>
                )
              })}
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-5 sm:px-6">
              <GuideBody md={md} key={tab} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
