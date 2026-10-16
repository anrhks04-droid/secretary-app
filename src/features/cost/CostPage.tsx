import { FolderPlus, Target } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  NumInput,
  SectionTitle,
  cx,
} from '@/components/ui/primitives'
import { patchScenario, toggleChannel } from '@/db/repo/pricing'
import { suggestPriceForMargin } from '@/domain/margin'
import { useChannelMargins, useCurrentProject } from '@/hooks/useData'
import { won } from '@/lib/format'
import { BomBuilder } from './BomBuilder'
import { ChannelMarginTable } from './ChannelMarginTable'

const TARGET_MARGINS = [20, 30, 40]

export function CostPage() {
  const project = useCurrentProject()
  const navigate = useNavigate()
  const { results, basis, cost, scenario, channels } = useChannelMargins(project?.id)
  const [targetMargin, setTargetMargin] = useState(30)

  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={<FolderPlus size={44} strokeWidth={1.4} />}
          title="프로젝트를 먼저 만들어 주세요"
          description="원가와 마진은 프로젝트 단위로 관리됩니다."
          action={
            <Button variant="primary" onClick={() => navigate('/project/new')}>
              프로젝트 만들기
            </Button>
          }
        />
      </Card>
    )
  }

  if (!scenario) return null

  const enabled = scenario.enabledChannelIds
  const allOn = enabled.length === 0
  const hasUnconfirmed = results.some((r) => !r.confirmed)

  // 가장 수수료가 싼 채널을 기준으로 목표 마진 역산 — "최소 이 가격은 받아야 한다"
  const cheapest = [...channels].sort((a, b) => a.feePct - b.feePct)[0]
  const suggested = cheapest ? suggestPriceForMargin(cheapest, basis, targetMargin) : null

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>① 상세 제조원가 (BOM)</SectionTitle>
        <BomBuilder projectId={project.id} cost={cost} />
      </section>

      <section>
        <SectionTitle>② 판매 조건</SectionTitle>
        <Card className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="목표 판매가">
              <NumInput
                value={scenario.sellingPrice}
                suffix="원"
                onChange={(n) => void patchScenario(project.id, { sellingPrice: n })}
              />
            </Field>
            <Field label="고객 부담 배송비">
              <NumInput
                value={scenario.shippingChargedToCustomer}
                suffix="원"
                onChange={(n) => void patchScenario(project.id, { shippingChargedToCustomer: n })}
              />
            </Field>
            <Field label="실 택배비">
              <NumInput
                value={scenario.shippingActualCost}
                suffix="원"
                onChange={(n) => void patchScenario(project.id, { shippingActualCost: n })}
              />
            </Field>
            <Field label="기타 변동비" hint="사은품·포장재 등">
              <NumInput
                value={scenario.otherVariablePerUnit}
                suffix="원"
                onChange={(n) => void patchScenario(project.id, { otherVariablePerUnit: n })}
              />
            </Field>
          </div>

          {/* 목표 마진 역산 */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
            <Target size={16} className="shrink-0 text-brand-600" />
            <span className="text-xs text-slate-600 dark:text-slate-300">목표 마진율</span>
            <div className="flex gap-1">
              {TARGET_MARGINS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMargin(m)}
                  className={cx(
                    'min-h-8 rounded-lg px-2.5 text-xs font-medium transition-colors',
                    targetMargin === m
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 dark:bg-slate-700 dark:text-slate-200',
                  )}
                >
                  {m}%
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-600 dark:text-slate-300">
              {cheapest && suggested ? (
                <>
                  <b className="text-slate-900 dark:text-slate-50">{cheapest.name}</b> 기준 권장가{' '}
                  <b className="tabular text-brand-700 dark:text-brand-300">{won(suggested)}</b>
                </>
              ) : (
                '원가를 먼저 입력해 주세요'
              )}
            </span>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle
          right={
            <span className="text-xs text-slate-400">
              {allOn ? '전체 채널' : `${enabled.length}개 채널`}
            </span>
          }
        >
          ③ 채널별 마진 비교
        </SectionTitle>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {channels.map((c) => {
            const on = allOn || enabled.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void toggleChannel(project.id, c.id)}
                className={cx(
                  'min-h-9 rounded-full border px-3 text-xs font-medium transition-colors',
                  on
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                    : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900',
                )}
              >
                {c.name}
              </button>
            )
          })}
        </div>

        {cost.total === 0 && (
          <p className="mb-3 text-xs text-slate-400">
            제조원가가 0원입니다. 위 BOM에 자재를 넣으면 실제 마진이 계산됩니다.
          </p>
        )}

        <ChannelMarginTable results={results} hasUnconfirmed={hasUnconfirmed} />

        <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <Badge>제조원가 A {won(cost.total)}</Badge>
          <Badge>{basis.vatMode === 'included' ? 'VAT 포함가 기준' : 'VAT 별도 기준'}</Badge>
          공헌이익 = 공급가 − 제조원가 − 수수료 − 물류비 − 기타 변동비
        </p>
      </section>
    </div>
  )
}
