import { CHANNEL_PRESETS } from '@/data/channelPresets'
import { db, newId, nowISO } from '../db'
import type { AppSettings, ChannelRate, ID } from '../schema'

const SETTINGS_ID = 'app'

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  currentProjectId: undefined,
  companyName: '',
  defaultAssignee: '',
  rateNoticeDismissed: false,
  updatedAt: '',
}

export async function getSettings(): Promise<AppSettings> {
  return (await db.settings.get(SETTINGS_ID)) ?? DEFAULT_SETTINGS
}

export async function patchSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID, updatedAt: nowISO() })
}

export async function setCurrentProject(projectId: ID | undefined): Promise<void> {
  await patchSettings({ currentProjectId: projectId })
}

/* ───────────────────────── 판매 채널 ───────────────────────── */

export async function listChannels(): Promise<ChannelRate[]> {
  const rows = await db.channels.toArray()
  return rows.sort((a, b) => a.order - b.order)
}

export async function putChannel(channel: ChannelRate): Promise<void> {
  await db.channels.put(channel)
}

export async function patchChannel(id: ID, patch: Partial<ChannelRate>): Promise<void> {
  const current = await db.channels.get(id)
  if (!current) return
  await db.channels.put({ ...current, ...patch, id })
}

export async function addCustomChannel(name: string): Promise<ID> {
  const max = (await db.channels.toArray()).reduce((m, c) => Math.max(m, c.order), 0)
  const id = newId()
  await db.channels.put({
    id,
    name,
    feePct: 0,
    fixedFeePerOrder: 0,
    fulfillmentPerUnit: 0,
    isBuiltin: false,
    // 직접 만든 채널은 사용자가 요율을 직접 넣으므로 바로 확정 상태
    confirmed: true,
    note: '',
    order: max + 10,
  })
  return id
}

export async function deleteChannel(id: ID): Promise<void> {
  await db.channels.delete(id)
}

/** 기본 프리셋으로 되돌린다 (직접 추가한 채널은 유지) */
export async function resetBuiltinChannels(): Promise<void> {
  await db.transaction('rw', db.channels, async () => {
    for (const preset of CHANNEL_PRESETS) {
      await db.channels.put({ ...preset })
    }
  })
}

/* ───────────────────────── 최초 실행 시드 ───────────────────────── */

/**
 * 앱이 처음 열릴 때 한 번 호출. 채널 프리셋과 설정 싱글턴을 깔아 둔다.
 * 이미 있으면 덮어쓰지 않는다 — 사용자가 고친 요율이 날아가면 안 되므로.
 */
export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.channels, db.settings, async () => {
    if ((await db.channels.count()) === 0) {
      await db.channels.bulkPut(CHANNEL_PRESETS.map((c) => ({ ...c })))
    }
    if (!(await db.settings.get(SETTINGS_ID))) {
      await db.settings.put({ ...DEFAULT_SETTINGS, updatedAt: nowISO() })
    }
  })
}
