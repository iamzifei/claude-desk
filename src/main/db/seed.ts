import { createMaterial } from './materials'
import { createAtom } from './atoms'
import { createTopic } from './topics'
import { createPublication } from './publications'

/**
 * Seed a small, coherent set of sample data so a first-time user immediately
 * sees the features populated (素材库 / 原子 / 标签 / 图谱 / 选题 / 发布数据).
 * Creator-themed (AI / 副业) and deliberately interlinked so the graph shows a
 * real network. Returns the counts created.
 */
export function seedSample(workspaceId: string): { materials: number; atoms: number; topics: number; publications: number } {
  const materials = [
    { title: '读者画像', content: '25-35 岁都市女性,关注用 AI 提效与做副业,反感说教、喜欢真实分享。', tags: '受众' },
    { title: '品牌口吻', content: '真诚、接地气、像朋友分享,不端着、不堆术语。', tags: '人设' },
    { title: 'AI 副业避坑清单', content: '1. 别同时开太多;2. 先验证需求再投入;3. 用时间换钱不可复制,要做能沉淀的。', tags: '副业, 主题/AI' },
    { title: '小红书爆款结构', content: '钩子 + 痛点 + 方案 + 互动引导。可参考 [[AI 副业避坑清单]] 里的要点。', tags: '平台/小红书, 结构' }
  ]
  for (const m of materials) createMaterial({ ...m, kind: 'text', image_path: null })

  const atoms = [
    { content: '先完成,再完美。', type: '金句' as const, tags: '方法' },
    { content: 'AI 能把初稿时间砍掉一半,省下的时间用来打磨观点。', type: '数据' as const, tags: '主题/AI' },
    { content: '副业别一上来就辞职,先用业余时间跑通最小闭环。', type: '方法' as const, tags: '副业' }
  ]
  for (const a of atoms) createAtom(a)

  const topics = [
    { title: '我用 AI 做副业的 3 个月复盘', angle: '个人经历、反常识', platform: 'xiaohongshu' },
    { title: '10 个被低估的 AI 工具', angle: '工具清单', platform: 'gongzhonghao' }
  ]
  for (const t of topics) createTopic(workspaceId, t)

  const pubs = [
    { title: '我靠 AI 接单赚到第一笔 5 万', platform: 'xiaohongshu', views: 180000, likes: 9000, comments: 700, saves: 6200 },
    { title: '今天分享个 AI 小工具', platform: 'gongzhonghao', views: 12000, likes: 400, comments: 60, saves: 520 }
  ]
  for (const p of pubs) createPublication(workspaceId, p)

  return { materials: materials.length, atoms: atoms.length, topics: topics.length, publications: pubs.length }
}
