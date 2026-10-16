import { describe, expect, it } from 'vitest'
import type { BomGroup, BomLine } from '@/db/schema'
import { computeCost, lineAmount } from './cost'

let n = 0
const line = (group: BomGroup, qty: number, unitPrice: number): BomLine => ({
  id: `l${n++}`,
  projectId: 'p1',
  group,
  name: 'x',
  spec: '',
  qty,
  unit: 'ea',
  unitPrice,
  note: '',
  order: n,
})

describe('lineAmount', () => {
  it('요척 × 단가를 원 단위로 반올림한다', () => {
    expect(lineAmount({ qty: 2.5, unitPrice: 3300 })).toBe(8250)
    expect(lineAmount({ qty: 1.333, unitPrice: 1000 })).toBe(1333)
    expect(lineAmount({ qty: 0.3334, unitPrice: 1000 })).toBe(333)
  })

  it('비어 있거나 NaN이면 0으로 떨어진다', () => {
    expect(lineAmount({ qty: Number.NaN, unitPrice: 1000 })).toBe(0)
    expect(lineAmount({ qty: 3, unitPrice: Number.NaN })).toBe(0)
  })
})

describe('computeCost', () => {
  it('로스율은 그룹1~4에만 적용되고 기타(etc)에는 적용되지 않는다', () => {
    const lines = [
      line('fabric', 2, 5000), // 10,000
      line('filling', 1, 8000), //  8,000
      line('sub', 4, 500), //  2,000
      line('labor', 1, 5000), //  5,000
      line('etc', 1, 10000), // 10,000  ← 로스 미적용
    ]

    const r = computeCost(lines, 10)

    expect(r.lossBase).toBe(25000)
    expect(r.lossAmount).toBe(2500)
    expect(r.fixedAdd).toBe(10000)
    expect(r.total).toBe(37500)

    // etc에 로스를 먹였다면 38,500이 나온다 — 그렇게 되면 안 된다
    expect(r.total).not.toBe(38500)
  })

  it('로스율 0이면 단순 합계와 같다', () => {
    const r = computeCost([line('fabric', 1, 1000), line('etc', 1, 500)], 0)
    expect(r.lossAmount).toBe(0)
    expect(r.total).toBe(1500)
  })

  it('그룹 소계의 합 + 로스 가산이 최종 원가와 1원도 어긋나지 않는다', () => {
    const lines = [line('fabric', 1.333, 3300), line('sub', 7, 333), line('etc', 1, 1234)]
    const r = computeCost(lines, 7.5)
    const groupSum = r.groups.reduce((s, g) => s + g.amount, 0)
    expect(groupSum + r.lossAmount).toBe(r.total)
  })

  it('원가 비중 %는 합이 100이 된다', () => {
    const r = computeCost([line('fabric', 1, 7000), line('etc', 1, 3000)], 0)
    const share = r.groups.reduce((s, g) => s + g.sharePct, 0)
    expect(share).toBeCloseTo(100, 6)
  })

  it('BOM이 비면 모든 값이 0이고 0으로 나누지 않는다', () => {
    const r = computeCost([], 20)
    expect(r.total).toBe(0)
    expect(r.groups.every((g) => g.sharePct === 0)).toBe(true)
  })

  it('음수 로스율은 0으로 막는다', () => {
    const r = computeCost([line('fabric', 1, 10000)], -50)
    expect(r.total).toBe(10000)
  })
})
