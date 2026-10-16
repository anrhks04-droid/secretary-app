/**
 * 현장에서 찍은 사진을 저장 가능한 크기로 줄인다.
 *
 * 요즘 폰은 한 장에 5~10MB다. 원본을 그대로 IndexedDB에 넣으면 검수 사진
 * 몇십 장만에 브라우저 저장 한도에 걸리고 백업 JSON도 감당이 안 된다.
 * 그래서 저장 시점에 장변 1600px / JPEG 품질 0.8로 줄이고,
 * 목록용 썸네일(320px)을 따로 만들어 둔다.
 */

export interface ProcessedImage {
  blob: Blob
  thumbBlob: Blob
  width: number
  height: number
  /** 원본 + 썸네일 합산 바이트 */
  bytes: number
}

const MAX_EDGE = 1600
const THUMB_EDGE = 320
const QUALITY = 0.8

interface Source {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  close: () => void
}

async function loadSource(file: Blob): Promise<Source> {
  // createImageBitmap은 EXIF 회전까지 반영해 준다 (세로로 찍은 사진이 눕지 않음)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        close: () => bitmap.close(),
      }
    } catch {
      // 아래 <img> 경로로 폴백
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'))
      el.src = url
    })
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function fit(width: number, height: number, maxEdge: number): { w: number; h: number } {
  const long = Math.max(width, height)
  if (long <= maxEdge) return { w: width, h: height }
  const scale = maxEdge / long
  return { w: Math.round(width * scale), h: Math.round(height * scale) }
}

function render(source: Source, maxEdge: number, quality: number): Promise<Blob> {
  const { w, h } = fit(source.width, source.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.')
  ctx.imageSmoothingQuality = 'high'
  source.draw(ctx, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 변환에 실패했습니다.'))),
      'image/jpeg',
      quality,
    )
  })
}

export async function processImageFile(file: Blob): Promise<ProcessedImage> {
  const source = await loadSource(file)
  try {
    const [blob, thumbBlob] = await Promise.all([
      render(source, MAX_EDGE, QUALITY),
      render(source, THUMB_EDGE, 0.7),
    ])
    const { w, h } = fit(source.width, source.height, MAX_EDGE)
    return { blob, thumbBlob, width: w, height: h, bytes: blob.size + thumbBlob.size }
  } finally {
    source.close()
  }
}

/* ───────────────────────── Blob ↔ data URL (백업용) ───────────────────────── */

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/** 브라우저에 남은 저장 공간 추정치 */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const e = await navigator.storage.estimate()
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
}
