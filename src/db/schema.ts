/**
 * 앱 전체 데이터 타입의 단일 출처.
 * 여기 정의된 타입만 UI·계산 로직·백업이 공유한다.
 *
 * 저장소는 지금은 IndexedDB(Dexie) 하나지만, 나중에 Supabase 같은
 * 원격 DB로 옮길 수 있도록 이 파일은 Dexie에 의존하지 않는다.
 */

export type ID = string
/** 'YYYY-MM-DD' */
export type ISODate = string
/** new Date().toISOString() */
export type ISODateTime = string

/* ───────────────────────── 프로젝트 ───────────────────────── */

export type ProjectStatus = 'planning' | 'production' | 'selling' | 'archived'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: '기획중',
  production: '생산중',
  selling: '판매중',
  archived: '종료',
}

export interface Project {
  id: ID
  /** 품목명 */
  name: string
  /** 카테고리 (예: 침구, 아우터) */
  category: string
  /** 규격·사이즈 (예: Q 200×220) */
  sizeSpec: string
  /** 목표 출시일 — D-Day 계산 기준 */
  targetLaunchDate: ISODate | ''
  status: ProjectStatus
  coverPhotoId?: ID
  memo: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/* ───────────────────────── 체크리스트 ───────────────────────── */

export type StepNo = 1 | 2 | 3 | 4 | 5 | 6

/** 체크리스트 항목에서 바로 열리는 현장 도구 */
export type ToolKey = 'qc' | 'label' | 'reorder'

export interface ChecklistItem {
  id: ID
  projectId: ID
  step: StepNo
  /** 템플릿 원본 식별자 — 템플릿이 바뀌어도 기존 항목을 매칭하기 위해 보관 */
  templateKey: string
  title: string
  /** 현장에서 놓치기 쉬운 포인트 */
  hint?: string
  done: boolean
  doneAt?: ISODateTime
  assignee: string
  dueDate: ISODate | ''
  memo: string
  order: number
  toolKey?: ToolKey
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export const STEP_META: Record<StepNo, { title: string; short: string }> = {
  1: { title: '소싱 및 원가 기획', short: '소싱' },
  2: { title: '생산 및 품질검수(QC)', short: '생산·QC' },
  3: { title: '패키징 및 라벨링', short: '패키징' },
  4: { title: '물류 및 풀필먼트', short: '물류' },
  5: { title: '판매 채널 런칭', short: '런칭' },
  6: { title: 'CS 및 사후관리', short: 'CS' },
}

export const ALL_STEPS: StepNo[] = [1, 2, 3, 4, 5, 6]

/* ───────────────────────── 사진 ───────────────────────── */

export type PhotoKind = 'golden' | 'defect' | 'etc'
export type Severity = 'minor' | 'major' | 'critical'

export const SEVERITY_LABEL: Record<Severity, string> = {
  minor: '경미',
  major: '중대',
  critical: '치명',
}

/** QC 기록장 불량 유형 프리셋 */
export const DEFECT_TYPES = [
  '이색(컬러 차이)',
  '오염·얼룩',
  '봉제불량(스킵·퍼커링)',
  '사이즈 편차',
  '지퍼·부자재 불량',
  '솜뭉침·충전 불균일',
  '라벨·표시사항 오류',
  '포장 불량',
  '기타',
]

export interface Photo {
  id: ID
  projectId: ID
  /** 특정 체크리스트 항목에 붙은 사진이면 그 항목 id */
  itemId?: ID
  kind: PhotoKind
  /** 원본(장변 1600px로 압축) */
  blob: Blob
  /** 목록용 썸네일(장변 320px) */
  thumbBlob: Blob
  caption: string
  /** kind === 'defect' 일 때만 사용 */
  defectType?: string
  severity?: Severity
  defectQty?: number
  width: number
  height: number
  bytes: number
  createdAt: ISODateTime
}

/* ───────────────────────── BOM / 원가 ───────────────────────── */

export type BomGroup = 'fabric' | 'filling' | 'sub' | 'labor' | 'etc'

export const BOM_GROUP_META: Record<
  BomGroup,
  { label: string; hint: string; qtyLabel: string; defaultUnit: string }
> = {
  fabric: {
    label: '주원단 / 주자재',
    hint: '겉감 등 — 요척(소요량) × 단가',
    qtyLabel: '요척',
    defaultUnit: 'yd',
  },
  filling: {
    label: '충전재 / 부원단',
    hint: '솜·안감 등 — 중량·규격 × 단가',
    qtyLabel: '소요량',
    defaultUnit: 'kg',
  },
  sub: {
    label: '부자재',
    hint: '지퍼·밴드·케어라벨·폴리백·단상자 등',
    qtyLabel: '수량',
    defaultUnit: 'ea',
  },
  labor: {
    label: '임가공비',
    hint: '재단비·봉제/조립 공임·퀼팅·후가공',
    qtyLabel: '수량',
    defaultUnit: '식',
  },
  etc: {
    label: '기타 (로스율 미적용)',
    hint: '인증비 상각·입고 물류비 등 고정 가산분',
    qtyLabel: '수량',
    defaultUnit: '식',
  },
}

export const ALL_BOM_GROUPS: BomGroup[] = ['fabric', 'filling', 'sub', 'labor', 'etc']

/** 로스율은 fabric·filling·sub·labor 에만 곱한다. etc(인증 상각 등)는 제외. */
export const LOSS_APPLIED_GROUPS: BomGroup[] = ['fabric', 'filling', 'sub', 'labor']

export interface BomLine {
  id: ID
  projectId: ID
  group: BomGroup
  name: string
  /** 규격·폭·색상 등 메모 */
  spec: string
  /** 요척 / 중량 / 수량 */
  qty: number
  /** 'yd' | 'm' | 'kg' | 'ea' | '식' 등 자유 입력 */
  unit: string
  unitPrice: number
  note: string
  order: number
}

export type VatMode = 'included' | 'excluded'

/** 프로젝트당 1건 (primary key = projectId) */
export interface CostSettings {
  projectId: ID
  /** 불량·로스율 % — 그룹1~4에만 적용 */
  lossRatePct: number
  /** 입력한 판매가가 VAT 포함인지 */
  vatMode: VatMode
}

/* ───────────────────────── 판매 채널 / 마진 ───────────────────────── */

export interface ChannelRate {
  id: ID
  name: string
  /** 판매 수수료 % */
  feePct: number
  /** 건당 고정 수수료(원) */
  fixedFeePerOrder: number
  /** 풀필먼트 입출고·배송요금(원/개). 0이면 실 택배비를 대신 사용 */
  fulfillmentPerUnit: number
  /** 기본 제공 채널 여부 */
  isBuiltin: boolean
  /** 사용자가 실제 정산 요율로 확정했는지 — false면 '요율 확인' 배지 */
  confirmed: boolean
  note: string
  order: number
}

export type ChannelOverride = Partial<
  Pick<ChannelRate, 'feePct' | 'fixedFeePerOrder' | 'fulfillmentPerUnit'>
>

/** 프로젝트당 1건 (primary key = projectId) */
export interface PricingScenario {
  projectId: ID
  /** 목표 판매가 */
  sellingPrice: number
  /** 고객에게 받는 배송비 */
  shippingChargedToCustomer: number
  /** 실제로 나가는 택배비 */
  shippingActualCost: number
  /** 기타 단위당 변동비(사은품·포장재 등) */
  otherVariablePerUnit: number
  enabledChannelIds: ID[]
  /** 이 프로젝트에서만 다르게 적용할 채널 요율 */
  overrides: Record<ID, ChannelOverride>
}

/* ───────────────────────── 재고 / 물류 ───────────────────────── */

/** 프로젝트당 1건 (primary key = projectId) */
export interface InventoryParams {
  projectId: ID
  /** 일평균 예상 판매량 */
  dailySales: number
  /** 발주 → 입고 리드타임(일) */
  leadTimeDays: number
  /** 안전율 % (리드타임 수요 대비) */
  safetyFactorPct: number
  moq: number
  onHand: number
  /** 입고 예정 수량 */
  inbound: number
  /** 목표 재고 커버 일수 */
  targetCoverDays: number
  /** 카톤 외경 mm */
  cartonW: number
  cartonD: number
  cartonH: number
  /** 카톤 1박스 입수량 */
  unitsPerCarton: number
  /** 파렛트 규격 mm (기본 T11 1100×1100) */
  palletW: number
  palletD: number
  /** 적재 가능 높이 mm (파렛트 상판 위 기준) */
  palletMaxH: number
}

/* ───────────────────────── 라벨 (한글표시사항) ───────────────────────── */

export interface CompositionRow {
  /** 부위 — 겉감 / 안감 / 충전재 */
  part: string
  material: string
  pct: number
}

/** 프로젝트당 1건 (primary key = projectId) */
export interface LabelSpec {
  projectId: ID
  productName: string
  composition: CompositionRow[]
  size: string
  /** 제조자 또는 수입자 */
  maker: string
  country: string
  /** 제조연월 'YYYY-MM' */
  madeOn: string
  /** careSymbols.ts 의 코드 목록 */
  careCodes: string[]
  precautions: string
  asName: string
  asPhone: string
  kcNumber: string
}

/* ───────────────────────── 앱 설정 ───────────────────────── */

export interface AppSettings {
  /** 싱글턴 — 항상 'app' */
  id: 'app'
  currentProjectId?: ID
  companyName: string
  defaultAssignee: string
  /** 채널 기본 요율 고지를 닫았는지 */
  rateNoticeDismissed: boolean
  updatedAt: ISODateTime
}

/* ───────────────────────── 백업 ───────────────────────── */

export const BACKUP_FORMAT = 'secretary-app-backup'
export const BACKUP_VERSION = 1

export interface BackupPhoto extends Omit<Photo, 'blob' | 'thumbBlob'> {
  /** data URL (image/jpeg;base64,...) — 사진 포함 백업일 때만 */
  blobDataUrl?: string
  thumbDataUrl?: string
}

export interface BackupFile {
  format: string
  version: number
  exportedAt: ISODateTime
  includesPhotos: boolean
  projects: Project[]
  checklistItems: ChecklistItem[]
  photos: BackupPhoto[]
  bomLines: BomLine[]
  costSettings: CostSettings[]
  pricingScenarios: PricingScenario[]
  inventoryParams: InventoryParams[]
  labelSpecs: LabelSpec[]
  channels: ChannelRate[]
  settings: AppSettings[]
}
