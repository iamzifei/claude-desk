import { JSX, useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  FolderOpen,
  PenLine,
  MessageSquare,
  LayoutGrid,
  Puzzle,
  type LucideIcon
} from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Logo } from './Logo'
import { Dialog, DialogContent } from './ui/dialog'
import vaultShot from '../assets/onboarding/1-vault.png'
import graphShot from '../assets/onboarding/2-graph.png'
import chatShot from '../assets/onboarding/3-chat.png'
import panesShot from '../assets/onboarding/4-panes.png'
import skillsShot from '../assets/onboarding/5-skills.png'

interface Step {
  icon: LucideIcon
  title: string
  body: string
  image: string
}

// The product's mental model, in the order a new user meets it. Each step pairs
// a real screenshot with a short explanation.
const STEPS: Step[] = [
  {
    icon: FolderOpen,
    title: '项目 = 一个知识库',
    body: '墨栖以项目为中心。左上角的项目切换器用来新建/切换项目；为项目「绑定知识库文件夹」即可直接打开你的 Obsidian vault，在「知识库」里读写真实的 .md 文件——磁盘才是本体，改了会双向同步。',
    image: vaultShot
  },
  {
    icon: PenLine,
    title: '创作流水线',
    body: '侧边栏「创作」是主轴：知识库 → 素材库 → 知识原子 → 标签 / 知识图谱 → 选题库 → 多平台改写 → 发布数据。这些资产都跟随顶部选中的项目过滤，互不串台。图为从对话里的 [[双链]] 自动长出的知识图谱。',
    image: graphShot
  },
  {
    icon: MessageSquare,
    title: '对话与上下文迁移',
    body: '直接开对话创作，标题会按内容自动生成。想把一个对话的上下文带到新对话？复制它的 Session ID（对话菜单里），粘贴进新对话发送，即可引入它的完整历史。空闲片刻还会自动生成「对话回顾」。',
    image: chatShot
  },
  {
    icon: LayoutGrid,
    title: '分屏窗格',
    body: '顶栏布局菜单可切换 单栏 / 两栏 / 三栏 / 四象限。把侧边栏的任意模块或对话拖进工作区即可分屏；拖窗格手柄可重排或拖到侧栏「收藏」，拖分隔条可调尺寸——像终端一样自由平铺。',
    image: panesShot
  },
  {
    icon: Puzzle,
    title: '技能：自动扫描 + / 调用',
    body: '「技能」会自动读取你本机已安装的 Skills（~/.claude/skills 与插件），默认停用。在对话里输入 / 选择技能，或把技能拖进输入框，即可像 Claude Code 一样按需调用（仅本条消息生效）。',
    image: skillsShot
  }
]

/**
 * First-run guided tour. A dependency-free multi-step welcome that walks a new
 * user through the product's workflow. Shown once (persisted via settings.
 * onboarded); reopenable from the sidebar's help button.
 */
export function OnboardingTour(): JSX.Element {
  const open = useStore((s) => s.tourOpen)
  const complete = useStore((s) => s.completeOnboarding)
  const [i, setI] = useState(0)

  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const finish = (): void => {
    void complete()
    setI(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) finish() // closing (Esc / overlay) counts as done
      }}
    >
      <DialogContent className="max-w-lg">
        {/* hero screenshot */}
        <div className="overflow-hidden rounded-xl border border-border-soft bg-muted/40">
          <img
            src={step.image}
            alt={step.title}
            className="block max-h-[260px] w-full object-cover object-top"
          />
        </div>

        <div className="mt-3.5 flex flex-col px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <step.icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <h2 className="text-[16px] font-semibold text-foreground">{step.title}</h2>
            {i === 0 ? (
              <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                <Logo className="h-4 w-4 rounded shadow-sm" /> 墨栖 InkNest
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{step.body}</p>
        </div>

        {/* progress dots */}
        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                k === i
                  ? 'w-5 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={finish}
            className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            跳过
          </button>
          <div className="flex items-center gap-2">
            {i > 0 ? (
              <button
                onClick={() => setI((v) => v - 1)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> 上一步
              </button>
            ) : null}
            {last ? (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Check className="h-3.5 w-3.5" /> 开始使用
              </button>
            ) : (
              <button
                onClick={() => setI((v) => v + 1)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                下一步 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
