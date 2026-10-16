/** 1234567 → "1,234,567" */
export function num(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** 1234567 → "1,234,567원" */
export function won(n: number): string {
  if (!Number.isFinite(n)) return '-'
  return `${num(Math.round(n))}원`
}

/** 음수에 − 를 붙여 금액 비교가 한눈에 되게 */
export function wonSigned(n: number): string {
  if (!Number.isFinite(n)) return '-'
  const r = Math.round(n)
  return r < 0 ? `−${num(-r)}원` : `${num(r)}원`
}

/** 12.345 → "12.3%" */
export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '-'
  return `${n.toFixed(digits)}%`
}

/** 바이트 → "1.2 MB" */
export function bytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1)
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/** 입력 문자열을 숫자로. 빈 값·쓰레기 값은 0 */
export function toNum(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (!v) return 0
  const n = Number(String(v).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}
