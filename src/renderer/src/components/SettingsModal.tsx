import { JSX, useEffect, useState } from 'react'
import { ShieldCheck, Sun, Moon } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
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
  const [trBase, setTrBase] = useState('')
  const [trModel, setTrModel] = useState('')
  const [trKey, setTrKey] = useState('')
  const [hasTrKey, setHasTrKey] = useState(false)

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
        setTrBase(settings.transcriptionBaseUrl)
        setTrModel(settings.transcriptionModel)
        setHasTrKey(settings.hasTranscriptionKey)
        setTrKey('')
      }
    )
  }, [open])

  const current = providers.find((p) => p.id === provider)

  const save = async (): Promise<void> => {
    const patch: Record<string, string> = {
      provider,
      model,
      transcriptionBaseUrl: trBase.trim(),
      transcriptionModel: trModel.trim()
    }
    if (apiKey.trim()) patch.apiKey = apiKey.trim()
    if (trKey.trim()) patch.transcriptionKey = trKey.trim()
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
          <ThemeToggle />

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

          <div className="border-t border-border-soft pt-3.5">
            <div className="mb-2 text-xs font-medium text-foreground">语音转写</div>
            <div className="space-y-2.5">
              <input
                className={fieldCls}
                value={trBase}
                onChange={(e) => setTrBase(e.target.value)}
                placeholder="转写端点，如 https://api.openai.com/v1"
              />
              <input
                className={fieldCls}
                value={trModel}
                onChange={(e) => setTrModel(e.target.value)}
                placeholder="转写模型，如 whisper-1"
              />
              <Input
                type="password"
                value={trKey}
                onChange={(e) => setTrKey(e.target.value)}
                placeholder={
                  hasTrKey ? '••••••••（已设置，留空保持不变）' : '转写 key（兼容 OpenAI /audio/transcriptions）'
                }
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                OpenAI 兼容的 Whisper 端点即可；未填则回退到环境变量 / ~/.env 的 OPENAI_API_KEY。也可指向
                SiliconFlow 的 SenseVoice（牛马AI 同款模型，有免费额度）。
              </p>
            </div>
          </div>
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

function ThemeToggle(): JSX.Element {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const opts = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon }
  ]
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">外观</span>
      <div className="flex gap-1 rounded-lg border border-border p-1">
        {opts.map((o) => (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] transition-colors',
              theme === o.value
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <o.icon className="h-3.5 w-3.5" /> {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
