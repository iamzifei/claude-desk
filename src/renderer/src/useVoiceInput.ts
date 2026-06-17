import { useRef, useState } from 'react'
import { resampleTo16k } from './audio'

interface Capture {
  stop: () => Promise<void>
}

/**
 * Mic → transcription, branching on the configured engine:
 *  - cloud: MediaRecorder (webm) → OpenAI-compatible /audio/transcriptions
 *  - local: Web Audio PCM → sherpa-onnx SenseVoice in the main process
 */
export function useVoiceInput(onText: (t: string) => void): {
  recording: boolean
  transcribing: boolean
  toggle: () => Promise<void>
} {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const capRef = useRef<Capture | null>(null)

  const finishCloud = async (blob: Blob, mime: string): Promise<void> => {
    if (blob.size < 1200) return
    setTranscribing(true)
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      const res = await window.api.voice.transcribe(btoa(bin), mime.split(';')[0])
      if ('text' in res && res.text.trim()) onText(res.text.trim())
      else if ('error' in res) window.alert(res.error)
    } finally {
      setTranscribing(false)
    }
  }

  const finishLocal = async (samples: Float32Array, sampleRate: number): Promise<void> => {
    if (samples.length < 1600) return
    setTranscribing(true)
    try {
      const pcm = resampleTo16k(samples, sampleRate)
      const res = await window.api.voice.transcribeLocal(Array.from(pcm), 16000)
      if ('text' in res && res.text.trim()) onText(res.text.trim())
      else if ('error' in res) window.alert(res.error)
    } finally {
      setTranscribing(false)
    }
  }

  const toggle = async (): Promise<void> => {
    if (recording) {
      await capRef.current?.stop()
      capRef.current = null
      setRecording(false)
      return
    }
    let engine = 'cloud'
    try {
      engine = (await window.api.settings.get()).transcriptionEngine
    } catch {
      /* default cloud */
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (engine === 'local') {
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const proc = ctx.createScriptProcessor(4096, 1, 1)
        const chunks: Float32Array[] = []
        proc.onaudioprocess = (e): void => {
          chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
        }
        source.connect(proc)
        proc.connect(ctx.destination)
        capRef.current = {
          stop: async () => {
            proc.disconnect()
            source.disconnect()
            stream.getTracks().forEach((t) => t.stop())
            const rate = ctx.sampleRate
            await ctx.close()
            const len = chunks.reduce((n, c) => n + c.length, 0)
            const all = new Float32Array(len)
            let o = 0
            for (const c of chunks) {
              all.set(c, o)
              o += c.length
            }
            await finishLocal(all, rate)
          }
        }
      } else {
        const rec = new MediaRecorder(stream)
        const chunks: Blob[] = []
        rec.ondataavailable = (e): void => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        const done = new Promise<void>((resolve) => {
          rec.onstop = async (): Promise<void> => {
            stream.getTracks().forEach((t) => t.stop())
            const mime = rec.mimeType || 'audio/webm'
            await finishCloud(new Blob(chunks, { type: mime }), mime)
            resolve()
          }
        })
        rec.start()
        capRef.current = {
          stop: async () => {
            rec.stop()
            await done
          }
        }
      }
      setRecording(true)
    } catch {
      window.alert('无法访问麦克风，请检查系统权限。')
    }
  }

  return { recording, transcribing, toggle }
}
