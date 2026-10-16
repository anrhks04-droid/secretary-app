import { FolderPlus, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, cx } from '@/components/ui/primitives'
import { summarizeDefects } from '@/db/repo/photos'
import {
  ALL_BOM_GROUPS,
  ALL_STEPS,
  BOM_GROUP_META,
  PROJECT_STATUS_LABEL,
  SEVERITY_LABEL,
  STEP_META,
  type Photo,
} from '@/db/schema'
import { lineAmount } from '@/domain/cost'
import { buildLabelText, validateLabel } from '@/domain/label'
import {
  useBomLines,
  useChannelMargins,
  useChecklist,
  useCurrentProject,
  useLabelSpec,
  useObjectUrl,
  usePhotos,
  useProgress,
  useSettings,
} from '@/hooks/useData'
import { formatDateKo, ddayLabel, todayISO } from '@/lib/date'
import { num, pct, won, wonSigned } from '@/lib/format'

/**
 * A4 인쇄 / PDF 공유용 리포트.
 *
 * 공장 작업자나 거래처에 그대로 종이로 뽑아 주거나, 모바일에서 'PDF로 저장' 후
 * 카톡으로 보내는 것이 목적이다. print.css 가 앱 크롬을 전부 숨기고
 * .print-page 단위로 페이지를 끊는다.
 */
export function ReportPage() {
  const project = useCurrentProject()
  const settings = useSettings()
  const items = useChecklist(project?.id)
  const progress = useProgress(project?.id)
  const bomLines = useBomLines(project?.id)
  const photos = usePhotos(project?.id)
  const labelSpec = useLabelSpec(project?.id)
  const { results, cost, scenario, basis } = useChannelMargins(project?.id)
  const navigate = useNavigate()

  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={<FolderPlus size={44} strokeWidth={1.4} />}
          title="출력할 프로젝트가 없습니다"
          action={
            <Button variant="primary" onClick={() => navigate('/project/new')}>
              프로젝트 만들기
            </Button>
          }
        />
      </Card>
    )
  }

  if (!items || !bomLines || !photos || !scenario) return null

  const defects = photos.filter((p) => p.kind === 'defect')
  const defectSummary = summarizeDefects(defects)
  const goldenSamples = photos.filter((p) => p.kind === 'golden')
  const labelText = labelSpec ? buildLabelText(labelSpec) : ''
  const labelOk = labelSpec ? validateLabel(labelSpec).ok : false

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          A4 {labelOk ? 5 : 4}페이지로 출력됩니다. 모바일에서는 공유 → PDF로 저장하세요.
        </p>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={16} />
          인쇄 · PDF 저장
        </Button>
      </div>

      <div className="print-root space-y-4 text-slate-900 dark:text-slate-100">
        {/* ── 1p 프로젝트 개요 ── */}
        <Sheet2 className="print-page">
          <ReportHeader
            company={settings?.companyName}
            title="제품 런칭 진행 보고서"
            project={project.name}
          />

          <Grid>
            <Info label="품목명" value={project.name} />
            <Info label="카테고리" value={project.category || '—'} />
            <Info label="규격 · 사이즈" value={project.sizeSpec || '—'} />
            <Info label="진행 상태" value={PROJECT_STATUS_LABEL[project.status]} />
            <Info
              label="목표 출시일"
              value={
                project.targetLaunchDate
                  ? `${formatDateKo(project.targetLaunchDate)} (${ddayLabel(project.targetLaunchDate)})`
                  : '미설정'
              }
            />
            <Info label="전체 진행률" value={`${progress.done}/${progress.total} · ${Math.round(progress.pct)}%`} />
          </Grid>

          <H2>단계별 진행률</H2>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 dark:bg-slate-800">
                <Th className="text-left">단계</Th>
                <Th>완료</Th>
                <Th>전체</Th>
                <Th>진행률</Th>
              </tr>
            </thead>
            <tbody>
              {progress.steps.map((s) => (
                <tr key={s.step} className="border-b border-slate-200">
                  <Td className="text-left">
                    STEP {s.step} · {STEP_META[s.step].title}
                  </Td>
                  <Td>{s.done}</Td>
                  <Td>{s.total}</Td>
                  <Td className="font-semibold">{Math.round(s.pct)}%</Td>
                </tr>
              ))}
            </tbody>
          </table>

          {project.memo && (
            <>
              <H2>메모</H2>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{project.memo}</p>
            </>
          )}

          {goldenSamples.length > 0 && (
            <>
              <H2>표준샘플 (Golden Sample)</H2>
              <PhotoGrid photos={goldenSamples.slice(0, 4)} />
            </>
          )}
        </Sheet2>

        {/* ── 2p 작업지시 체크리스트 ── */}
        <Sheet2 className="print-page">
          <ReportHeader
            company={settings?.companyName}
            title="작업지시 및 체크리스트"
            project={project.name}
          />

          {ALL_STEPS.map((step) => {
            const stepItems = items.filter((i) => i.step === step)
            if (stepItems.length === 0) return null
            return (
              <div key={step} className="avoid-break mb-4">
                <H2>
                  STEP {step} · {STEP_META[step].title}
                </H2>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-y border-slate-300 bg-slate-50 dark:bg-slate-800">
                      <Th className="w-8">완료</Th>
                      <Th className="text-left">항목</Th>
                      <Th className="w-20">담당자</Th>
                      <Th className="w-20">마감일</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <Td>{item.done ? '☑' : '☐'}</Td>
                        <Td className="text-left">
                          {item.title}
                          {item.memo && (
                            <span className="block text-[11px] text-slate-500">↳ {item.memo}</span>
                          )}
                        </Td>
                        <Td>{item.assignee || '—'}</Td>
                        <Td>{item.dueDate || '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </Sheet2>

        {/* ── 3p BOM 원가 명세 ── */}
        <Sheet2 className="print-page">
          <ReportHeader
            company={settings?.companyName}
            title="제조원가 (BOM) 명세서"
            project={project.name}
          />

          {ALL_BOM_GROUPS.map((group) => {
            const lines = bomLines.filter((l) => l.group === group)
            if (lines.length === 0) return null
            const subtotal = cost.groups.find((g) => g.group === group)!
            return (
              <div key={group} className="avoid-break mb-4">
                <H2>{BOM_GROUP_META[group].label}</H2>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-y border-slate-300 bg-slate-50 dark:bg-slate-800">
                      <Th className="text-left">품명</Th>
                      <Th className="text-left">규격</Th>
                      <Th className="w-16">{BOM_GROUP_META[group].qtyLabel}</Th>
                      <Th className="w-12">단위</Th>
                      <Th className="w-20">단가</Th>
                      <Th className="w-24">금액</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-b border-slate-200">
                        <Td className="text-left">{l.name || '—'}</Td>
                        <Td className="text-left text-slate-500">{l.spec || '—'}</Td>
                        <Td>{num(l.qty, Number.isInteger(l.qty) ? 0 : 2)}</Td>
                        <Td>{l.unit}</Td>
                        <Td className="text-right">{num(l.unitPrice)}</Td>
                        <Td className="text-right font-medium">{num(lineAmount(l))}</Td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-300 bg-slate-50 dark:bg-slate-800">
                      <Td className="text-left font-semibold" colSpan={5}>
                        소계
                      </Td>
                      <Td className="text-right font-semibold">{num(subtotal.amount)}</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}

          <div className="avoid-break mt-5 border-t-2 border-slate-800 pt-3">
            <Row label="자재·임가공 소계 (그룹1~4)" value={won(cost.lossBase)} />
            <Row label="로스 가산" value={won(cost.lossAmount)} />
            <Row label="기타 가산 (인증·물류 등)" value={won(cost.fixedAdd)} />
            <div className="mt-2 flex items-baseline justify-between border-t border-slate-300 pt-2">
              <span className="text-sm font-bold">제조원가 A (1개당)</span>
              <span className="tabular text-xl font-bold">{won(cost.total)}</span>
            </div>
          </div>
        </Sheet2>

        {/* ── 4p 마진 비교 + QC ── */}
        <Sheet2 className="print-page">
          <ReportHeader
            company={settings?.companyName}
            title="채널별 마진 시뮬레이션 · 품질 검수"
            project={project.name}
          />

          <Grid>
            <Info label="제조원가 A" value={won(cost.total)} />
            <Info label="목표 판매가" value={won(scenario.sellingPrice)} />
            <Info label="판매가 기준" value={basis.vatMode === 'included' ? 'VAT 포함' : 'VAT 별도'} />
            <Info label="실 택배비" value={won(scenario.shippingActualCost)} />
          </Grid>

          <H2>채널별 마진 비교</H2>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 dark:bg-slate-800">
                <Th className="text-left">채널</Th>
                <Th>수수료</Th>
                <Th>물류비</Th>
                <Th>공헌이익</Th>
                <Th>마진율</Th>
                <Th>BEP ROAS</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.channelId} className="border-b border-slate-200">
                  <Td className="text-left">
                    {r.channelName}
                    {!r.confirmed && <span className="ml-1 text-[10px] text-slate-500">(요율 확인 필요)</span>}
                  </Td>
                  <Td className="text-right">{num(r.fee)}</Td>
                  <Td className="text-right">{num(r.logistics)}</Td>
                  <Td className="text-right font-semibold">{wonSigned(r.contribution)}</Td>
                  <Td className="text-right">{pct(r.marginPct)}</Td>
                  <Td className="text-right">{r.bepRoasPct === null ? '불가' : pct(r.bepRoasPct, 0)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[10px] text-slate-500">
            공헌이익 = 공급가 − 제조원가 − 채널수수료 − 물류비 − 기타 변동비 / 손익분기 ROAS =
            결제금액 ÷ 공헌이익
          </p>

          <H2>품질 검수 기록</H2>
          {defectSummary.length === 0 ? (
            <p className="text-[13px] text-slate-500">기록된 불량이 없습니다.</p>
          ) : (
            <>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-50 dark:bg-slate-800">
                    <Th className="text-left">불량 유형</Th>
                    <Th>건수</Th>
                    <Th>수량</Th>
                    <Th>최고 심각도</Th>
                  </tr>
                </thead>
                <tbody>
                  {defectSummary.map((d) => (
                    <tr key={d.defectType} className="border-b border-slate-200">
                      <Td className="text-left">{d.defectType}</Td>
                      <Td>{d.count}</Td>
                      <Td>{num(d.qty)}</Td>
                      <Td>{SEVERITY_LABEL[d.worst]}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PhotoGrid photos={defects.slice(0, 6)} className="mt-3" />
            </>
          )}
        </Sheet2>

        {/* ── 5p 한글표시사항 (입력됐을 때만) ── */}
        {labelOk && labelSpec && (
          <Sheet2 className="print-page">
            <ReportHeader
              company={settings?.companyName}
              title="법정 한글표시사항 (라벨 사양서)"
              project={project.name}
            />
            <pre className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap">
              {labelText}
            </pre>
          </Sheet2>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── 조판 보조 ───────────────────────── */

function Sheet2({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={cx('px-6 py-6 print:border-0 print:shadow-none', className)}>{children}</Card>
  )
}

function ReportHeader({
  company,
  title,
  project,
}: {
  company?: string
  title: string
  project: string
}) {
  return (
    <header className="mb-4 border-b-2 border-slate-800 pb-2">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">{title}</h1>
        <span className="text-[11px] text-slate-500">{formatDateKo(todayISO())}</span>
      </div>
      <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-400">
        {company ? `${company} · ` : ''}
        {project}
      </p>
    </header>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-4 mb-1.5 text-[13px] font-bold">{children}</h2>
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">{children}</dl>
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 pb-1">
      <dt className="text-[10px] text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium">{value}</dd>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-[13px]">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cx('px-2 py-1.5 text-center font-semibold', className)}>{children}</th>
}

function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td colSpan={colSpan} className={cx('tabular px-2 py-1.5 text-center align-top', className)}>
      {children}
    </td>
  )
}

function PhotoGrid({ photos, className }: { photos: Photo[]; className?: string }) {
  return (
    <div className={cx('grid grid-cols-3 gap-2', className)}>
      {photos.map((p) => (
        <ReportPhoto key={p.id} photo={p} />
      ))}
    </div>
  )
}

function ReportPhoto({ photo }: { photo: Photo }) {
  const url = useObjectUrl(photo.blob)
  return (
    <figure className="avoid-break">
      <img
        src={url}
        alt={photo.caption || '검수 사진'}
        className="h-28 w-full rounded border border-slate-300 object-cover"
      />
      <figcaption className="mt-0.5 text-[10px] leading-tight text-slate-600">
        {[photo.defectType, photo.severity && SEVERITY_LABEL[photo.severity], photo.caption]
          .filter(Boolean)
          .join(' · ') || '—'}
      </figcaption>
    </figure>
  )
}
