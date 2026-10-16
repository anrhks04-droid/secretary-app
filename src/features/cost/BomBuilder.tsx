import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Field, NumInput, TextInput, cx } from '@/components/ui/primitives'
import { addBomLine, deleteBomLine, patchBomLine, patchCostSettings } from '@/db/repo/bom'
import {
  ALL_BOM_GROUPS,
  BOM_GROUP_META,
  type BomGroup,
  type BomLine,
  type ID,
  type VatMode,
} from '@/db/schema'
import { lineAmount, type CostBreakdown } from '@/domain/cost'
import { useBomLines, useCostSettings } from '@/hooks/useData'
import { num, pct, won } from '@/lib/format'

/**
 * 상세 제조원가(A) 빌더.
 *
 * 원가를 하나의 숫자로 뭉뚱그리지 않고 요척 × 단가 단위로 쪼개 넣는다.
 * 그래야 단가 협상이나 소재 변경 때 어디를 건드려야 하는지가 바로 보인다.
 */
export function BomBuilder({ projectId, cost }: { projectId: ID; cost: CostBreakdown }) {
  const lines = useBomLines(projectId)
  const settings = useCostSettings(projectId)
  const [open, setOpen] = useState<Set<BomGroup>>(new Set(['fabric']))

  if (!lines || !settings) return null

  const toggle = (g: BomGroup) => {
    const next = new Set(open)
    if (next.has(g)) next.delete(g)
    else next.add(g)
    setOpen(next)
  }

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-end gap-3 px-4 py-4">
        <Field label="불량·로스율" hint="주원단~임가공비에만 적용" className="w-28">
          <NumInput
            decimal
            value={settings.lossRatePct}
            suffix="%"
            onChange={(n) => void patchCostSettings(projectId, { lossRatePct: n })}
          />
        </Field>

        <Field label="판매가 기준" hint="마진 계산 방식이 달라집니다" className="w-40">
          <div className="flex rounded-xl border border-slate-300 p-0.5 dark:border-slate-700">
            {(['included', 'excluded'] as VatMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => void patchCostSettings(projectId, { vatMode: mode })}
                className={cx(
                  'min-h-9 flex-1 rounded-lg text-xs font-medium transition-colors',
                  settings.vatMode === mode
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-300',
                )}
              >
                {mode === 'included' ? 'VAT 포함' : 'VAT 별도'}
              </button>
            ))}
          </div>
        </Field>

        <div className="ml-auto text-right">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">제조원가 A</p>
          <p className="tabular text-2xl font-bold text-slate-900 dark:text-slate-50">
            {won(cost.total)}
          </p>
          {cost.lossAmount > 0 && (
            <p className="text-[11px] text-slate-400">로스 가산 {won(cost.lossAmount)} 포함</p>
          )}
        </div>
      </Card>

      {ALL_BOM_GROUPS.map((group) => {
        const meta = BOM_GROUP_META[group]
        const subtotal = cost.groups.find((g) => g.group === group)!
        const groupLines = lines.filter((l) => l.group === group)
        const expanded = open.has(group)

        return (
          <Card key={group} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(group)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {meta.label}
                </p>
                <p className="truncate text-[11px] text-slate-400">{meta.hint}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {won(subtotal.amount)}
                </p>
                {subtotal.amount > 0 && (
                  <p className="text-[11px] text-slate-400">{pct(subtotal.sharePct, 0)}</p>
                )}
              </div>
              <ChevronDown
                size={18}
                className={cx('shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')}
              />
            </button>

            {expanded && (
              <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
                {groupLines.length === 0 ? (
                  <p className="px-1 pb-2 text-xs text-slate-400">
                    아직 항목이 없습니다. 아래 버튼으로 추가하세요.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {groupLines.map((line) => (
                      <BomLineRow key={line.id} line={line} qtyLabel={meta.qtyLabel} />
                    ))}
                  </ul>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => void addBomLine(projectId, group)}
                >
                  <Plus size={15} />
                  {meta.label} 항목 추가
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function BomLineRow({ line, qtyLabel }: { line: BomLine; qtyLabel: string }) {
  const amount = lineAmount(line)

  return (
    <li className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
      <div className="flex gap-2">
        <TextInput
          value={line.name}
          placeholder="품명 (예: 60수 면 20수)"
          onChange={(e) => void patchBomLine(line.id, { name: e.target.value })}
        />
        <Button
          variant="ghost"
          aria-label="항목 삭제"
          onClick={() => void deleteBomLine(line.id)}
          className="shrink-0"
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_4.5rem_1fr] gap-2">
        <Field label={qtyLabel}>
          <NumInput
            decimal
            value={line.qty}
            onChange={(n) => void patchBomLine(line.id, { qty: n })}
          />
        </Field>
        <Field label="단위">
          <TextInput
            value={line.unit}
            className="text-center"
            onChange={(e) => void patchBomLine(line.id, { unit: e.target.value })}
          />
        </Field>
        <Field label="단가">
          <NumInput
            value={line.unitPrice}
            suffix="원"
            onChange={(n) => void patchBomLine(line.id, { unitPrice: n })}
          />
        </Field>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <TextInput
          value={line.spec}
          placeholder="규격·색상 메모"
          className="min-h-9 text-xs"
          onChange={(e) => void patchBomLine(line.id, { spec: e.target.value })}
        />
        <Badge tone={amount > 0 ? 'brand' : 'neutral'} className="shrink-0">
          {num(line.qty)} × {num(line.unitPrice)} = {won(amount)}
        </Badge>
      </div>
    </li>
  )
}
