import { CARE_BY_CODE } from '@/data/careSymbols'
import type { LabelSpec } from '@/db/schema'

/**
 * 법정 한글표시사항(품질표시) 문구 생성.
 *
 * 입력한 항목을 라벨 인쇄용 표준 텍스트 블록으로 조합한다.
 * 이 텍스트를 그대로 복사해 라벨 업체에 넘기거나 상세페이지에 붙일 수 있다.
 *
 * 검증 규칙
 *  - 부위별 혼용률 합계는 100%여야 한다 (가장 흔한 반려 사유)
 *  - 제품명·소재·치수·제조자·제조국·제조연월·A/S 연락처는 필수
 */

export interface LabelValidation {
  /** 반드시 고쳐야 하는 문제 */
  errors: string[]
  /** 확인해 보면 좋은 사항 */
  warnings: string[]
  ok: boolean
}

export interface CompositionByPart {
  part: string
  rows: { material: string; pct: number }[]
  sum: number
  /** 합계 100% 인가 */
  valid: boolean
  /** "면 100%" 같은 한 줄 표기 */
  text: string
}

export function groupComposition(spec: LabelSpec): CompositionByPart[] {
  const order: string[] = []
  const map = new Map<string, { material: string; pct: number }[]>()

  for (const row of spec.composition) {
    const part = (row.part || '').trim() || '소재'
    if (!map.has(part)) {
      map.set(part, [])
      order.push(part)
    }
    map.get(part)!.push({ material: (row.material || '').trim(), pct: Number(row.pct) || 0 })
  }

  return order.map((part) => {
    const rows = map.get(part)!
    const sum = rows.reduce((s, r) => s + r.pct, 0)
    const rounded = Math.round(sum * 10) / 10
    return {
      part,
      rows,
      sum: rounded,
      valid: rounded === 100,
      text: rows
        .filter((r) => r.material || r.pct)
        .map((r) => `${r.material || '―'} ${trimPct(r.pct)}%`)
        .join(', '),
    }
  })
}

function trimPct(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

export function validateLabel(spec: LabelSpec): LabelValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!spec.productName.trim()) errors.push('제품명을 입력해 주세요.')

  const parts = groupComposition(spec)
  if (parts.length === 0) {
    errors.push('소재 혼용률을 한 줄 이상 입력해 주세요.')
  } else {
    for (const p of parts) {
      if (!p.valid) {
        errors.push(`${p.part} 혼용률 합계가 ${trimPct(p.sum)}% 입니다. 100%가 되어야 합니다.`)
      }
      if (p.rows.some((r) => !r.material)) {
        errors.push(`${p.part}에 소재명이 비어 있는 줄이 있습니다.`)
      }
    }
  }

  if (!spec.size.trim()) errors.push('제품 치수를 입력해 주세요.')
  if (!spec.maker.trim()) errors.push('제조자(또는 수입자)를 입력해 주세요.')
  if (!spec.country.trim()) errors.push('제조국을 입력해 주세요.')
  if (!spec.madeOn.trim()) errors.push('제조연월을 입력해 주세요.')
  if (!spec.asName.trim() || !spec.asPhone.trim())
    errors.push('A/S 책임자와 전화번호를 입력해 주세요.')

  if (spec.careCodes.length === 0) warnings.push('취급 시 주의사항(세탁기호)이 비어 있습니다.')
  if (!spec.kcNumber.trim())
    warnings.push('KC 인증번호가 비어 있습니다. 인증 대상 품목인지 확인해 주세요.')

  return { errors, warnings, ok: errors.length === 0 }
}

/** 라벨 인쇄용 표준 텍스트 블록 */
export function buildLabelText(spec: LabelSpec): string {
  const lines: string[] = []
  const add = (s: string) => lines.push(s)

  add(`■ 제품명: ${spec.productName.trim() || '―'}`)

  const parts = groupComposition(spec)
  if (parts.length === 1 && parts[0].part === '소재') {
    add(`■ 소재(혼용률): ${parts[0].text || '―'}`)
  } else if (parts.length > 0) {
    add('■ 소재(혼용률)')
    for (const p of parts) add(`   · ${p.part}: ${p.text || '―'}`)
  } else {
    add('■ 소재(혼용률): ―')
  }

  add(`■ 제품 치수: ${spec.size.trim() || '―'}`)
  add(`■ 제조자(수입자): ${spec.maker.trim() || '―'}`)
  add(`■ 제조국: ${spec.country.trim() || '―'}`)
  add(`■ 제조연월: ${spec.madeOn.trim() || '―'}`)

  const care = spec.careCodes.map((c) => CARE_BY_CODE[c]?.label).filter(Boolean)
  if (care.length > 0) {
    add('■ 취급 시 주의사항')
    for (const c of care) add(`   · ${c}`)
  }
  if (spec.precautions.trim()) {
    for (const line of spec.precautions.split('\n')) {
      if (line.trim()) add(`   · ${line.trim()}`)
    }
  }

  add(`■ A/S 책임자 및 전화번호: ${spec.asName.trim() || '―'} / ${spec.asPhone.trim() || '―'}`)
  if (spec.kcNumber.trim()) add(`■ KC 인증번호: ${spec.kcNumber.trim()}`)

  return lines.join('\n')
}

export const DEFAULT_LABEL: Omit<LabelSpec, 'projectId'> = {
  productName: '',
  composition: [{ part: '겉감', material: '', pct: 100 }],
  size: '',
  maker: '',
  country: '대한민국',
  madeOn: '',
  careCodes: [],
  precautions: '',
  asName: '',
  asPhone: '',
  kcNumber: '',
}
