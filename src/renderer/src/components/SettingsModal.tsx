import { JSX, useEffect, useState } from 'react'
import { useStore } from '../store'
import type { ProviderInfo } from '../types'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props): JSX.Element {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([window.api.settings.getProviders(), window.api.settings.get()]).then(
      ([provs, settings]) => {
        setProviders(provs)
        setProvider(settings.provider)
        setModel(settings.model)
        setHasApiKey(settings.hasApiKey)
      }
    )
  }, [])

  const current = providers.find((p) => p.id === provider)

  const save = async (): Promise<void> => {
    const patch: Record<string, string> = { provider, model }
    if (apiKey.trim()) patch.apiKey = apiKey.trim()
    const next = await window.api.settings.set(patch)
    // Reflect the new key state app-wide so the empty-state hint updates.
    useStore.setState({ hasApiKey: next.hasApiKey })
    setSaved(true)
    setTimeout(onClose, 500)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <label className="field">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value)
              const p = providers.find((x) => x.id === e.target.value)
              if (p) setModel(p.models[0])
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Model</span>
          <input
            list="model-options"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="claude-opus-4-8"
          />
          <datalist id="model-options">
            {current?.models.map((m) => <option key={m} value={m} />)}
          </datalist>
        </label>

        <label className="field">
          <span>API key {hasApiKey ? '(set — leave blank to keep)' : ''}</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? '••••••••' : 'Paste your provider API key'}
          />
        </label>

        <p className="hint">
          Your key is encrypted at rest with the OS keychain (Electron safeStorage) and only ever
          used to call the provider directly from this machine.
        </p>

        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button onClick={save}>{saved ? 'Saved ✓' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
