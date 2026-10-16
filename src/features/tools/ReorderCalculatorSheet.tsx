import { Boxes, PackageCheck, TriangleAlert } from 'lucide-react'
import { Badge, Card, Field, NumInput } from '@/components/ui/primitives'
import { Sheet } from '@/components/ui/Sheet'
import { patchInventory } from '@/db/repo/tools'
import type { ID, InventoryParams } from '@/db/schema'
import { computePallet, computeReorder } from '@/domain/inventory'
import { useInventory } from '@/hooks/useData'
import { num } from '@/lib/format'

/**
 * 안전재고 · 발주점 · 파렛트 적재 계산기.
 *
 * 품절은 랭킹을 떨어뜨리고, 과발주는 창고비로 돌아온다.
 * 일평균 판매량과 리드타임만 넣으면 "언제 얼마나 발주할지"가 바로 나온다.
 */
export function ReorderCalculatorSheet({
  open,
  projectId,
  onClose,
}: {
  open: boolean
  projectId: ID
  onClose: () => void
}) {
  const inv = useInventory(projectId)

  if (!open || !inv) return null

  const set = (key: keyof Omit<InventoryParams, 'projectId'>, value: number) =>
    void patchInventory(projectId, { [key]: value })

  const r = computeReorder(inv)
  const pallet = computePallet(inv)

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title="안전재고 · 발주점 계산기"
      subtitle="일평균 판매량 × 리드타임 기준"
    >
      <div className="space-y-5">
        <section>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">판매·발주 조건</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="일평균 판매량">
              <NumInput value={inv.dailySales} suffix="개" onChange={(n) => set('dailySales', n)} />
            </Field>
            <Field label="리드타임">
              <NumInput value={inv.leadTimeDays} suffix="일" onChange={(n) => set('leadTimeDays', n)} />
            </Field>
            <Field label="안전율">
              <NumInput
                value={inv.safetyFactorPct}
                suffix="%"
                onChange={(n) => set('safetyFactorPct', n)}
              />
            </Field>
            <Field label="현재고">
              <NumInput value={inv.onHand} suffix="개" onChange={(n) => set('onHand', n)} />
            </Field>
            <Field label="입고 예정">
              <NumInput value={inv.inbound} suffix="개" onChange={(n) => set('inbound', n)} />
            </Field>
            <Field label="MOQ">
              <NumInput value={inv.moq} suffix="개" onChange={(n) => set('moq', n)} />
            </Field>
            <Field label="목표 커버 일수" className="col-span-2 sm:col-span-1">
              <NumInput
                value={inv.targetCoverDays}
                suffix="일"
                onChange={(n) => set('targetCoverDays', n)}
              />
            </Field>
          </div>
        </section>

        {/* 결과 */}
        <Card
          className={
            r.shouldOrderNow
              ? 'border-rose-300 bg-rose-50 px-4 py-4 dark:border-rose-800 dark:bg-rose-950/40'
              : 'px-4 py-4'
          }
        >
          <div className="mb-3 flex items-center gap-2">
            {r.shouldOrderNow ? (
              <>
                <TriangleAlert size={18} className="text-rose-600" />
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  발주점에 도달했습니다 — 지금 발주하세요
                </p>
              </>
            ) : (
              <>
                <PackageCheck size={18} className="text-emerald-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  당장 발주하지 않아도 됩니다
                </p>
              </>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="리드타임 수요" value={`${num(r.leadTimeDemand)}개`} />
            <Stat label="안전재고" value={`${num(r.safetyStock)}개`} />
            <Stat label="발주점(ROP)" value={`${num(r.reorderPoint)}개`} strong />
            <Stat
              label="재고 소진 예상"
              value={r.daysOfStock === null ? '—' : `${num(r.daysOfStock)}일 후`}
            />
            <Stat label="가용재고" value={`${num(r.available)}개`} />
            <Stat label="목표재고" value={`${num(r.targetStock)}개`} />
            <Stat label="순수 부족분" value={`${num(r.rawShortage)}개`} />
            <Stat
              label="권장 발주수량"
              value={`${num(r.suggestedOrderQty)}개`}
              strong
              hint={inv.moq > 0 ? `MOQ ${num(inv.moq)} 단위 올림` : undefined}
            />
          </dl>
        </Card>

        {/* 파렛트 적재 */}
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Boxes size={14} />
            카톤 입수량 · 파렛트 적재
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="카톤 가로">
              <NumInput value={inv.cartonW} suffix="mm" onChange={(n) => set('cartonW', n)} />
            </Field>
            <Field label="카톤 세로">
              <NumInput value={inv.cartonD} suffix="mm" onChange={(n) => set('cartonD', n)} />
            </Field>
            <Field label="카톤 높이">
              <NumInput value={inv.cartonH} suffix="mm" onChange={(n) => set('cartonH', n)} />
            </Field>
            <Field label="박스당 입수">
              <NumInput value={inv.unitsPerCarton} suffix="개" onChange={(n) => set('unitsPerCarton', n)} />
            </Field>
            <Field label="파렛트 가로">
              <NumInput value={inv.palletW} suffix="mm" onChange={(n) => set('palletW', n)} />
            </Field>
            <Field label="파렛트 세로">
              <NumInput value={inv.palletD} suffix="mm" onChange={(n) => set('palletD', n)} />
            </Field>
            <Field label="적재 높이" className="col-span-2 sm:col-span-2">
              <NumInput value={inv.palletMaxH} suffix="mm" onChange={(n) => set('palletMaxH', n)} />
            </Field>
          </div>

          <Card className="mt-3 px-4 py-4">
            {pallet.valid ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  <Stat
                    label="1단 적재 박스"
                    value={`${pallet.perLayer}박스`}
                    hint={`가로배치 ${pallet.perLayerA} / 세로배치 ${pallet.perLayerB}`}
                  />
                  <Stat label="적재 단수" value={`${pallet.layers}단`} />
                  <Stat label="파렛트당 박스" value={`${num(pallet.cartonsPerPallet)}박스`} strong />
                  <Stat label="파렛트당 수량" value={`${num(pallet.unitsPerPallet)}개`} strong />
                </dl>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Badge tone={pallet.floorUsagePct >= 80 ? 'success' : 'warning'}>
                    바닥 사용률 {pallet.floorUsagePct.toFixed(0)}%
                  </Badge>
                  한 방향으로만 깔았을 때 기준입니다. 현장에서 엇갈려 쌓으면 더 들어갈 수 있습니다.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                카톤 외경과 파렛트 규격을 입력하면 적재 수량이 계산됩니다.
              </p>
            )}
          </Card>
        </section>
      </div>
    </Sheet>
  )
}

function Stat({
  label,
  value,
  hint,
  strong,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
}) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={
          strong
            ? 'tabular text-base font-bold text-brand-700 dark:text-brand-300'
            : 'tabular text-sm font-semibold text-slate-800 dark:text-slate-100'
        }
      >
        {value}
      </dd>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}
