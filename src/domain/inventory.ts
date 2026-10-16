import type { InventoryParams } from '@/db/schema'

/**
 * 안전재고 · 발주점(ROP) · 권장 발주수량.
 *
 *   리드타임 수요 = 일평균 판매량 × 리드타임(일)
 *   안전재고      = 리드타임 수요 × 안전율%
 *   발주점(ROP)   = 리드타임 수요 + 안전재고
 *   가용재고      = 현재고 + 입고예정
 *   목표재고      = 일평균 × 목표 커버일수
 *   권장 발주수량 = ceil( max(0, 목표재고 − 가용재고) / MOQ ) × MOQ
 *
 * 재고 소진 예상일수는 현재고 기준(입고예정 제외)이다. 품절까지 며칠 남았는지가
 * 현장에서 궁금한 숫자이기 때문.
 */

export interface ReorderResult {
  leadTimeDemand: number
  safetyStock: number
  reorderPoint: number
  available: number
  targetStock: number
  /** MOQ 올림이 적용된 권장 발주수량 */
  suggestedOrderQty: number
  /** MOQ 올림 전 순수 부족분 */
  rawShortage: number
  /** 현재고 기준 소진까지 남은 일수. 일평균이 0이면 null */
  daysOfStock: number | null
  /** 지금 발주해야 하는 상태인가 (가용재고 ≤ 발주점) */
  shouldOrderNow: boolean
}

export function computeReorder(p: InventoryParams): ReorderResult {
  const daily = Math.max(0, p.dailySales || 0)
  const lead = Math.max(0, p.leadTimeDays || 0)
  const safetyPct = Math.max(0, p.safetyFactorPct || 0)
  const moq = Math.max(0, p.moq || 0)
  const onHand = Math.max(0, p.onHand || 0)
  const inbound = Math.max(0, p.inbound || 0)
  const cover = Math.max(0, p.targetCoverDays || 0)

  const leadTimeDemand = daily * lead
  const safetyStock = Math.ceil((leadTimeDemand * safetyPct) / 100)
  const reorderPoint = Math.ceil(leadTimeDemand) + safetyStock
  const available = onHand + inbound
  const targetStock = Math.ceil(daily * cover)

  const rawShortage = Math.max(0, targetStock - available)
  const suggestedOrderQty =
    rawShortage === 0 ? 0 : moq > 0 ? Math.ceil(rawShortage / moq) * moq : rawShortage

  return {
    leadTimeDemand: Math.round(leadTimeDemand * 10) / 10,
    safetyStock,
    reorderPoint,
    available,
    targetStock,
    suggestedOrderQty,
    rawShortage,
    daysOfStock: daily > 0 ? Math.floor(onHand / daily) : null,
    shouldOrderNow: available <= reorderPoint,
  }
}

/**
 * 파렛트 적재 계산.
 *
 * 카톤을 한 방향으로만 깔았을 때의 두 가지 배치(가로/세로)를 비교해
 * 더 많이 들어가는 쪽을 쓴다. 실제 현장에서는 벽돌쌓기처럼 섞어서
 * 더 넣기도 하지만, 현장 어림셈으로는 이 값이 안전한 하한선이다.
 */
export interface PalletResult {
  perLayerA: number
  perLayerB: number
  perLayer: number
  layers: number
  cartonsPerPallet: number
  unitsPerPallet: number
  /** 파렛트 바닥 면적 대비 카톤이 덮는 비율 % */
  floorUsagePct: number
  valid: boolean
}

export function computePallet(p: InventoryParams): PalletResult {
  const cw = Math.max(0, p.cartonW || 0)
  const cd = Math.max(0, p.cartonD || 0)
  const ch = Math.max(0, p.cartonH || 0)
  const pw = Math.max(0, p.palletW || 0)
  const pd = Math.max(0, p.palletD || 0)
  const maxH = Math.max(0, p.palletMaxH || 0)
  const upc = Math.max(0, p.unitsPerCarton || 0)

  const valid = cw > 0 && cd > 0 && ch > 0 && pw > 0 && pd > 0 && maxH > 0

  if (!valid) {
    return {
      perLayerA: 0,
      perLayerB: 0,
      perLayer: 0,
      layers: 0,
      cartonsPerPallet: 0,
      unitsPerPallet: 0,
      floorUsagePct: 0,
      valid: false,
    }
  }

  const perLayerA = Math.floor(pw / cw) * Math.floor(pd / cd)
  const perLayerB = Math.floor(pw / cd) * Math.floor(pd / cw)
  const perLayer = Math.max(perLayerA, perLayerB)
  const layers = Math.floor(maxH / ch)
  const cartonsPerPallet = perLayer * layers

  return {
    perLayerA,
    perLayerB,
    perLayer,
    layers,
    cartonsPerPallet,
    unitsPerPallet: cartonsPerPallet * upc,
    floorUsagePct: pw * pd > 0 ? ((perLayer * cw * cd) / (pw * pd)) * 100 : 0,
    valid: true,
  }
}

export const DEFAULT_INVENTORY: Omit<InventoryParams, 'projectId'> = {
  dailySales: 0,
  leadTimeDays: 30,
  safetyFactorPct: 30,
  moq: 500,
  onHand: 0,
  inbound: 0,
  targetCoverDays: 60,
  cartonW: 0,
  cartonD: 0,
  cartonH: 0,
  unitsPerCarton: 0,
  // T11 표준 파렛트
  palletW: 1100,
  palletD: 1100,
  palletMaxH: 1500,
}
