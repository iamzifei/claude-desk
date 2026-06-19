/**
 * Starter templates for the 素材 form. Picking one pre-fills title/content/tags
 * with a small scaffold so a creator captures the *useful structure* of a
 * material (a 金句, a case breakdown, their 人设…) instead of a blank box.
 * Pure data + a tiny applier so it's unit-tested and reused without React.
 */
export interface MaterialTemplate {
  id: string
  label: string
  title: string
  content: string
  tags: string
}

export const MATERIAL_TEMPLATES: MaterialTemplate[] = [
  {
    id: 'quote',
    label: '金句卡',
    title: '',
    content: '金句：\n\n出处 / 场景：\n为什么打动我：',
    tags: '金句'
  },
  {
    id: 'case',
    label: '案例拆解',
    title: '',
    content: '案例：\n钩子：\n做对了什么：\n可复用的点：',
    tags: '案例'
  },
  {
    id: 'persona',
    label: '人设 · 品牌口吻',
    title: '品牌口吻',
    content: '我的语气：\n常用词 / 口头禅：\n绝不说的话：\n参考例句：',
    tags: '人设, 口吻'
  },
  {
    id: 'reader',
    label: '读者画像',
    title: '读者画像',
    content: '是谁：\n痛点：\n喜欢什么：\n反感什么：',
    tags: '读者画像'
  },
  {
    id: 'hook',
    label: '钩子库',
    title: '',
    content: '钩子：\n适用场景：',
    tags: '钩子'
  }
]

export function templateById(id: string): MaterialTemplate | undefined {
  return MATERIAL_TEMPLATES.find((t) => t.id === id)
}
