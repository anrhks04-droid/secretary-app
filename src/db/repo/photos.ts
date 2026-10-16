import { processImageFile } from '@/lib/image'
import { db, newId, nowISO } from '../db'
import type { ID, Photo, PhotoKind, Severity } from '../schema'

export interface AddPhotoInput {
  projectId: ID
  itemId?: ID
  kind: PhotoKind
  caption?: string
  defectType?: string
  severity?: Severity
  defectQty?: number
}

/** 카메라/앨범에서 받은 파일을 압축해 저장하고 새 사진 id를 돌려준다 */
export async function addPhoto(file: Blob, input: AddPhotoInput): Promise<ID> {
  const processed = await processImageFile(file)
  const id = newId()

  await db.photos.put({
    id,
    projectId: input.projectId,
    itemId: input.itemId,
    kind: input.kind,
    blob: processed.blob,
    thumbBlob: processed.thumbBlob,
    caption: input.caption ?? '',
    defectType: input.defectType,
    severity: input.severity,
    defectQty: input.defectQty,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    createdAt: nowISO(),
  })

  return id
}

export async function listPhotos(projectId: ID): Promise<Photo[]> {
  const rows = await db.photos.where('projectId').equals(projectId).toArray()
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listPhotosByKind(projectId: ID, kind: PhotoKind): Promise<Photo[]> {
  const rows = await db.photos.where('[projectId+kind]').equals([projectId, kind]).toArray()
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listPhotosByItem(itemId: ID): Promise<Photo[]> {
  const rows = await db.photos.where('itemId').equals(itemId).toArray()
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getPhoto(id: ID): Promise<Photo | undefined> {
  return db.photos.get(id)
}

export async function patchPhoto(id: ID, patch: Partial<Omit<Photo, 'id' | 'blob' | 'thumbBlob'>>) {
  const current = await db.photos.get(id)
  if (!current) return
  await db.photos.put({ ...current, ...patch, id })
}

export async function deletePhoto(id: ID): Promise<void> {
  await db.transaction('rw', db.photos, db.projects, async () => {
    const photo = await db.photos.get(id)
    await db.photos.delete(id)
    // 대표 사진이었다면 프로젝트에서 참조를 끊는다
    if (photo) {
      const project = await db.projects.get(photo.projectId)
      if (project?.coverPhotoId === id) {
        await db.projects.put({ ...project, coverPhotoId: undefined })
      }
    }
  })
}

/** 불량 유형별 집계 — QC 리포트용 */
export interface DefectSummaryRow {
  defectType: string
  count: number
  qty: number
  worst: Severity
}

const SEVERITY_RANK: Record<Severity, number> = { minor: 0, major: 1, critical: 2 }

export function summarizeDefects(photos: Photo[]): DefectSummaryRow[] {
  const map = new Map<string, DefectSummaryRow>()

  for (const p of photos) {
    if (p.kind !== 'defect') continue
    const key = p.defectType || '기타'
    const row = map.get(key) ?? { defectType: key, count: 0, qty: 0, worst: 'minor' }
    row.count += 1
    row.qty += p.defectQty ?? 0
    if (p.severity && SEVERITY_RANK[p.severity] > SEVERITY_RANK[row.worst]) row.worst = p.severity
    map.set(key, row)
  }

  return [...map.values()].sort(
    (a, b) => SEVERITY_RANK[b.worst] - SEVERITY_RANK[a.worst] || b.count - a.count,
  )
}
