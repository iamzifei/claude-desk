/**
 * 格式-选题匹配 (format ↔ topic matching), from dontbesilent's dbs-content table.
 * Given a topic title/angle, recommend the content format + platform that suits
 * it. Pure keyword heuristics — unit-tested.
 */
export interface FormatRec {
  format: string
  platform: string
  reason: string
}

interface Rule {
  test: RegExp
  format: string
  platform: string
  reason: string
}

const RULES: Rule[] = [
  {
    test: /观点|为什么|认知|误区|真相|反常识|其实|别再|99%/,
    format: '短视频口播',
    platform: '抖音 / 视频号',
    reason: '观点/认知冲突类,口播短视频冲突感最强'
  },
  {
    test: /案例|经历|我如何|我靠|月入|赚了|从0到|复盘.*赚/,
    format: '图文 + 短视频',
    platform: '小红书',
    reason: '个人案例,图文种草 + 短视频讲故事双管齐下'
  },
  {
    test: /深度|分析|方法论|体系|框架|全解|万字|拆解/,
    format: '长文 / 长视频',
    platform: '公众号',
    reason: '深度内容,长文/长视频承载信息密度'
  },
  {
    test: /工具|教程|怎么|如何|步骤|清单|攻略|模板|合集|盘点/,
    format: '图文',
    platform: '小红书',
    reason: '工具/教程类,图文卡片最易保存复用'
  },
  {
    test: /争议|吵|对线|battle|开杠|该不该/,
    format: '直播',
    platform: '视频号 / 抖音',
    reason: '争议话题,直播实时互动放大讨论'
  }
]

export function recommendFormat(title: string, angle?: string | null): FormatRec {
  const text = `${title} ${angle ?? ''}`
  for (const r of RULES) {
    if (r.test.test(text)) return { format: r.format, platform: r.platform, reason: r.reason }
  }
  return { format: '图文', platform: '小红书', reason: '默认图文,门槛低、易沉淀' }
}
