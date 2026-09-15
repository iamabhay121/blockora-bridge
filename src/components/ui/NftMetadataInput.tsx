import { useRef, useState } from 'react'
import { Field, inputClass, btnSecondary } from './Panel'

type Mode = 'url' | 'upload'

type Props = {
  value: string
  onChange: (value: string) => void
  onStatus?: (msg: string, kind: 'info' | 'success' | 'error') => void
  /** Hedera on-chain metadata is limited to 100 bytes; ETH tokenURI is not. */
  hederaLimit?: boolean
  label?: string
}

/**
 * NFT metadata input: paste a URL/URI, or upload a .json file.
 * Large files are hosted via POST /api/nft-metadata and the returned URL is used.
 */
export function NftMetadataInput({
  value,
  onChange,
  onStatus,
  hederaLimit = false,
  label = 'Metadata / URI',
}: Props) {
  const [mode, setMode] = useState<Mode>('url')
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const applyUpload = async (file: File) => {
    setUploading(true)
    setFileName(file.name)
    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('File is not valid JSON')
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('JSON root must be an object (e.g. { "name": "…", "image": "…" })')
      }

      const compact = JSON.stringify(parsed)
      const compactBytes = new TextEncoder().encode(compact).length

      // Prefer embedding tiny JSON on-chain (Hedera) when it fits
      if (hederaLimit && compactBytes <= 100) {
        onChange(compact)
        setPreview(compact)
        onStatus?.(`Loaded ${file.name} (${compactBytes} bytes) as on-chain metadata`, 'success')
        return
      }

      // Otherwise host JSON on the API and use the URL as metadata / tokenURI
      const res = await fetch('/api/nft-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: parsed, filename: file.name }),
      })
      const data = (await res.json()) as { url?: string; bytes?: number; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to upload metadata')
      }

      if (hederaLimit && (data.bytes ?? data.url.length) > 100) {
        throw new Error(
          `Hosted metadata URL is ${data.bytes ?? data.url.length} bytes — Hedera allows max 100. Use a shorter public URL (e.g. ipfs://…) or a tiny JSON file.`,
        )
      }

      onChange(data.url)
      setPreview(JSON.stringify(parsed, null, 2))
      onStatus?.(
        hederaLimit
          ? `Uploaded ${file.name}. Using hosted URL as metadata (${data.bytes} bytes).`
          : `Uploaded ${file.name}. Token URI set to hosted JSON.`,
        'success',
      )
    } catch (e) {
      setFileName(null)
      setPreview(null)
      onStatus?.(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        <div className="inline-flex rounded-full border border-line bg-panel-2 p-0.5">
          {(
            [
              { id: 'url' as const, label: 'URL / URI' },
              { id: 'upload' as const, label: 'Upload JSON' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                mode === t.id ? 'bg-accent text-ink' : 'text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'url' ? (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setFileName(null)
            setPreview(null)
          }}
          placeholder={hederaLimit ? 'ipfs://… or short JSON (≤100 bytes)' : 'ipfs://… or https://…/metadata.json'}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="block w-full max-w-md text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void applyUpload(file)
              }}
            />
            <button
              type="button"
              className={btnSecondary}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Choose file'}
            </button>
          </div>
          {fileName && (
            <p className="text-xs text-muted">
              File: <span className="text-text">{fileName}</span>
              {value && (
                <>
                  {' '}
                  → <span className="break-all font-mono text-accent">{value}</span>
                </>
              )}
            </p>
          )}
          {hederaLimit && (
            <p className="text-xs text-muted">
              Hedera stores at most 100 bytes on-chain. Tiny JSON is embedded; larger files are hosted and the short URL
              is written as metadata.
            </p>
          )}
        </div>
      )}

      {preview && mode === 'upload' && (
        <pre className="max-h-40 overflow-auto rounded-xl border border-line bg-ink/60 p-3 font-mono text-xs text-accent-2">
          {preview}
        </pre>
      )}
    </div>
  )
}
