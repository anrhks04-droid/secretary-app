import type { StepNo, ToolKey } from '@/db/schema'

export interface TemplateItem {
  /** 전역 고유 — 템플릿이 바뀌어도 기존 항목을 추적하는 키 */
  key: string
  title: string
  /** 현장에서 놓치기 쉬운 포인트 */
  hint?: string
  /** 항목 안에서 바로 열리는 비서 도구 */
  toolKey?: ToolKey
}

/**
 * 프로젝트 생성 시 자동으로 깔리는 6단계 기본 체크리스트.
 * 사용자가 항목을 추가·삭제·수정할 수 있으므로 여기는 '출발점'일 뿐이다.
 */
export const CHECKLIST_TEMPLATE: Record<StepNo, TemplateItem[]> = {
  1: [
    {
      key: 's1-market',
      title: '시장조사 — 경쟁사 3곳 가격·스펙·리뷰 비교',
      hint: '판매가 / 핵심 스펙 / 리뷰 불만 포인트를 메모에 정리해 두면 상세페이지에서 그대로 쓴다.',
    },
    {
      key: 's1-concept',
      title: '제품 컨셉·타깃·핵심 소구점 한 줄 정의',
      hint: '“누가 / 어떤 불편 때문에 / 왜 우리 걸 사는가”를 한 문장으로.',
    },
    {
      key: 's1-bom',
      title: 'BOM(원부자재 명세) 확정',
      hint: '겉감 요척·충전재 중량·부자재까지 빠짐없이. [원가] 탭에서 항목별로 입력하면 제조원가가 자동 합산된다.',
    },
    {
      key: 's1-moq',
      title: 'MOQ·단가 네고 (수량별 단가 티어 확보)',
      hint: '500/1,000/3,000장 구간별 단가를 받아 두면 리오더 때 협상이 쉽다.',
    },
    {
      key: 's1-sample',
      title: '표준샘플(Golden Sample) 확정 — 사진 박제 + 실측 치수 기록',
      hint: '합격 기준이 되는 샘플이다. 사진을 찍어 붙이고 실측 치수를 메모에 남긴다.',
    },
    {
      key: 's1-contract',
      title: '발주 계약 체결 (납기·불량 보상 조건 명시)',
      hint: '불량 발생 시 재작업/차감 기준을 계약서에 반드시 넣는다.',
    },
  ],
  2: [
    {
      key: 's2-cert',
      title: 'KC 인증 / 시험성적서 확보',
      hint: '가정용 섬유제품은 안전확인·공급자적합성확인 대상 여부를 먼저 확인.',
    },
    {
      key: 's2-pl',
      title: 'PL보험(생산물배상책임) 가입 확인',
      hint: '대형 유통 입점 시 요구하는 경우가 많다.',
    },
    {
      key: 's2-inbound',
      title: '원부자재 입고검수 — 이색·오염·수량',
      hint: '롤 번호별 이색이 가장 흔한 사고. 입고 즉시 촬영해 두면 클레임이 쉽다.',
      toolKey: 'qc',
    },
    {
      key: 's2-inline',
      title: '중간 봉제/조립 공정검수',
      hint: '전량 생산 전에 초도 10~20장으로 공정 품질을 잡는다.',
      toolKey: 'qc',
    },
    {
      key: 's2-final',
      title: '출하 전 최종검수 (샘플링 검사)',
      hint: '로트에서 무작위 추출해 치수·봉제·오염을 확인하고 합부를 기록.',
      toolKey: 'qc',
    },
    {
      key: 's2-feedback',
      title: '불량 집계 및 공장 피드백 전달',
      hint: '불량 유형별 수량을 정리해 리포트로 뽑아 전달하면 재발이 줄어든다.',
      toolKey: 'qc',
    },
  ],
  3: [
    {
      key: 's3-inner',
      title: '속포장(폴리백) 규격·두께 확정',
      hint: '접는 방식까지 정해 둬야 박스 입수량이 흔들리지 않는다.',
    },
    {
      key: 's3-box',
      title: '단상자·행택 디자인 확정 및 인쇄 교정',
      hint: '실물 교정(샘플 인쇄)을 꼭 보고 승인. 모니터 색과 다르다.',
    },
    {
      key: 's3-barcode',
      title: '바코드(GTIN) 발급 및 스캔 테스트',
      hint: '실제 스캐너로 읽히는지 확인. 인쇄 축소·여백 부족이 주원인.',
    },
    {
      key: 's3-label',
      title: '법정 한글표시사항 · 세탁기호 확정',
      hint: '혼용률 합계 100%, 제조국, 제조연월, A/S 연락처 누락이 가장 흔한 지적 사항.',
      toolKey: 'label',
    },
    {
      key: 's3-recycle',
      title: '분리배출 마크 표기 확인',
    },
    {
      key: 's3-order',
      title: '부자재(케어라벨·행택·박스) 발주',
      hint: '라벨 리드타임이 의외로 길다. 봉제 일정보다 먼저 발주.',
    },
  ],
  4: [
    {
      key: 's4-sku',
      title: 'SKU 코드 체계 및 창고 로케이션 부여',
      hint: '색상·사이즈가 늘어날 걸 감안해 자리수를 미리 넉넉히.',
    },
    {
      key: 's4-carton',
      title: '카톤 입수량 · 파렛트 적재 규격 확정',
      hint: '카톤 외경과 파렛트 규격을 넣으면 적재 수량이 자동 계산된다.',
      toolKey: 'reorder',
    },
    {
      key: 's4-safety',
      title: '안전재고 · 발주점(리오더 포인트) 산정',
      hint: '일평균 판매량 × 리드타임이 기준. 품절은 랭킹을 떨어뜨린다.',
      toolKey: 'reorder',
    },
    {
      key: 's4-manual',
      title: '택배 포장 매뉴얼 작성 (파손·오염 방지 기준)',
    },
    {
      key: 's4-3pl',
      title: '풀필먼트 입고 예약 및 라벨 부착 규정 확인',
      hint: '센터별로 바코드 위치·박스 규격 규정이 다르다. 반려되면 일정이 통째로 밀린다.',
    },
  ],
  5: [
    {
      key: 's5-price',
      title: '채널별 가격 티어 세팅',
      hint: '[원가] 탭의 채널별 마진 비교표에서 공헌이익이 남는지 먼저 확인.',
    },
    {
      key: 's5-detail',
      title: '상세페이지 기획 및 제품 촬영',
      hint: '시장조사에서 모은 경쟁사 리뷰 불만을 그대로 반박 콘텐츠로.',
    },
    {
      key: 's5-register',
      title: '상품 등록 (옵션·키워드·속성 입력)',
    },
    {
      key: 's5-review',
      title: '초기 리뷰 체험단 세팅',
      hint: '리뷰 0건이면 광고 효율이 안 나온다. 런칭 전에 확보.',
    },
    {
      key: 's5-ads',
      title: '광고 세팅 및 손익분기 ROAS 기준 설정',
      hint: '[원가] 탭의 BEP ROAS를 넘겨야 광고가 남는 장사다.',
    },
  ],
  6: [
    {
      key: 's6-faq',
      title: 'FAQ · CS 응대 스크립트 작성',
      hint: '세탁 방법, 사이즈, 배송 지연 3가지가 문의의 대부분.',
    },
    {
      key: 's6-defectrate',
      title: '초기 2주 불량·반품률 모니터링',
      hint: '반품 사유를 유형별로 적어 두면 리오더 때 그대로 개선 지시서가 된다.',
      toolKey: 'qc',
    },
    {
      key: 's6-improve',
      title: '공장 피드백 및 리오더 개선사항 기록',
    },
    {
      key: 's6-reorder',
      title: '리오더 발주 판단 (재고 소진일 기준)',
      hint: '발주점에 닿기 전에 움직여야 리드타임 안에 입고된다.',
      toolKey: 'reorder',
    },
  ],
}

export const TEMPLATE_TOTAL_COUNT = Object.values(CHECKLIST_TEMPLATE).reduce(
  (sum, items) => sum + items.length,
  0,
)
