import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from '@/db/db'
import { listBomLines, getCostSettings } from '@/db/repo/bom'
import { listItems } from '@/db/repo/checklist'
import { listPhotos, listPhotosByItem } from '@/db/repo/photos'
import { getScenario } from '@/db/repo/pricing'
import { listProjects } from '@/db/repo/projects'
import { getSettings, listChannels } from '@/db/repo/settings'
import { getInventory, getLabelSpec } from '@/db/repo/tools'
import type { ID } from '@/db/schema'
import { computeCost } from '@/domain/cost'
import { computeAllChannelMargins, type MarginBasis } from '@/domain/margin'
import { computeProgress } from '@/domain/progress'

/*
 * 모든 화면은 useLiveQuery 로 IndexedDB를 구독한다.
 * 어디서 값을 고치든(도구 시트, 설정, 백업 복원) 열려 있는 화면이 알아서 갱신된다.
 */

export const useSettings = () => useLiveQuery(() => getSettings(), [])
export const useProjects = () => useLiveQuery(() => listProjects(), [])
export const useChannels = () => useLiveQuery(() => listChannels(), [])

/**
 * 현재 선택된 프로젝트 id.
 * 설정값이 비었거나 이미 지워진 프로젝트를 가리키면 목록의 첫 번째로 떨어진다.
 */
export function useCurrentProjectId(): ID | undefined {
  const settings = useSettings()
  const projects = useProjects()

  return useMemo(() => {
    if (!projects || projects.length === 0) return undefined
    const saved = settings?.currentProjectId
    if (saved && projects.some((p) => p.id === saved)) return saved
    return projects[0].id
  }, [settings?.currentProjectId, projects])
}

export function useCurrentProject() {
  const id = useCurrentProjectId()
  const projects = useProjects()
  return useMemo(() => projects?.find((p) => p.id === id), [projects, id])
}

export const useChecklist = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? listItems(projectId) : Promise.resolve([])), [projectId])

export const usePhotos = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? listPhotos(projectId) : Promise.resolve([])), [projectId])

export const useItemPhotos = (itemId: ID | undefined) =>
  useLiveQuery(() => (itemId ? listPhotosByItem(itemId) : Promise.resolve([])), [itemId])

export const useBomLines = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? listBomLines(projectId) : Promise.resolve([])), [projectId])

export const useCostSettings = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? getCostSettings(projectId) : Promise.resolve(undefined)), [
    projectId,
  ])

export const useScenario = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? getScenario(projectId) : Promise.resolve(undefined)), [projectId])

export const useInventory = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? getInventory(projectId) : Promise.resolve(undefined)), [projectId])

export const useLabelSpec = (projectId: ID | undefined) =>
  useLiveQuery(() => (projectId ? getLabelSpec(projectId) : Promise.resolve(undefined)), [projectId])

/** 체크리스트 진행률 */
export function useProgress(projectId: ID | undefined) {
  const items = useChecklist(projectId)
  return useMemo(() => computeProgress(items ?? []), [items])
}

/** 제조원가 A */
export function useCostBreakdown(projectId: ID | undefined) {
  const lines = useBomLines(projectId)
  const settings = useCostSettings(projectId)
  return useMemo(
    () => computeCost(lines ?? [], settings?.lossRatePct ?? 0),
    [lines, settings?.lossRatePct],
  )
}

/** 채널별 마진 비교 — 원가·시나리오·채널 요율을 한 번에 엮는다 */
export function useChannelMargins(projectId: ID | undefined) {
  const cost = useCostBreakdown(projectId)
  const costSettings = useCostSettings(projectId)
  const scenario = useScenario(projectId)
  const channels = useChannels()

  const basis: MarginBasis = useMemo(
    () => ({
      unitCost: cost.total,
      sellingPrice: scenario?.sellingPrice ?? 0,
      shippingChargedToCustomer: scenario?.shippingChargedToCustomer ?? 0,
      shippingActualCost: scenario?.shippingActualCost ?? 0,
      otherVariablePerUnit: scenario?.otherVariablePerUnit ?? 0,
      vatMode: costSettings?.vatMode ?? 'included',
    }),
    [cost.total, scenario, costSettings?.vatMode],
  )

  const results = useMemo(
    () => computeAllChannelMargins(channels ?? [], scenario, basis),
    [channels, scenario, basis],
  )

  return { results, basis, cost, scenario, channels: channels ?? [] }
}

/** 프로젝트별 체크리스트를 한 번에 — 홈 브리핑용 */
export function useAllChecklists() {
  return useLiveQuery(async () => {
    const rows = await db.checklistItems.toArray()
    const map = new Map<ID, typeof rows>()
    for (const r of rows) {
      const list = map.get(r.projectId)
      if (list) list.push(r)
      else map.set(r.projectId, [r])
    }
    return map
  }, [])
}

/* ───────────────────────── Blob 미리보기 ───────────────────────── */

/** Blob을 <img src>로 쓸 수 있는 URL로. 언마운트 시 반드시 해제한다. */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}
