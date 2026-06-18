/**
 * Renderer-side platform list for the material platform tag picker and the
 * multi-platform rewrite picker. Mirrors the `id`/`label` of the main-process
 * `platform-presets.ts` (the source of truth for the actual rewrite prompts).
 */
export interface PlatformOption {
  id: string
  label: string
  hint: string
}

export const PLATFORM_OPTIONS: PlatformOption[] = [
  { id: 'xiaohongshu', label: '小红书', hint: '种草口吻 · emoji' },
  { id: 'gongzhonghao', label: '公众号', hint: '深度图文' },
  { id: 'douyin', label: '抖音脚本', hint: '口播 · 强钩子' },
  { id: 'shipinhao', label: '视频号', hint: '温和 · 实用' },
  { id: 'x', label: 'X / 推特', hint: '英文 · 简短' }
]

export const labelForPlatform = (id: string | null | undefined): string =>
  PLATFORM_OPTIONS.find((p) => p.id === id)?.label ?? id ?? ''
