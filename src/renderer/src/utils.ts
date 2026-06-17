/** Time-aware, creator-oriented greeting. */
export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了，灵感往往在此刻冒头'
  if (h < 9) return '早上好，今天想创作点什么？'
  if (h < 12) return '上午好，把灵感变成内容吧'
  if (h < 14) return '中午好，先把此刻的想法记下来'
  if (h < 18) return '下午好，继续打磨你的作品'
  if (h < 22) return '晚上好，今天的创作收工了吗'
  return '夜深了，灵感往往在此刻冒头'
}
