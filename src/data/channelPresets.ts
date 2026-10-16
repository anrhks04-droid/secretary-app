import type { ChannelRate } from '@/db/schema'

/**
 * 판매 채널 기본 수수료 프리셋.
 *
 * ⚠ 여기 숫자는 '일반적으로 쓰이는 참고용 추정치'다. 실제 요율은 채널·카테고리·
 * 계약 조건에 따라 달라지므로, 모든 프리셋은 confirmed: false 로 시작해
 * UI에 '요율 확인' 배지가 붙는다. 설정에서 실제 정산 기준으로 고치고
 * [확인함]을 누르면 배지가 사라진다.
 */
export const CHANNEL_PRESETS: ChannelRate[] = [
  {
    id: 'ch-smartstore',
    name: '네이버 스마트스토어',
    feePct: 5.85,
    fixedFeePerOrder: 0,
    fulfillmentPerUnit: 0,
    isBuiltin: true,
    confirmed: false,
    note: '주문관리 수수료 + 네이버페이 결제 수수료 합산 추정. 결제수단·등급별로 달라짐.',
    order: 10,
  },
  {
    id: 'ch-coupang-wing',
    name: '쿠팡 윙 (판매자배송)',
    feePct: 10.8,
    fixedFeePerOrder: 0,
    fulfillmentPerUnit: 0,
    isBuiltin: true,
    confirmed: false,
    note: '카테고리별 약 4~10.9% 범위. 실제 카테고리 요율로 수정 필요.',
    order: 20,
  },
  {
    id: 'ch-coupang-growth',
    name: '쿠팡 로켓그로스',
    feePct: 10.8,
    fixedFeePerOrder: 0,
    fulfillmentPerUnit: 3000,
    isBuiltin: true,
    confirmed: false,
    note: '판매수수료 + 입출고/배송요금(크기·무게 구간별). 물류비는 실제 요금표로 수정 필요.',
    order: 30,
  },
  {
    id: 'ch-ohou',
    name: '오늘의집',
    feePct: 12,
    fixedFeePerOrder: 0,
    fulfillmentPerUnit: 0,
    isBuiltin: true,
    confirmed: false,
    note: '카테고리·입점 형태별로 상이. 계약서 요율로 수정 필요.',
    order: 40,
  },
  {
    id: 'ch-own',
    name: '자사몰',
    feePct: 3.3,
    fixedFeePerOrder: 0,
    fulfillmentPerUnit: 0,
    isBuiltin: true,
    confirmed: false,
    note: 'PG 결제 수수료 기준. 솔루션 이용료는 고정비라 단위 원가에 미포함.',
    order: 50,
  },
]

export const RATE_NOTICE =
  '채널 수수료 기본값은 참고용 추정치입니다. 실제 정산서 기준으로 설정에서 수정해 주세요.'
