import { JSX, useEffect, useState } from 'react'
import { ShieldCheck, Sun, Moon, Download, Check, Keyboard, RotateCcw } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import type { ProviderInfo } from '../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import {
  SHORTCUT_ACTIONS,
  ACTION_LABELS,
  eventToAccelerator,
  formatAccelerator,
  type ShortcutAction
} from '../shortcuts'
import { suspendShortcuts } from '../useShortcuts'

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
  const [trEngine, setTrEngine] = useState('cloud')
  const [trBase, setTrBase] = useState('')
  const [trModel, setTrModel] = useState('')
  const [trKey, setTrKey] = useState('')
  const [hasTrKey, setHasTrKey] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [dl, setDl] = useState<number | null>(null)
  const [page, setPage] = useState<'general' | 'shortcuts' | 'voice'>('general')

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
        setTrEngine(settings.transcriptionEngine)
        setTrBase(settings.transcriptionBaseUrl)
        setTrModel(settings.transcriptionModel)
        setHasTrKey(settings.hasTranscriptionKey)
        setTrKey('')
      }
    )
    window.api.voice.localStatus().then((s) => setModelReady(s.ready))
    return window.api.voice.onModelProgress((pct) => setDl(pct))
  }, [open])

  const downloadModel = async (): Promise<void> => {
    setDl(0)
    const res = await window.api.voice.downloadModel()
    setDl(null)
    if (res.ok) setModelReady(true)
    else if (res.error) window.alert(res.error)
  }

  const current = providers.find((p) => p.id === provider)

  const save = async (): Promise<void> => {
    const patch: Record<string, string> = {
      provider,
      model,
      transcriptionEngine: trEngine,
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

  const NAV: { id: typeof page; label: string }[] = [
    { id: 'general', label: '常规' },
    { id: 'shortcuts', label: '快捷键' },
    { id: 'voice', label: '语音转写' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[680px] flex-col overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b border-border-soft px-5 py-3.5">
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* 左侧子页面导航 */}
          <nav className="flex w-[140px] shrink-0 flex-col gap-0.5 border-r border-border-soft p-2">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                  page === n.id
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                {n.label}
              </button>
            ))}
          </nav>

          {/* 右侧内容区，独立滚动 —— 修复设置无法滚动的问题 */}
          <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {page === 'general' ? (
              <>
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
              </>
            ) : page === 'shortcuts' ? (
              <ShortcutsSection />
            ) : (
              <div>
                <div className="mb-2.5 flex gap-1 rounded-lg border border-border p-1">
                  {[
                    { v: 'cloud', label: '云端 API' },
                    { v: 'local', label: '本地离线' }
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setTrEngine(o.v)}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-[13px] transition-colors',
                        trEngine === o.v ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {trEngine === 'cloud' ? (
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
                      OpenAI 兼容的 Whisper 端点即可；未填则回退到 ~/.env 的 OPENAI_API_KEY。也可指向 SiliconFlow 的
                      SenseVoice（有免费额度）。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      本地离线识别（sherpa-onnx + SenseVoice 模型）：完全在本机运行，无需 key、无需联网。
                      首次需下载约 230MB 模型。
                    </p>
                    {modelReady ? (
                      <div className="flex items-center gap-2 text-[13px] text-primary">
                        <Check className="h-4 w-4" /> 模型已就绪
                      </div>
                    ) : dl !== null ? (
                      <div className="space-y-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.round(dl * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">下载中 {Math.round(dl * 100)}%…</div>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={downloadModel}>
                        <Download className="h-4 w-4" /> 下载离线模型（约 230MB）
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-0 border-t border-border-soft px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {page === 'shortcuts' ? '关闭' : '取消'}
          </Button>
          {page !== 'shortcuts' ? (
            <Button onClick={save}>{saved ? '已保存' : '保存'}</Button>
          ) : null}
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

const MODIFIER_TOKENS = ['Mod', 'Alt', 'Shift', 'Control', 'Meta']

function ShortcutsSection(): JSX.Element {
  const shortcuts = useStore((s) => s.shortcuts)
  const setShortcut = useStore((s) => s.setShortcut)
  const resetShortcuts = useStore((s) => s.resetShortcuts)
  const [recording, setRecording] = useState<ShortcutAction | null>(null)

  // While recording, capture the next real chord and bind it.
  useEffect(() => {
    if (!recording) return
    suspendShortcuts(true)
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(null)
        return
      }
      const acc = eventToAccelerator(e)
      const last = acc.split('+').pop() as string
      // Need a real key plus at least one modifier (so it can't hijack typing).
      if (MODIFIER_TOKENS.includes(last)) return
      if (!acc.includes('Mod') && !acc.includes('Alt')) return
      setShortcut(recording, acc)
      setRecording(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      suspendShortcuts(false)
    }
  }, [recording, setShortcut])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Keyboard className="h-3.5 w-3.5" /> 快捷键
        </span>
        <button
          onClick={() => resetShortcuts()}
          className="flex items-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> 恢复默认
        </button>
      </div>
      <div className="rounded-lg border border-border">
        {SHORTCUT_ACTIONS.map((action, i) => (
          <div
            key={action}
            className={cn(
              'flex items-center justify-between px-3 py-2',
              i > 0 && 'border-t border-border-soft'
            )}
          >
            <span className="text-[13px]">{ACTION_LABELS[action]}</span>
            <button
              onClick={() => setRecording((r) => (r === action ? null : action))}
              className={cn(
                'min-w-[84px] rounded-md border px-2.5 py-1 text-center text-[12.5px] transition-colors',
                recording === action
                  ? 'animate-pulse border-primary bg-primary-soft text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {recording === action ? '按下快捷键…' : formatAccelerator(shortcuts[action])}
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        点按右侧按钮再按下组合键即可重绑（需含 ⌘ 或 ⌥）。⌘W、⌘R 等系统组合保留。
      </p>
    </div>
  )
}
