import { blobToDataUrl, dataUrlToBlob } from '@/lib/image'
import { db, nowISO } from './db'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupFile,
  type BackupPhoto,
  type Photo,
} from './schema'

/**
 * 기기 간 이동·백업용 JSON.
 *
 * 사진은 base64로 들어가 용량이 크게 불어나므로 포함 여부를 고를 수 있게 했다.
 * (사진 제외 백업은 체크 상태·원가·요율만 옮길 때 쓴다.)
 */

export async function exportBackup(includePhotos: boolean): Promise<BackupFile> {
  const [
    projects,
    checklistItems,
    photoRows,
    bomLines,
    costSettings,
    pricingScenarios,
    inventoryParams,
    labelSpecs,
    channels,
    settings,
  ] = await Promise.all([
    db.projects.toArray(),
    db.checklistItems.toArray(),
    db.photos.toArray(),
    db.bomLines.toArray(),
    db.costSettings.toArray(),
    db.pricingScenarios.toArray(),
    db.inventoryParams.toArray(),
    db.labelSpecs.toArray(),
    db.channels.toArray(),
    db.settings.toArray(),
  ])

  const photos: BackupPhoto[] = []
  for (const p of photoRows) {
    const { blob, thumbBlob, ...rest } = p
    photos.push(
      includePhotos
        ? {
            ...rest,
            blobDataUrl: await blobToDataUrl(blob),
            thumbDataUrl: await blobToDataUrl(thumbBlob),
          }
        : rest,
    )
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: nowISO(),
    includesPhotos: includePhotos,
    projects,
    checklistItems,
    photos,
    bomLines,
    costSettings,
    pricingScenarios,
    inventoryParams,
    labelSpecs,
    channels,
    settings,
  }
}

export function backupFileName(): string {
  const ts = nowISO().slice(0, 16).replace(/[-:T]/g, '')
  return `런칭비서_백업_${ts}.json`
}

/** 브라우저에서 바로 내려받기 */
export async function downloadBackup(includePhotos: boolean): Promise<void> {
  const data = await exportBackup(includePhotos)
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName()
  a.click()
  // Safari가 클릭을 처리할 틈을 준 뒤 해제
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/* ───────────────────────── 복원 ───────────────────────── */

export type ImportMode = 'replace' | 'merge'

export interface ImportSummary {
  projects: number
  checklistItems: number
  photos: number
  bomLines: number
  channels: number
  mode: ImportMode
  photosSkipped: boolean
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다. 파일이 손상되었는지 확인해 주세요.')
  }

  const file = data as Partial<BackupFile>
  if (file?.format !== BACKUP_FORMAT) {
    throw new Error('이 앱의 백업 파일이 아닙니다.')
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    throw new Error('더 새로운 버전의 백업 파일입니다. 앱을 먼저 업데이트해 주세요.')
  }
  if (!Array.isArray(file.projects)) {
    throw new Error('백업 파일에 프로젝트 데이터가 없습니다.')
  }

  return file as BackupFile
}

async function restorePhotos(rows: BackupPhoto[]): Promise<{ photos: Photo[]; skipped: boolean }> {
  const photos: Photo[] = []
  let skipped = false

  for (const row of rows) {
    const { blobDataUrl, thumbDataUrl, ...rest } = row
    if (!blobDataUrl || !thumbDataUrl) {
      // 사진 제외 백업 — 메타데이터만 있고 이미지가 없으므로 건너뛴다
      skipped = true
      continue
    }
    photos.push({
      ...rest,
      blob: await dataUrlToBlob(blobDataUrl),
      thumbBlob: await dataUrlToBlob(thumbDataUrl),
    })
  }

  return { photos, skipped }
}

/**
 * replace: 기존 데이터를 모두 지우고 백업 내용으로 덮어쓴다.
 * merge:   같은 id는 백업 값으로 갱신하고, 없는 건 추가한다. 기존 데이터는 지우지 않는다.
 */
export async function importBackup(file: BackupFile, mode: ImportMode): Promise<ImportSummary> {
  const { photos, skipped } = await restorePhotos(file.photos ?? [])

  await db.transaction(
    'rw',
    [db.projects, db.checklistItems, db.photos, db.bomLines, db.costSettings, db.pricingScenarios, db.inventoryParams, db.labelSpecs, db.channels, db.settings],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.projects.clear(),
          db.checklistItems.clear(),
          db.photos.clear(),
          db.bomLines.clear(),
          db.costSettings.clear(),
          db.pricingScenarios.clear(),
          db.inventoryParams.clear(),
          db.labelSpecs.clear(),
          db.channels.clear(),
          db.settings.clear(),
        ])
      }

      await db.projects.bulkPut(file.projects ?? [])
      await db.checklistItems.bulkPut(file.checklistItems ?? [])
      await db.photos.bulkPut(photos)
      await db.bomLines.bulkPut(file.bomLines ?? [])
      await db.costSettings.bulkPut(file.costSettings ?? [])
      await db.pricingScenarios.bulkPut(file.pricingScenarios ?? [])
      await db.inventoryParams.bulkPut(file.inventoryParams ?? [])
      await db.labelSpecs.bulkPut(file.labelSpecs ?? [])
      await db.channels.bulkPut(file.channels ?? [])
      await db.settings.bulkPut(file.settings ?? [])
    },
  )

  return {
    projects: file.projects?.length ?? 0,
    checklistItems: file.checklistItems?.length ?? 0,
    photos: photos.length,
    bomLines: file.bomLines?.length ?? 0,
    channels: file.channels?.length ?? 0,
    mode,
    photosSkipped: skipped,
  }
}

/** 모든 데이터 삭제 (설정 화면의 초기화) */
export async function wipeAll(): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, db.checklistItems, db.photos, db.bomLines, db.costSettings, db.pricingScenarios, db.inventoryParams, db.labelSpecs, db.channels, db.settings],
    async () => {
      await Promise.all([
        db.projects.clear(),
        db.checklistItems.clear(),
        db.photos.clear(),
        db.bomLines.clear(),
        db.costSettings.clear(),
        db.pricingScenarios.clear(),
        db.inventoryParams.clear(),
        db.labelSpecs.clear(),
        db.channels.clear(),
        db.settings.clear(),
      ])
    },
  )
}
