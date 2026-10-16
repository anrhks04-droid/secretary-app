import { describe, expect, it } from 'vitest'
import type { ChannelRate, PricingScenario } from '@/db/schema'
import {
  computeAllChannelMargins,
  computeChannelMargin,
  effectiveRate,
  suggestPriceForMargin,
  type MarginBasis,
} from './margin'

const channel = (over: Partial<ChannelRate> = {}): ChannelRate => ({
  id: 'ch1',
  name: '테스트채널',
  feePct: 10,
  fixedFeePerOrder: 0,
  fulfillmentPerUnit: 0,
  isBuiltin: false,
  confirmed: true,
  note: '',
  order: 1,
  ...over,
})

const basis = (over: Partial<MarginBasis> = {}): MarginBasis => ({
  unitCost: 10000,
  sellingPrice: 29900,
  shippingChargedToCustomer: 0,
  shippingActualCost: 3000,
  otherVariablePerUnit: 0,
  vatMode: 'included',
  ...over,
})

describe('computeChannelMargin', () => {
  it('VAT 포함 판매가는 1.1로 나눈 공급가를 매출로 본다', () => {
    const r = computeChannelMargin(channel(), basis())

    expect(r.grossRevenue).toBe(29900)
    expect(r.netRevenue).toBe(27182) // 29900 / 1.1
    expect(r.fee).toBe(2990) // 결제금액 기준 10%
    expect(r.logistics).toBe(3000)
    expect(r.contribution).toBe(27182 - 10000 - 2990 - 3000)
    expect(r.marginPct).toBeCloseTo(41.17, 1)
    expect(r.bepRoasPct).toBeCloseTo(267.16, 1)
  })

  it('VAT 별도로 바꾸면 공급가가 판매가 그대로가 되어 마진이 커진다', () => {
    const inc = computeChannelMargin(channel(), basis({ vatMode: 'included' }))
    const exc = computeChannelMargin(channel(), basis({ vatMode: 'excluded' }))

    expect(exc.netRevenue).toBe(29900)
    expect(exc.contribution).toBe(29900 - 10000 - 2990 - 3000)
    expect(exc.contribution).toBeGreaterThan(inc.contribution)
  })

  it('공헌이익이 0 이하면 손익분기 ROAS는 null (광고로 메울 수 없음)', () => {
    const r = computeChannelMargin(channel(), basis({ unitCost: 30000 }))
    expect(r.contribution).toBeLessThan(0)
    expect(r.bepRoasPct).toBeNull()
  })

  it('공헌이익이 정확히 0이어도 null', () => {
    // 공급가 27182 − 수수료 2990 − 물류 3000 = 21192 가 원가와 같을 때
    const r = computeChannelMargin(channel(), basis({ unitCost: 21192 }))
    expect(r.contribution).toBe(0)
    expect(r.bepRoasPct).toBeNull()
  })

  it('풀필먼트 요금이 있는 채널은 실 택배비 대신 그 요금을 쓴다', () => {
    const r = computeChannelMargin(
      channel({ fulfillmentPerUnit: 3500 }),
      basis({ shippingActualCost: 3000 }),
    )
    expect(r.logistics).toBe(3500)
  })

  it('고객에게 받은 배송비는 매출에 더해지고 수수료 부과 대상에도 들어간다', () => {
    const r = computeChannelMargin(
      channel(),
      basis({ shippingChargedToCustomer: 3000, vatMode: 'excluded' }),
    )
    expect(r.grossRevenue).toBe(32900)
    expect(r.fee).toBe(3290)
    expect(r.contribution).toBe(32900 - 10000 - 3290 - 3000)
  })

  it('건당 고정 수수료가 더해진다', () => {
    const r = computeChannelMargin(channel({ fixedFeePerOrder: 500 }), basis())
    expect(r.fee).toBe(2990 + 500)
  })
})

describe('effectiveRate', () => {
  it('프로젝트 오버라이드가 채널 기본 요율을 덮어쓴다', () => {
    const scenario = {
      projectId: 'p1',
      sellingPrice: 0,
      shippingChargedToCustomer: 0,
      shippingActualCost: 0,
      otherVariablePerUnit: 0,
      enabledChannelIds: [],
      overrides: { ch1: { feePct: 4.5 } },
    } satisfies PricingScenario

    expect(effectiveRate(channel(), scenario).feePct).toBe(4.5)
    // 지정하지 않은 값은 그대로
    expect(effectiveRate(channel({ fixedFeePerOrder: 100 }), scenario).fixedFeePerOrder).toBe(100)
  })
})

describe('computeAllChannelMargins', () => {
  it('공헌이익이 큰 채널부터 정렬된다', () => {
    const channels = [
      channel({ id: 'a', name: '비싼채널', feePct: 15 }),
      channel({ id: 'b', name: '싼채널', feePct: 3 }),
    ]
    const r = computeAllChannelMargins(channels, undefined, basis())
    expect(r.map((x) => x.channelId)).toEqual(['b', 'a'])
  })

  it('활성화된 채널만 계산한다', () => {
    const channels = [channel({ id: 'a' }), channel({ id: 'b' })]
    const scenario: PricingScenario = {
      projectId: 'p1',
      sellingPrice: 0,
      shippingChargedToCustomer: 0,
      shippingActualCost: 0,
      otherVariablePerUnit: 0,
      enabledChannelIds: ['b'],
      overrides: {},
    }
    const r = computeAllChannelMargins(channels, scenario, basis())
    expect(r).toHaveLength(1)
    expect(r[0].channelId).toBe('b')
  })
})

describe('suggestPriceForMargin', () => {
  it('제안가로 계산하면 목표 마진율이 실제로 나온다', () => {
    const c = channel({ feePct: 10 })
    const b = basis()
    const price = suggestPriceForMargin(c, b, 30)

    expect(price).not.toBeNull()
    const check = computeChannelMargin(c, { ...b, sellingPrice: price! })
    // 10원 단위 올림 때문에 아주 약간 높게 나온다
    expect(check.marginPct).toBeGreaterThanOrEqual(30)
    expect(check.marginPct).toBeLessThan(30.5)
  })

  it('수수료만으로 목표 마진이 불가능하면 null', () => {
    const r = suggestPriceForMargin(channel({ feePct: 95 }), basis(), 50)
    expect(r).toBeNull()
  })
})
