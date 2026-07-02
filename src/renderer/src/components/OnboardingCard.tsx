import { JSX, useEffect, useState } from 'react'
import { Sparkles, Loader2, Hand, Lock } from 'lucide-react'
import { useStore } from '../store'
import { Button } from './ui/button'

/** First-run nudge: offers to seed sample data so the app isn't blank. */
export function OnboardingCard(): JSX.Element | null {
  const ws = useStore((s) => s.activeWorkspaceId)
  const setView = useStore((s) => s.setView)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.materials.list().then((m) => setShow(m.length === 0))
  }, [])

  if (!show) return null

  const seed = async (): Promise<void> => {
    if (!ws) return
    setLoading(true)
    await window.api.app.seedSample(ws)
    setLoading(false)
    setShow(false)
    setView('graph') // land on the populated knowledge graph
  }

  return (
    <div className="mb-6 w-full max-w-md rounded-2xl border border-primary/30 bg-primary-soft/50 p-5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-[15px] font-semibold text-foreground">
        <Hand className="h-4 w-4 text-primary" strokeWidth={1.75} /> 第一次用灵犀桌面版?
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        内容创作者的资产工作台:沉淀素材 → 拆原子 → 选题装配成稿 → 多平台改写发布 → 数据反哺选题。
        载入一份示例数据,边看边懂。
      </p>
      <p className="mt-2 flex items-start justify-center gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground/80">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>
          你的素材、原子、选题等全部存在本机,不上传云端;仅生成内容时把必要文本发往你配置的模型。
        </span>
      </p>
      <div className="mt-3.5 flex justify-center gap-2">
        <Button onClick={seed} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          载入示例数据
        </Button>
        <Button variant="secondary" onClick={() => setShow(false)}>
          跳过
        </Button>
      </div>
    </div>
  )
}
