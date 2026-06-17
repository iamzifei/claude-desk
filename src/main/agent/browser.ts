import Anthropic from '@anthropic-ai/sdk'
import { getProvider, DEFAULT_MODEL } from './providers'
import { resolveApiKey, getSetting } from '../db/settings'

export interface PageElement {
  index: number
  tag: string
  text: string
}

export interface BrowserAction {
  thought: string
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'done'
  index?: number
  text?: string
  url?: string
  answer?: string
}

const TOOL: Anthropic.Tool = {
  name: 'browser_action',
  description: 'Choose the single next browser action toward the task.',
  input_schema: {
    type: 'object',
    properties: {
      thought: { type: 'string', description: '一句话说明你为什么这么做' },
      action: {
        type: 'string',
        enum: ['click', 'type', 'navigate', 'scroll', 'done'],
        description: 'click/type 用元素 index；navigate 用 url；scroll 向下滚动；done 表示完成'
      },
      index: { type: 'integer', description: 'click/type 的目标元素 index' },
      text: { type: 'string', description: 'type 时要输入的文字' },
      url: { type: 'string', description: 'navigate 的目标 URL（含 https://）' },
      answer: { type: 'string', description: 'action=done 时给用户的最终回答' }
    },
    required: ['thought', 'action']
  }
}

const SYSTEM = `你是一个浏览器自动化 agent。根据「网页截图」和「可交互元素列表」，朝着用户的任务推进一步。
规则：
- 每次只选一个动作，调用 browser_action 工具。
- click/type 必须用列表里的元素 index。
- 需要去某个网址时优先用 navigate（url 要带 https://）。
- 看不到需要的内容时可以 scroll。
- 任务完成、或已经能回答用户时，用 action=done 并在 answer 里给出结论。
- 最多十几步，尽量高效。`

/** Ask Claude for the next browser action given a screenshot + element list. */
export async function decideBrowserAction(
  task: string,
  history: string[],
  screenshotB64: string,
  url: string,
  elements: PageElement[]
): Promise<BrowserAction> {
  const apiKey = resolveApiKey()
  if (!apiKey) return { thought: '缺少 API key', action: 'done', answer: '请先在设置里配置 API key。' }

  const provider = getProvider(getSetting('provider') ?? 'anthropic')
  const model = getSetting('model') ?? DEFAULT_MODEL
  const client = new Anthropic({ apiKey, baseURL: provider.baseURL })

  const elemText = elements
    .slice(0, 60)
    .map((e) => `[${e.index}] <${e.tag}> ${e.text.slice(0, 80)}`)
    .join('\n')
  const text =
    `任务：${task}\n\n当前网址：${url || '（空白页）'}\n\n可交互元素：\n${elemText || '（无）'}\n\n` +
    (history.length ? `已执行：\n${history.slice(-8).join('\n')}\n\n` : '') +
    '请给出下一步动作。'

  const res = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'browser_action' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: screenshotB64 }
          },
          { type: 'text', text }
        ]
      }
    ]
  })
  const block = res.content.find((b) => b.type === 'tool_use')
  if (block && block.type === 'tool_use') return block.input as BrowserAction
  return { thought: '未能决定', action: 'done', answer: '我没能决定下一步，请换个说法。' }
}
