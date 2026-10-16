import type { ISODate } from '@/db/schema'

/** 로컬 기준 오늘 'YYYY-MM-DD' */
export function todayISO(base: Date = new Date()): ISODate {
  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const d = String(base.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM' */
export function thisMonthISO(base: Date = new Date()): string {
  return todayISO(base).slice(0, 7)
}

/** 'YYYY-MM-DD' → 로컬 자정 Date. 잘못된 값이면 null */
export function parseISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/**
 * target − from 일수. 미래면 양수, 과거면 음수.
 * 시차·서머타임 영향을 받지 않도록 자정 기준 날짜 차이로 계산한다.
 */
export function daysUntil(target: string, from: string = todayISO()): number | null {
  const a = parseISODate(from)
  const b = parseISODate(target)
  if (!a || !b) return null
  const MS = 24 * 60 * 60 * 1000
  return Math.round((b.getTime() - a.getTime()) / MS)
}

/** D-12 / D-DAY / D+3 */
export function ddayLabel(target: string, from: string = todayISO()): string | null {
  const diff = daysUntil(target, from)
  if (diff === null) return null
  if (diff === 0) return 'D-DAY'
  return diff > 0 ? `D-${diff}` : `D+${-diff}`
}

/** 2026. 10. 16. (수) */
export function formatDateKo(iso: string): string {
  const dt = parseISODate(iso)
  if (!dt) return ''
  const week = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()]
  return `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}. (${week})`
}

/** 2026. 10. 16. 08:12 */
export function formatDateTimeKo(isoDateTime: string): string {
  const dt = new Date(isoDateTime)
  if (Number.isNaN(dt.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}. ${p(dt.getHours())}:${p(dt.getMinutes())}`
}

/** 오늘로부터 n일 뒤 'YYYY-MM-DD' */
export function addDaysISO(days: number, from: string = todayISO()): ISODate {
  const dt = parseISODate(from)
  if (!dt) return from
  dt.setDate(dt.getDate() + days)
  return todayISO(dt)
}
