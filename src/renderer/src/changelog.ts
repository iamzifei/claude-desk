import {
  Sparkles,
  FolderOpen,
  LayoutGrid,
  Star,
  Puzzle,
  Link2,
  Network,
  Rocket,
  type LucideIcon
} from 'lucide-react'

/**
 * Plain-language release notes shown in-app ("更新内容") after a major update.
 * Mirrors the top entry of CHANGELOG.md. Keep it user-facing and desensitized —
 * no internal tech, providers, or company names; just what changed for the user.
 * Icons are SVG (lucide) per project rule — never emoji.
 */
export interface ChangelogEntry {
  version: string // 'x.y.z'
  title: string
  icon: LucideIcon
  items: { icon: LucideIcon; text: string }[]
}

/** The 'x.y' part of a version — what we treat as a "大版本" for the gate. */
export const minorOf = (v: string): string => v.split('.').slice(0, 2).join('.')

// Latest first. The in-app modal shows the entry matching the running version.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.6.0',
    title: '「墨栖」更名「灵犀桌面版」',
    icon: Sparkles,
    items: [
      {
        icon: Rocket,
        text: '全新名字：加入「灵犀」品牌家族——线上版叫灵犀，这里是灵犀桌面版。你的对话、素材、知识库全部原地不动。'
      },
      {
        icon: FolderOpen,
        text: '成稿库：原「发布数据」视图更名为「成稿库」，与灵犀线上版叫法一致，功能不变。'
      },
      {
        icon: Link2,
        text: '灵犀云版直达：没有 API Key？设置页和新手引导里新增云版入口，注册即用。'
      }
    ]
  },
  {
    version: '1.5.0',
    title: '从「聊天工具」升级为「创作工作台」',
    icon: Sparkles,
    items: [
      {
        icon: FolderOpen,
        text: '知识库：接入电脑上的笔记文件夹，在软件里读写、预览，两边自动同步。'
      },
      { icon: LayoutGrid, text: '分屏：对话、知识库、素材等面板自由并排，拖动重排、拉大拉小。' },
      {
        icon: Star,
        text: '收藏夹：常用面板 / 对话 / 技能拖到侧栏收藏，一键打开；技能还能从收藏夹直接拖进对话。'
      },
      { icon: Puzzle, text: '技能：输入「/」挑选并调用技能；自动发现你电脑上已装好的技能。' },
      { icon: Link2, text: '上下文接力：把一个对话的会话编号贴进新对话，接着之前的上下文继续聊。' },
      { icon: Network, text: '知识图谱：把笔记、素材连成一张可缩放、可拖动的网，关系一目了然。' },
      { icon: Rocket, text: '更省心：新增上手引导；启动时自动回到上次打开的项目。' }
    ]
  }
]

/** The changelog entry for the running version's 大版本, if any. */
export function entryForVersion(version: string): ChangelogEntry | null {
  const m = minorOf(version)
  return CHANGELOG.find((e) => minorOf(e.version) === m) ?? null
}
