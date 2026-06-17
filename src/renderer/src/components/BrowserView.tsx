import { JSX, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, Sparkles, Square, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import type { WebviewEl } from '../webview'
import type { PageElement, BrowserAction } from '../types'

// Injected into the page: label interactive elements + return a compact list.
const EXTRACT_JS = `(function(){
  const sel='a,button,input,textarea,select,[role="button"],[onclick]';
  const els=[...document.querySelectorAll(sel)]; const out=[]; let i=0;
  for(const el of els){
    const r=el.getBoundingClientRect();
    if(r.width<3||r.height<3) continue;
    if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) continue;
    const st=getComputedStyle(el);
    if(st.visibility==='hidden'||st.display==='none'||+st.opacity===0) continue;
    el.setAttribute('data-cda-idx', String(i));
    const t=(el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.value||el.innerText||el.alt||'').trim().replace(/\\s+/g,' ');
    out.push({index:i, tag:el.tagName.toLowerCase(), text:t});
    i++; if(i>=80) break;
  }
  return out;
})()`

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const normalizeUrl = (u: string): string =>
  /^https?:\/\//.test(u) ? u : /^[\w-]+(\.[\w-]+)+/.test(u) ? `https://${u}` : `https://www.bing.com/search?q=${encodeURIComponent(u)}`

export function BrowserView(): JSX.Element {
  const ref = useRef<WebviewEl | null>(null)
  const runningRef = useRef(false)
  const [addr, setAddr] = useState('')
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<{ kind: 'think' | 'act' | 'done' | 'err'; text: string }[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    const onNav = (): void => setAddr(wv.getURL())
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    return () => {
      wv.removeEventListener('did-navigate', onNav)
      wv.removeEventListener('did-navigate-in-page', onNav)
    }
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  const wv = (): WebviewEl => ref.current as WebviewEl
  const push = (kind: 'think' | 'act' | 'done' | 'err', text: string): void =>
    setLog((l) => [...l, { kind, text }])

  const go = (u: string): void => {
    const url = normalizeUrl(u.trim())
    setAddr(url)
    wv().loadURL(url)
  }

  const capture = async (): Promise<string> => {
    const img = await wv().capturePage()
    return img.toDataURL().split(',')[1]
  }
  const extract = async (): Promise<PageElement[]> =>
    (await wv().executeJavaScript(EXTRACT_JS, true)) as PageElement[]

  const exec = async (a: BrowserAction): Promise<void> => {
    if (a.action === 'navigate' && a.url) {
      go(a.url)
      await delay(2000)
    } else if (a.action === 'click' && a.index != null) {
      await wv().executeJavaScript(
        `(()=>{const el=document.querySelector('[data-cda-idx="${a.index}"]'); if(el){el.scrollIntoView({block:'center'}); el.click(); return true} return false})()`,
        true
      )
      await delay(1500)
    } else if (a.action === 'type' && a.index != null) {
      await wv().executeJavaScript(
        `(()=>{const el=document.querySelector('[data-cda-idx="${a.index}"]'); if(el){el.focus(); el.value=${JSON.stringify(
          a.text ?? ''
        )}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true} return false})()`,
        true
      )
      await delay(400)
    } else if (a.action === 'scroll') {
      await wv().executeJavaScript('window.scrollBy(0, Math.round(innerHeight*0.8))', true)
      await delay(500)
    }
  }

  const run = async (): Promise<void> => {
    if (!task.trim() || running) return
    setLog([])
    setRunning(true)
    runningRef.current = true
    const history: string[] = []
    try {
      for (let step = 0; step < 12 && runningRef.current; step++) {
        await delay(600)
        const b64 = await capture()
        const elements = await extract()
        push('think', `第 ${step + 1} 步：分析页面（${elements.length} 个可交互元素）…`)
        const a = await window.api.browser.decide(task, history, b64, wv().getURL(), elements)
        if (!runningRef.current) break
        if (a.action === 'done') {
          push('done', a.answer || '完成')
          break
        }
        const desc =
          a.action === 'navigate'
            ? `打开 ${a.url}`
            : a.action === 'click'
              ? `点击 [${a.index}]`
              : a.action === 'type'
                ? `在 [${a.index}] 输入「${a.text}」`
                : '向下滚动'
        push('act', `${a.thought} → ${desc}`)
        history.push(`${a.action} ${a.index ?? ''} ${a.text ?? a.url ?? ''}`.trim())
        await exec(a)
      }
    } catch (e) {
      push('err', `出错：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      runningRef.current = false
      setRunning(false)
    }
  }

  const stop = (): void => {
    runningRef.current = false
    setRunning(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* URL toolbar */}
      <div className="flex items-center gap-1.5 border-b border-border-soft px-3 py-2">
        <Button size="icon-sm" variant="ghost" onClick={() => wv().goBack()} title="后退">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => wv().goForward()} title="前进">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => wv().reload()} title="刷新">
          <RotateCw className="h-4 w-4" />
        </Button>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go(addr)}
          placeholder="输入网址或搜索内容，回车打开"
          className="h-8 flex-1 rounded-full border border-input bg-background px-3.5 text-[13px] outline-none focus-visible:border-ring"
        />
      </div>

      {/* Embedded browser */}
      <div className="relative min-h-0 flex-1 bg-white">
        <webview ref={ref as never} src="about:blank" className="absolute inset-0 h-full w-full" />
      </div>

      {/* Agent bar */}
      <div className="border-t border-border-soft">
        {log.length > 0 ? (
          <div ref={logRef} className="max-h-32 space-y-1 overflow-y-auto px-4 py-2.5 text-[12.5px]">
            {log.map((l, i) => (
              <div
                key={i}
                className={cn(
                  'leading-snug',
                  l.kind === 'done'
                    ? 'font-medium text-primary'
                    : l.kind === 'err'
                      ? 'text-destructive'
                      : l.kind === 'think'
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                )}
              >
                {l.kind === 'done' ? '✓ ' : l.kind === 'act' ? '› ' : ''}
                {l.text}
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="给 AI 一个浏览任务，如「在 bing 搜索 Anthropic 并打开官网」"
            disabled={running}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring disabled:opacity-60"
          />
          {running ? (
            <Button variant="secondary" onClick={stop}>
              <Square className="h-3.5 w-3.5 fill-current" /> 停止
            </Button>
          ) : (
            <Button onClick={run} disabled={!task.trim()}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              运行
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
