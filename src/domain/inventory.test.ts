import { describe, expect, it } from 'vitest'
import type { InventoryParams } from '@/db/schema'
import { DEFAULT_INVENTORY, computePallet, computeReorder } from './inventory'

const params = (over: Partial<InventoryParams> = {}): InventoryParams => ({
  projectId: 'p1',
  ...DEFAULT_INVENTORY,
  ...over,
})

describe('computeReorder', () => {
  it('리드타임 수요 · 안전재고 · 발주점을 계산한다', () => {
    const r = computeReorder(params({ dailySales: 10, leadTimeDays: 30, safetyFactorPct: 30 }))

    expect(r.leadTimeDemand).toBe(300)
    expect(r.safetyStock).toBe(90)
    expect(r.reorderPoint).toBe(390)
  })

  it('권장 발주수량은 MOQ 단위로 올림한다', () => {
    const r = computeReorder(
      params({ dailySales: 10, targetCoverDays: 60, onHand: 200, inbound: 0, moq: 500 }),
    )

    expect(r.targetStock).toBe(600)
    expect(r.rawShortage).toBe(400)
    expect(r.suggestedOrderQty).toBe(500) // 400 → MOQ 500으로 올림
  })

  it('부족분이 MOQ를 넘으면 배수로 올린다', () => {
    const r = computeReorder(
      params({ dailySales: 30, targetCoverDays: 60, onHand: 0, inbound: 0, moq: 500 }),
    )
    expect(r.rawShortage).toBe(1800)
    expect(r.suggestedOrderQty).toBe(2000)
  })

  it('입고 예정 수량은 가용재고에 포함되어 발주량을 줄인다', () => {
    const base = { dailySales: 10, targetCoverDays: 60, onHand: 200, moq: 100 }
    const without = computeReorder(params({ ...base, inbound: 0 }))
    const withIn = computeReorder(params({ ...base, inbound: 300 }))

    expect(without.suggestedOrderQty).toBe(400)
    expect(withIn.suggestedOrderQty).toBe(100)
  })

  it('재고가 충분하면 발주하지 않는다', () => {
    const r = computeReorder(params({ dailySales: 10, targetCoverDays: 60, onHand: 1000 }))
    expect(r.suggestedOrderQty).toBe(0)
    expect(r.shouldOrderNow).toBe(false)
  })

  it('가용재고가 발주점 이하면 지금 발주 경고', () => {
    const r = computeReorder(
      params({ dailySales: 10, leadTimeDays: 30, safetyFactorPct: 30, onHand: 200 }),
    )
    expect(r.reorderPoint).toBe(390)
    expect(r.shouldOrderNow).toBe(true)
  })

  it('재고 소진 예상일은 현재고 기준 (입고예정 제외)', () => {
    const r = computeReorder(params({ dailySales: 10, onHand: 205, inbound: 9999 }))
    expect(r.daysOfStock).toBe(20)
  })

  it('일평균 판매량이 0이면 소진일은 null', () => {
    expect(computeReorder(params({ dailySales: 0, onHand: 100 })).daysOfStock).toBeNull()
  })

  it('MOQ가 0이면 부족분을 그대로 발주한다', () => {
    const r = computeReorder(
      params({ dailySales: 10, targetCoverDays: 60, onHand: 200, moq: 0 }),
    )
    expect(r.suggestedOrderQty).toBe(400)
  })
})

describe('computePallet', () => {
  it('가로·세로 두 배치 중 더 많이 들어가는 쪽을 쓴다', () => {
    const r = computePallet(
      params({
        cartonW: 600,
        cartonD: 400,
        cartonH: 300,
        palletW: 1200,
        palletD: 800,
        palletMaxH: 1500,
        unitsPerCarton: 10,
      }),
    )

    expect(r.perLayerA).toBe(4) // (1200/600=2) × (800/400=2)
    expect(r.perLayerB).toBe(3) // (1200/400=3) × (800/600=1)
    expect(r.perLayer).toBe(4)
    expect(r.layers).toBe(5) // 1500 / 300
    expect(r.cartonsPerPallet).toBe(20)
    expect(r.unitsPerPallet).toBe(200)
  })

  it('바닥 면적 사용률을 계산한다', () => {
    const r = computePallet(
      params({
        cartonW: 600,
        cartonD: 400,
        cartonH: 300,
        palletW: 1200,
        palletD: 800,
        palletMaxH: 300,
        unitsPerCarton: 1,
      }),
    )
    expect(r.floorUsagePct).toBeCloseTo(100, 6)
  })

  it('치수가 비어 있으면 valid=false 로 안내한다', () => {
    const r = computePallet(params({ cartonW: 0 }))
    expect(r.valid).toBe(false)
    expect(r.unitsPerPallet).toBe(0)
  })

  it('카톤이 파렛트보다 크면 0단으로 떨어진다', () => {
    const r = computePallet(
      params({
        cartonW: 2000,
        cartonD: 2000,
        cartonH: 300,
        palletW: 1100,
        palletD: 1100,
        palletMaxH: 1500,
        unitsPerCarton: 10,
      }),
    )
    expect(r.perLayer).toBe(0)
    expect(r.cartonsPerPallet).toBe(0)
  })
})
