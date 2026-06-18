import { runOnce } from './run'
import { getPublication } from '../db/publications'
import { createSkill, toggleSkill, type Skill } from '../db/skills'
import { buildTemplatePrompt } from './template-presets'

const PLAT: Record<string, string> = {
  xiaohongshu: '小红书',
  gongzhonghao: '公众号',
  douyin: '抖音',
  shipinhao: '视频号',
  x: 'X'
}

/** Reverse-engineer a winning publication into a reusable creation template (a 技能, off by default). */
export async function runSaveTemplate(publicationId: string): Promise<Skill> {
  const pub = getPublication(publicationId)
  if (!pub) throw new Error('发布记录不存在')
  const platform = pub.platform ? (PLAT[pub.platform] ?? pub.platform) : null
  const { system, prompt } = buildTemplatePrompt(pub.title, platform)
  const content = await runOnce(
    [{ id: 'tpl', conversation_id: 'tpl', role: 'user', content: prompt, created_at: Date.now() }],
    undefined,
    system
  )
  const skill = createSkill({
    name: `爆款模板·${pub.title.slice(0, 12)}`,
    description: '从爆款发布拆解的可复用结构',
    content,
    source: 'template'
  })
  toggleSkill(skill.id, false) // off by default — enable in 技能 when writing in this style
  return { ...skill, enabled: 0 }
}
