import type { Creation, PhaseStatus } from './types'

/**
 * Renderer-side metadata for the 7-phase creation pipeline. Mirrors the
 * canonical definition in src/main/agent/pipeline-util.ts (the main process
 * owns the state machine; the renderer only needs labels/hints for the
 * StepRail and phase screens).
 */
export interface PhaseMeta {
  id: number
  key: string
  label: string
  hint: string
  inputHint: string
}

export const PHASES: PhaseMeta[] = [
  {
    id: 1,
    key: 'topic',
    label: '选题',
    hint: '供需扫描 → 推荐 3 个候选选题，等你确认方向',
    inputHint: '想写的方向 / 领域 / 一句话想法（留空则按人设推荐）'
  },
  {
    id: 2,
    key: 'strategy',
    label: '策略',
    hint: '4D 策略 Brief + 人设维度标注 + 内容大纲',
    inputHint: '确认的选题（如「选 2」），或补充策略要求'
  },
  {
    id: 3,
    key: 'writing',
    label: '写作',
    hint: '按 Brief 出稿：开头三候选 + 全文 + 一轮 8 维自评修订',
    inputHint: '对稿件的额外要求（字数 / 风格 / 必须包含的点），可留空'
  },
  {
    id: 4,
    key: 'humanize',
    label: '去AI味',
    hint: '先审计 AI 痕迹，再改写：白话 + 特写镜头',
    inputHint: '想保留的段落 / 语气说明，可留空'
  },
  {
    id: 5,
    key: 'images',
    label: '配图',
    hint: '定位需要配图的位置，每张给出生成 prompt（脚本形态跳过）',
    inputHint: '图片风格偏好（手绘 / 信息图 / 摄影感…），可留空'
  },
  {
    id: 6,
    key: 'format',
    label: '排版',
    hint: '多平台版本改写；脚本形态则输出拍摄清单',
    inputHint: '目标平台（小红书 / 公众号 / 知乎…），可留空'
  },
  {
    id: 7,
    key: 'retro',
    label: '复盘',
    hint: '发布后回填数据 → 指标解读 → 本周创作参数',
    inputHint: '粘贴发布数据：阅读 / 点赞 / 收藏 / 转发 / 评论 / 涨粉…'
  }
]

/** Same unlock rule as the main process: all upstream phases hold output/skip. */
export function canRunPhase(c: Creation, phaseId: number): boolean {
  if (c.phases[phaseId]?.status === 'skipped') return false
  for (const p of PHASES) {
    if (p.id >= phaseId) break
    const st = c.phases[p.id]?.status
    if (st !== 'done' && st !== 'stale' && st !== 'skipped') return false
  }
  return true
}

export const STATUS_LABELS: Record<PhaseStatus, string> = {
  pending: '待处理',
  running: '进行中',
  done: '已完成',
  error: '出错',
  stale: '需重跑',
  skipped: '已跳过'
}

/**
 * Character-based usage estimate for a finished phase. The plain streaming
 * path doesn't surface provider token counts, so the UI shows 字数 + a rough
 * token estimate, clearly labelled as an approximation.
 */
export function approxUsage(text: string): { chars: number; approxTokens: number } {
  return { chars: text.length, approxTokens: Math.max(0, Math.round(text.length * 1.1)) }
}
