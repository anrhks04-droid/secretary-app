import { describe, expect, it } from 'vitest'
import type { LabelSpec } from '@/db/schema'
import { DEFAULT_LABEL, buildLabelText, groupComposition, validateLabel } from './label'

const spec = (over: Partial<LabelSpec> = {}): LabelSpec => ({
  projectId: 'p1',
  ...DEFAULT_LABEL,
  productName: '호텔식 구스 이불',
  composition: [
    { part: '겉감', material: '면', pct: 100 },
    { part: '충전재', material: '거위솜털', pct: 90 },
    { part: '충전재', material: '거위깃털', pct: 10 },
  ],
  size: 'Q 200×220cm',
  maker: '(주)공장',
  country: '대한민국',
  madeOn: '2026-10',
  careCodes: ['w30', 'bl_no'],
  asName: '홍길동',
  asPhone: '02-000-0000',
  kcNumber: 'KC-1234',
  ...over,
})

describe('groupComposition', () => {
  it('같은 부위끼리 묶어 합계를 낸다', () => {
    const parts = groupComposition(spec())

    expect(parts.map((p) => p.part)).toEqual(['겉감', '충전재'])
    expect(parts[1].sum).toBe(100)
    expect(parts[1].text).toBe('거위솜털 90%, 거위깃털 10%')
  })

  it('소수점 혼용률도 100%로 인정한다', () => {
    const parts = groupComposition(
      spec({
        composition: [
          { part: '겉감', material: '면', pct: 66.7 },
          { part: '겉감', material: '폴리에스터', pct: 33.3 },
        ],
      }),
    )
    expect(parts[0].valid).toBe(true)
  })
})

describe('validateLabel', () => {
  it('제대로 채운 라벨은 통과한다', () => {
    const v = validateLabel(spec())
    expect(v.errors).toEqual([])
    expect(v.ok).toBe(true)
  })

  it('혼용률 합계가 100%가 아니면 오류 — 가장 흔한 반려 사유', () => {
    const v = validateLabel(
      spec({
        composition: [
          { part: '겉감', material: '면', pct: 70 },
          { part: '겉감', material: '폴리에스터', pct: 20 },
        ],
      }),
    )
    expect(v.ok).toBe(false)
    expect(v.errors.some((e) => e.includes('90%'))).toBe(true)
  })

  it('필수 항목이 비면 각각 오류로 잡는다', () => {
    const v = validateLabel(spec({ maker: '', country: '', madeOn: '', asPhone: '' }))
    expect(v.errors).toHaveLength(4)
  })

  it('KC 번호·세탁기호 누락은 경고 수준 (진행은 가능)', () => {
    const v = validateLabel(spec({ kcNumber: '', careCodes: [] }))
    expect(v.ok).toBe(true)
    expect(v.warnings).toHaveLength(2)
  })
})

describe('buildLabelText', () => {
  it('부위가 여러 개면 들여쓴 목록으로 출력한다', () => {
    const text = buildLabelText(spec())

    expect(text).toContain('■ 제품명: 호텔식 구스 이불')
    expect(text).toContain('   · 겉감: 면 100%')
    expect(text).toContain('   · 충전재: 거위솜털 90%, 거위깃털 10%')
    expect(text).toContain('■ 제조국: 대한민국')
    expect(text).toContain('■ A/S 책임자 및 전화번호: 홍길동 / 02-000-0000')
    expect(text).toContain('■ KC 인증번호: KC-1234')
  })

  it('선택한 세탁기호가 문구로 풀린다', () => {
    const text = buildLabelText(spec())
    expect(text).toContain('30℃ 물로 세탁, 세탁기 약하게')
    expect(text).toContain('표백 불가')
  })

  it('부위가 하나뿐이고 이름이 없으면 한 줄로 쓴다', () => {
    const text = buildLabelText(
      spec({ composition: [{ part: '', material: '면', pct: 100 }] }),
    )
    expect(text).toContain('■ 소재(혼용률): 면 100%')
  })

  it('추가 주의사항은 줄 단위로 붙는다', () => {
    const text = buildLabelText(spec({ precautions: '단독 세탁\n건조기 사용 금지' }))
    expect(text).toContain('   · 단독 세탁')
    expect(text).toContain('   · 건조기 사용 금지')
  })
})
