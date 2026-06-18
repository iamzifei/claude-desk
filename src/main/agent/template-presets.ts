/**
 * 爆款结构沉淀 (winner → reusable template). Pure prompt construction so it's
 * unit-tested. Given a high-performing publication, reverse-engineer its
 * reusable structure into a creation template (saved as a 技能).
 */
export function buildTemplatePrompt(
  title: string,
  platform?: string | null
): { system: string; prompt: string } {
  const system =
    '你是爆款拆解专家。根据这条表现很好的内容,反推出它可复用的「创作模板」:\n' +
    '① 标题公式(用了什么钩子类型:悬念/利益/反差/数字/身份…)\n' +
    '② 开头 3 秒怎么抓人\n' +
    '③ 主体结构与节奏\n' +
    '④ 结尾 / 行动号召\n' +
    '写成下次照着就能复刻的模板(可带占位符如「{主题}」)。只输出模板正文,不要解释。'
  const prompt = `这条内容表现很好,请拆出它的可复用结构模板:\n标题:${title}${platform ? `\n平台:${platform}` : ''}`
  return { system, prompt }
}
