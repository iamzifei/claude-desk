import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, statSync } from 'fs'
import { Writable } from 'stream'

/**
 * Offline ASR via sherpa-onnx + SenseVoice — the same engine and model 牛马AI
 * uses (downloaded from hf-mirror). No API key, no network at inference time.
 * The ~230MB model downloads on first use into userData.
 */
const MIRROR =
  'https://hf-mirror.com/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main'

const modelDir = (): string => join(app.getPath('userData'), 'models', 'sense-voice')
const modelPath = (): string => join(modelDir(), 'model.int8.onnx')
const tokensPath = (): string => join(modelDir(), 'tokens.txt')

export function isModelReady(): boolean {
  try {
    return existsSync(modelPath()) && statSync(modelPath()).size > 10_000_000 && existsSync(tokensPath())
  } catch {
    return false
  }
}

// Lazily constructed; building it loads the model into memory (~hundreds MB).
let recognizer: { createStream: () => unknown; decodeAsync: (s: unknown) => Promise<{ text?: string }> } | null =
  null

async function getRecognizer(): Promise<typeof recognizer> {
  if (recognizer) return recognizer
  const mod = await import('sherpa-onnx-node')
  const sherpa = (mod as { default?: unknown }).default ?? mod
  const OfflineRecognizer = (sherpa as { OfflineRecognizer: new (c: unknown) => typeof recognizer })
    .OfflineRecognizer
  recognizer = new OfflineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      senseVoice: { model: modelPath(), language: '', useInverseTextNormalization: 1 },
      tokens: tokensPath(),
      numThreads: 2,
      provider: 'cpu',
      debug: 0
    }
  })
  return recognizer
}

/** Transcribe 16kHz mono float samples to text. */
export async function transcribePcm(samples: Float32Array, sampleRate: number): Promise<string> {
  if (!isModelReady()) throw new Error('离线模型未下载，请先在设置里下载 SenseVoice 模型。')
  const rec = await getRecognizer()
  if (!rec) throw new Error('离线识别器初始化失败')
  const stream = rec.createStream()
  ;(stream as { acceptWaveform: (w: unknown) => void }).acceptWaveform({ samples, sampleRate })
  const result = await rec.decodeAsync(stream)
  return result.text ?? ''
}

/** Download tokens + the int8 model into userData, reporting progress (0..1). */
export async function downloadModel(onProgress: (pct: number) => void): Promise<void> {
  mkdirSync(modelDir(), { recursive: true })
  await downloadFile(`${MIRROR}/tokens.txt`, tokensPath(), () => {})
  await downloadFile(`${MIRROR}/model.int8.onnx`, modelPath(), onProgress)
}

async function downloadFile(url: string, dest: string, onProgress: (pct: number) => void): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`下载失败 ${res.status}: ${url}`)
  const total = Number(res.headers.get('content-length')) || 0
  let received = 0
  const file = createWriteStream(dest)
  const writable = Writable.toWeb(file)
  const progress = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      received += chunk.byteLength
      if (total) onProgress(received / total)
      ctrl.enqueue(chunk)
    }
  })
  await res.body.pipeThrough(progress).pipeTo(writable)
}

/** Broadcast download progress to renderers. */
export function broadcastModelProgress(pct: number): void {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.webContents.isDestroyed()) w.webContents.send('voice:modelProgress', pct)
  })
}
