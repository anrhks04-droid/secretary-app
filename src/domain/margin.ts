import type { ChannelRate, ID, PricingScenario, VatMode } from '@/db/schema'

/**
 * 채널별 마진 계산.
 *
 * 실무 정산 방식에 맞춘 정의 — 화면에도 그대로 표기한다.
 *
 *   결제금액      = 판매가 + 고객이 낸 배송비            (VAT 포함 총액)
 *   공급가(기준가) = 결제금액 ÷ 1.1                       (vatMode='included'일 때)
 *   채널 수수료    = 결제금액 × 수수료율 + 건당 고정수수료  (채널은 결제금액에 부과한다)
 *   물류비        = 풀필먼트 요금(설정 시) 또는 실 택배비
 *   공헌이익      = 공급가 − 제조원가A − 수수료 − 물류비 − 기타 변동비
 *   마진율        = 공헌이익 ÷ 공급가 × 100
 *   손익분기 ROAS = 결제금액 ÷ 공헌이익 × 100
 *
 * 손익분기 ROAS는 "광고비로 공헌이익을 정확히 다 쓰는 지점"이다.
 * 공헌이익이 0 이하면 광고를 아무리 잘해도 남지 않으므로 null 을 돌려주고
 * 화면에서는 '불가'로 표시한다.
 */

export interface MarginBasis {
  /** 제조원가 A */
  unitCost: number
  sellingPrice: number
  shippingChargedToCustomer: number
  shippingActualCost: number
  otherVariablePerUnit: number
  vatMode: VatMode
}

export interface ChannelMarginResult {
  channelId: ID
  channelName: string
  confirmed: boolean
  /** 결제금액 (VAT 포함 총액) */
  grossRevenue: number
  /** 공급가 기준 매출 */
  netRevenue: number
  feePct: number
  fee: number
  logistics: number
  unitCost: number
  otherVariable: number
  contribution: number
  marginPct: number
  /** 공헌이익 ≤ 0 이면 null */
  bepRoasPct: number | null
}

const VAT_DIVISOR = 1.1

export function effectiveRate(channel: ChannelRate, scenario?: PricingScenario): ChannelRate {
  const o = scenario?.overrides?.[channel.id]
  if (!o) return channel
  return {
    ...channel,
    feePct: o.feePct ?? channel.feePct,
    fixedFeePerOrder: o.fixedFeePerOrder ?? channel.fixedFeePerOrder,
    fulfillmentPerUnit: o.fulfillmentPerUnit ?? channel.fulfillmentPerUnit,
  }
}

export function computeChannelMargin(channel: ChannelRate, basis: MarginBasis): ChannelMarginResult {
  const sellingPrice = Math.max(0, basis.sellingPrice || 0)
  const shippingIn = Math.max(0, basis.shippingChargedToCustomer || 0)
  const grossRevenue = sellingPrice + shippingIn
  const netRevenue = basis.vatMode === 'included' ? grossRevenue / VAT_DIVISOR : grossRevenue

  const fee = Math.round((grossRevenue * (channel.feePct || 0)) / 100 + (channel.fixedFeePerOrder || 0))

  // 풀필먼트 요금이 설정된 채널(로켓그로스 등)은 직접 택배를 보내지 않는다.
  const logistics =
    channel.fulfillmentPerUnit > 0
      ? Math.round(channel.fulfillmentPerUnit)
      : Math.round(Math.max(0, basis.shippingActualCost || 0))

  const unitCost = Math.round(Math.max(0, basis.unitCost || 0))
  const otherVariable = Math.round(Math.max(0, basis.otherVariablePerUnit || 0))

  const contribution = Math.round(netRevenue) - unitCost - fee - logistics - otherVariable
  const marginPct = netRevenue > 0 ? (contribution / netRevenue) * 100 : 0
  const bepRoasPct = contribution > 0 ? (grossRevenue / contribution) * 100 : null

  return {
    channelId: channel.id,
    channelName: channel.name,
    confirmed: channel.confirmed,
    grossRevenue: Math.round(grossRevenue),
    netRevenue: Math.round(netRevenue),
    feePct: channel.feePct || 0,
    fee,
    logistics,
    unitCost,
    otherVariable,
    contribution,
    marginPct,
    bepRoasPct,
  }
}

/** 활성화된 채널만, 마진율 높은 순으로 */
export function computeAllChannelMargins(
  channels: ChannelRate[],
  scenario: PricingScenario | undefined,
  basis: MarginBasis,
): ChannelMarginResult[] {
  const enabled = scenario?.enabledChannelIds
  const target =
    enabled && enabled.length > 0 ? channels.filter((c) => enabled.includes(c.id)) : channels

  return target
    .map((c) => computeChannelMargin(effectiveRate(c, scenario), basis))
    .sort((a, b) => b.contribution - a.contribution)
}

/**
 * 목표 마진율을 맞추려면 얼마에 팔아야 하는지 (역산).
 * 배송비·기타 변동비·수수료를 모두 반영한 권장 판매가.
 */
export function suggestPriceForMargin(
  channel: ChannelRate,
  basis: Omit<MarginBasis, 'sellingPrice'>,
  targetMarginPct: number,
): number | null {
  const divisor = basis.vatMode === 'included' ? VAT_DIVISOR : 1
  const ship = Math.max(0, basis.shippingChargedToCustomer || 0)
  const logistics =
    channel.fulfillmentPerUnit > 0
      ? channel.fulfillmentPerUnit
      : Math.max(0, basis.shippingActualCost || 0)
  const fixed =
    Math.max(0, basis.unitCost || 0) +
    logistics +
    Math.max(0, basis.otherVariablePerUnit || 0) +
    (channel.fixedFeePerOrder || 0)

  const m = targetMarginPct / 100
  const f = (channel.feePct || 0) / 100

  // G = 판매가 + 배송비 일 때
  //   공헌이익 = G/divisor − 원가고정 − G·f  이고  마진율 m = 공헌이익 / (G/divisor)
  //   ⇒ G · (1/divisor)(1 − m) − G·f = 고정비
  const coeff = (1 / divisor) * (1 - m) - f
  if (coeff <= 0) return null

  const gross = fixed / coeff
  const price = gross - ship
  return price > 0 ? Math.ceil(price / 10) * 10 : null
}
