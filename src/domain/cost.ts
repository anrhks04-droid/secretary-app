import { ALL_BOM_GROUPS, LOSS_APPLIED_GROUPS, type BomGroup, type BomLine } from '@/db/schema'

/**
 * 제조원가(A) 계산.
 *
 *   그룹1 주원단      Σ(요척 × 단가)
 *   그룹2 충전재/부원단 Σ(소요량 × 단가)
 *   그룹3 부자재      Σ(수량 × 단가)
 *   그룹4 임가공비     Σ(수량 × 단가)
 *   ─────────────────────────────
 *   로스 기준액 = 그룹1~4 합
 *   로스 가산   = 로스 기준액 × 로스율%
 *   그룹5 기타  = Σ(인증비 상각·입고 물류비 …)   ← 로스율을 곱하지 않는다
 *
 *   제조원가 A = 로스 기준액 + 로스 가산 + 그룹5
 *
 * 인증비 상각 같은 고정 가산분에 불량률을 곱하면 원가가 부풀려지므로
 * 로스율은 실물 자재·공임(그룹1~4)에만 적용한다.
 *
 * 라인 금액은 원 단위로 먼저 반올림한다. 그래야 화면의 그룹 소계 합과
 * 최종 원가가 1원도 어긋나지 않는다.
 */

export interface GroupSubtotal {
  group: BomGroup
  amount: number
  lineCount: number
  /** 제조원가 A 대비 비중 % */
  sharePct: number
}

export interface CostBreakdown {
  groups: GroupSubtotal[]
  /** 그룹1~4 합 (로스 적용 전) */
  lossBase: number
  /** 로스율로 추가된 금액 */
  lossAmount: number
  /** 그룹5 기타 — 로스 미적용 */
  fixedAdd: number
  /** 최종 제조원가 A */
  total: number
}

/** 라인 1건 금액 (원 단위 반올림) */
export function lineAmount(line: Pick<BomLine, 'qty' | 'unitPrice'>): number {
  const qty = Number.isFinite(line.qty) ? line.qty : 0
  const price = Number.isFinite(line.unitPrice) ? line.unitPrice : 0
  return Math.round(qty * price)
}

export function computeCost(lines: BomLine[], lossRatePct: number): CostBreakdown {
  const rate = Number.isFinite(lossRatePct) ? Math.max(0, lossRatePct) : 0

  const byGroup = new Map<BomGroup, { amount: number; lineCount: number }>()
  for (const g of ALL_BOM_GROUPS) byGroup.set(g, { amount: 0, lineCount: 0 })

  for (const line of lines) {
    const slot = byGroup.get(line.group)
    if (!slot) continue
    slot.amount += lineAmount(line)
    slot.lineCount += 1
  }

  const lossBase = LOSS_APPLIED_GROUPS.reduce((sum, g) => sum + (byGroup.get(g)?.amount ?? 0), 0)
  const lossAmount = Math.round((lossBase * rate) / 100)
  const fixedAdd = byGroup.get('etc')?.amount ?? 0
  const total = lossBase + lossAmount + fixedAdd

  const groups: GroupSubtotal[] = ALL_BOM_GROUPS.map((g) => {
    const slot = byGroup.get(g)!
    return {
      group: g,
      amount: slot.amount,
      lineCount: slot.lineCount,
      sharePct: total > 0 ? (slot.amount / total) * 100 : 0,
    }
  })

  return { groups, lossBase, lossAmount, fixedAdd, total }
}

/** BOM이 아직 비었는지 — 빈 상태 안내용 */
export function isCostEmpty(breakdown: CostBreakdown): boolean {
  return breakdown.total === 0
}
