import type { ToastState } from '../../hooks/useToast'

export function StatusToast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null

  const color =
    toast.kind === 'success'
      ? 'border-ok/40 bg-ok/10 text-ok'
      : toast.kind === 'error'
        ? 'border-danger/40 bg-danger/10 text-danger'
        : 'border-accent-2/40 bg-accent-2/10 text-accent-2'

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 max-w-md animate-fade-up rounded-xl border px-4 py-3 shadow-xl backdrop-blur ${color}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm leading-relaxed text-text">{toast.message}</p>
        <button type="button" onClick={onClose} className="text-muted hover:text-text">
          ×
        </button>
      </div>
      {toast.linkHref && (
        <a
          href={toast.linkHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          {toast.linkLabel ?? 'View on explorer'}
        </a>
      )}
    </div>
  )
}
