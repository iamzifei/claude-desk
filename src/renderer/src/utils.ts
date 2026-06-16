/** Time-aware greeting, in the spirit of 牛马AI's 「夜深了，安静的时间最适合创作」. */
export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了，安静的时间最适合创作'
  if (h < 9) return '早上好，新的一天开始了'
  if (h < 12) return '上午好，专注做点事吧'
  if (h < 14) return '中午好，先把灵感记下来'
  if (h < 18) return '下午好，继续推进吧'
  if (h < 22) return '晚上好，今天辛苦了'
  return '夜深了，安静的时间最适合创作'
}
