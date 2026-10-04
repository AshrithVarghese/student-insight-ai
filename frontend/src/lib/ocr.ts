// Client-side OCR using tesseract.js. Images are processed in the browser and
// never leave the machine. The worker + language data are loaded from the
// tesseract.js CDN on first use (this app already requires internet).

import Tesseract, { type Worker } from 'tesseract.js'

export interface OcrProgress {
  status: string
  progress: number
}

type ProgressListener = (p: OcrProgress) => void

let progressListener: ProgressListener | null = null
let workerPromise: Promise<Worker> | null = null

export function setOcrProgressListener(cb: ProgressListener | null): void {
  progressListener = cb
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng', 1, {
      logger: (message) => {
        progressListener?.({
          status: message.status,
          progress: message.status === 'recognizing text' ? message.progress : 0,
        })
      },
    })
  }
  return workerPromise
}

export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(imageDataUrl)
  return data.text
}