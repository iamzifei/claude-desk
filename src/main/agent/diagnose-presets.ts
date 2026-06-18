/**
 * 内容质量工具的提示构造 (content-quality prompts). Pure & dependency-free so
 * the prompt shaping is unit-tested. Two tools:
 *   - 五维内容诊断 (5-dimensional diagnosis) — dontbesilent's dbs-content.
 *   - 去 AI 味 (de-AI-flavor rewrite) — the creators' #1 pain.
 */

/** The five diagnostic dimensions (dbskill dbs-content). */
export const DIAGNOSIS_DIMENSIONS = [
  '文本干净度', // 去 AI 味、用词、说人话
  '封面标题', // 视觉层级、情绪、钩子
  '表达效率', // 核心能否一句话说清,包装是否盖过内容
  '认知差', // 与同行是否有差异,读者是否学到新东西
  'AI 协作流' // 该选题用什么 AI 工作流最高效
] as const

/** Build the {system, prompt} for a structured five-dimensional diagnosis (markdown out). */
export function buildDiagnosePrompt(draft: string): { system: string; prompt: string } {
  const system =
    '你是资深内容操盘手,给创作者的初稿做「五维诊断」。只诊断方向与质量,不替他重写。\n\n' +
    '逐一评估这五个维度,每维给:① 评分(1-5)② 一句话问题 ③ 可执行的改法:\n' +
    DIAGNOSIS_DIMENSIONS.map((d, i) => `${i + 1}. ${d}`).join('\n') +
    '\n\n最后给两行:**第一步行动**(现在就能改的一件事)和 **一句话结论**。\n' +
    '用简洁的 Markdown(小标题 + 列表),不要客套、不要复述原文。'
  const prompt = `请诊断下面这篇初稿:\n\n${draft}`
  return { system, prompt }
}

/** Build the {system, prompt} for a de-AI-flavor rewrite, optionally voiced. */
export function buildDeAIPrompt(
  draft: string,
  voiceContext?: string
): { system: string; prompt: string } {
  const system =
    '你是帮内容创作者「去 AI 味」的改写助手。把下面的文字改成像真人随口说出来的:\n' +
    '- 去掉 AI 腔:排比堆砌、「不仅…而且」、「在这个…的时代」、「让我们一起」、空泛的总分总、为对仗而对仗;\n' +
    '- 多用具体的人、事、数字、细节;短句、口语、有态度;\n' +
    '- 保留原意与信息,只换表达。只输出改写后的成品,不要解释、不要加前后缀。' +
    (voiceContext ? `\n\n请贴合作者本人的语气/人设(参考素材):\n${voiceContext}` : '')
  const prompt = `请「去 AI 味」改写下面这段:\n\n${draft}`
  return { system, prompt }
}
