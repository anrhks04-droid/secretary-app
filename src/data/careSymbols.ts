/**
 * 세탁(취급) 기호 데이터.
 *
 * 각 기호는 '도형 + 내부 표시'로 분해해 두고, CareSymbolIcon 컴포넌트가
 * 이 서술만 보고 SVG를 그린다. 라벨 인쇄용 텍스트는 label 을 그대로 쓴다.
 */

export type CareFamily = 'wash' | 'bleach' | 'dry' | 'iron' | 'dryclean'

export const CARE_FAMILY_LABEL: Record<CareFamily, string> = {
  wash: '물세탁',
  bleach: '표백',
  dry: '건조',
  iron: '다림질',
  dryclean: '드라이클리닝',
}

export const CARE_FAMILY_ORDER: CareFamily[] = ['wash', 'bleach', 'dry', 'iron', 'dryclean']

export interface CareGlyph {
  shape: 'tub' | 'triangle' | 'square' | 'iron' | 'circle'
  /** 도형 안 텍스트 (온도 숫자, P, F, W 등) */
  text?: string
  /** 도형 안 점 개수 — 다림질 온도 */
  dots?: number
  /** 도형 아래 가로 막대 개수 — 약하게 / 매우 약하게 */
  bars?: number
  /** 대각선 두 줄로 금지 표시 */
  crossed?: boolean
  /** 도형 내부 표시 */
  inner?: 'circle' | 'hang' | 'flat' | 'hand' | 'diag'
  /** 좌상단 사선 — 그늘 건조 */
  shade?: boolean
}

export interface CareSymbol {
  code: string
  family: CareFamily
  /** 라벨 인쇄용 문구 — 그대로 한글표시사항에 들어간다 */
  label: string
  glyph: CareGlyph
}

export const CARE_SYMBOLS: CareSymbol[] = [
  /* ── 물세탁 ── */
  { code: 'w95', family: 'wash', label: '95℃ 물로 세탁, 세탁기 사용 가능', glyph: { shape: 'tub', text: '95' } },
  { code: 'w60', family: 'wash', label: '60℃ 물로 세탁, 세탁기 사용 가능', glyph: { shape: 'tub', text: '60' } },
  { code: 'w40', family: 'wash', label: '40℃ 물로 세탁, 세탁기 약하게', glyph: { shape: 'tub', text: '40', bars: 1 } },
  { code: 'w30', family: 'wash', label: '30℃ 물로 세탁, 세탁기 약하게', glyph: { shape: 'tub', text: '30', bars: 1 } },
  { code: 'w30w', family: 'wash', label: '30℃ 물로 약하게 세탁 (중성세제 사용)', glyph: { shape: 'tub', text: '30', bars: 2 } },
  { code: 'whand', family: 'wash', label: '30℃ 물로 손세탁 (비틀어 짜지 말 것)', glyph: { shape: 'tub', inner: 'hand' } },
  { code: 'wno', family: 'wash', label: '물세탁 금지', glyph: { shape: 'tub', crossed: true } },

  /* ── 표백 ── */
  { code: 'bl_any', family: 'bleach', label: '염소계·산소계 표백제로 표백 가능', glyph: { shape: 'triangle' } },
  { code: 'bl_ox', family: 'bleach', label: '산소계 표백제로만 표백 가능', glyph: { shape: 'triangle', inner: 'diag' } },
  { code: 'bl_no', family: 'bleach', label: '표백 불가', glyph: { shape: 'triangle', crossed: true } },

  /* ── 건조 ── */
  { code: 'dr_t', family: 'dry', label: '기계(텀블) 건조 가능', glyph: { shape: 'square', inner: 'circle' } },
  { code: 'dr_t_low', family: 'dry', label: '기계(텀블) 건조 가능 — 저온', glyph: { shape: 'square', inner: 'circle', dots: 1 } },
  { code: 'dr_t_no', family: 'dry', label: '기계(텀블) 건조 불가', glyph: { shape: 'square', inner: 'circle', crossed: true } },
  { code: 'dr_hang', family: 'dry', label: '옷걸이에 걸어 건조', glyph: { shape: 'square', inner: 'hang' } },
  { code: 'dr_hang_shade', family: 'dry', label: '그늘에서 옷걸이에 걸어 건조', glyph: { shape: 'square', inner: 'hang', shade: true } },
  { code: 'dr_flat', family: 'dry', label: '뉘어서 건조', glyph: { shape: 'square', inner: 'flat' } },
  { code: 'dr_flat_shade', family: 'dry', label: '그늘에 뉘어서 건조', glyph: { shape: 'square', inner: 'flat', shade: true } },

  /* ── 다림질 ── */
  { code: 'ir_high', family: 'iron', label: '180~210℃로 다림질', glyph: { shape: 'iron', dots: 3 } },
  { code: 'ir_mid', family: 'iron', label: '140~160℃로 다림질', glyph: { shape: 'iron', dots: 2 } },
  { code: 'ir_low', family: 'iron', label: '80~120℃로 다림질', glyph: { shape: 'iron', dots: 1 } },
  { code: 'ir_no', family: 'iron', label: '다림질 불가', glyph: { shape: 'iron', crossed: true } },

  /* ── 드라이클리닝 ── */
  { code: 'dc_any', family: 'dryclean', label: '드라이클리닝 가능', glyph: { shape: 'circle' } },
  { code: 'dc_p', family: 'dryclean', label: '드라이클리닝 가능 (퍼클로로에틸렌·석유계 용제)', glyph: { shape: 'circle', text: 'P' } },
  { code: 'dc_f', family: 'dryclean', label: '드라이클리닝 가능 (석유계 용제만)', glyph: { shape: 'circle', text: 'F' } },
  { code: 'dc_no', family: 'dryclean', label: '드라이클리닝 불가', glyph: { shape: 'circle', crossed: true } },
  { code: 'wet_w', family: 'dryclean', label: '웨트클리닝 가능 (전문점)', glyph: { shape: 'circle', text: 'W' } },
  { code: 'wet_no', family: 'dryclean', label: '웨트클리닝 불가', glyph: { shape: 'circle', text: 'W', crossed: true } },
]

export const CARE_BY_CODE: Record<string, CareSymbol> = Object.fromEntries(
  CARE_SYMBOLS.map((s) => [s.code, s]),
)

export const careSymbolsOf = (family: CareFamily): CareSymbol[] =>
  CARE_SYMBOLS.filter((s) => s.family === family)

/** 제품 특성상 자주 쓰는 기본 조합 (침구·의류 범용) */
export const DEFAULT_CARE_CODES = ['w30', 'bl_no', 'dr_hang_shade', 'ir_low', 'dc_no']
