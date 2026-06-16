import { JSX, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useStore } from '../store'
import type { ProviderInfo } from '../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fieldCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring'

export function SettingsModal({ open, onOpenChange }: Props): JSX.Element {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setSaved(false)
    Promise.all([window.api.settings.getProviders(), window.api.settings.get()]).then(
      ([provs, settings]) => {
        setProviders(provs)
        setProvider(settings.provider)
        setModel(settings.model)
        setHasApiKey(settings.hasApiKey)
        setApiKey('')
      }
    )
  }, [open])

  const current = providers.find((p) => p.id === provider)

  const save = async (): Promise<void> => {
    const patch: Record<string, string> = { provider, model }
    if (apiKey.trim()) patch.apiKey = apiKey.trim()
    const next = await window.api.settings.set(patch)
    useStore.setState({ hasApiKey: next.hasApiKey, globalModel: next.model })
    setSaved(true)
    setTimeout(() => onOpenChange(false), 450)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">供应商</span>
            <select
              className={fieldCls}
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

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">模型</span>
            <input
              list="model-options"
              className={fieldCls}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="claude-opus-4-8"
            />
            <datalist id="model-options">
              {current?.models.map((m) => <option key={m} value={m} />)}
            </datalist>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              API key {hasApiKey ? '（已设置，留空保持不变）' : ''}
            </span>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? '••••••••' : '粘贴你的供应商 API key'}
            />
          </label>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            密钥经系统钥匙串（Electron safeStorage）加密存储，仅用于从本机直连供应商。
          </p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save}>{saved ? '已保存' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
