import { AlertCircle, Check, Copy, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CareSymbolIcon } from '@/components/CareSymbolIcon'
import { Badge, Button, Card, Field, NumInput, TextArea, TextInput, cx } from '@/components/ui/primitives'
import { Sheet } from '@/components/ui/Sheet'
import {
  CARE_FAMILY_LABEL,
  CARE_FAMILY_ORDER,
  CARE_BY_CODE,
  careSymbolsOf,
} from '@/data/careSymbols'
import { patchLabelSpec } from '@/db/repo/tools'
import type { CompositionRow, ID, LabelSpec } from '@/db/schema'
import { buildLabelText, groupComposition, validateLabel } from '@/domain/label'
import { useLabelSpec } from '@/hooks/useData'
import { thisMonthISO } from '@/lib/date'

const PART_PRESETS = ['겉감', '안감', '충전재', '배색', '시접']

/**
 * 법정 한글표시사항 & 세탁기호 생성기.
 *
 * 혼용률·치수·제조국만 넣으면 라벨 인쇄용 표준 문구가 자동으로 조합된다.
 * 합계 100% 검증이 들어 있어서, 라벨을 찍고 나서야 발견하는 사고를 막는다.
 */
export function LabelGeneratorSheet({
  open,
  projectId,
  onClose,
}: {
  open: boolean
  projectId: ID
  onClose: () => void
}) {
  const saved = useLabelSpec(projectId)
  const [spec, setSpec] = useState<LabelSpec>()
  const [copied, setCopied] = useState(false)

  // 시트를 열 때 저장본을 폼에 싣는다
  useEffect(() => {
    if (open && saved && !spec) setSpec(saved)
    if (!open && spec) setSpec(undefined)
  }, [open, saved, spec])

  // 입력이 멈추면 자동 저장 — 현장에서 저장 버튼을 깜빡해도 날아가지 않게
  useEffect(() => {
    if (!open || !spec) return
    const t = setTimeout(() => void patchLabelSpec(projectId, spec), 500)
    return () => clearTimeout(t)
  }, [open, spec, projectId])

  if (!open || !spec) return null

  const set = <K extends keyof LabelSpec>(key: K, value: LabelSpec[K]) =>
    setSpec((s) => (s ? { ...s, [key]: value } : s))

  const setRow = (index: number, patch: Partial<CompositionRow>) =>
    set(
      'composition',
      spec.composition.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    )

  const parts = groupComposition(spec)
  const validation = validateLabel(spec)
  const text = buildLabelText(spec)

  const toggleCare = (code: string) => {
    const family = CARE_BY_CODE[code]?.family
    const already = spec.careCodes.includes(code)
    // 같은 계열(물세탁·표백·…)에서는 하나만 고를 수 있다
    const withoutFamily = spec.careCodes.filter((c) => CARE_BY_CODE[c]?.family !== family)
    set('careCodes', already ? withoutFamily : [...withoutFamily, code])
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Sheet
      open
      wide
      onClose={async () => {
        await patchLabelSpec(projectId, spec)
        onClose()
      }}
      title="한글표시사항 & 세탁기호 생성기"
      subtitle="라벨 인쇄용 표준 문구를 자동으로 조합합니다"
      footer={
        <Button full variant="primary" onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? '복사했습니다' : '라벨 문구 복사'}
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="제품명 *">
          <TextInput
            value={spec.productName}
            onChange={(e) => set('productName', e.target.value)}
            placeholder="예: 호텔식 구스 이불"
          />
        </Field>

        {/* 혼용률 */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              소재 혼용률 * <span className="text-slate-400">(부위별 합계 100%)</span>
            </p>
            <div className="flex gap-1">
              {parts.map((p) => (
                <Badge key={p.part} tone={p.valid ? 'success' : 'danger'}>
                  {p.part} {p.sum}%
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {spec.composition.map((row, i) => (
              <div key={i} className="flex gap-2">
                <TextInput
                  list="part-presets"
                  value={row.part}
                  placeholder="부위"
                  className="w-24 shrink-0"
                  onChange={(e) => setRow(i, { part: e.target.value })}
                />
                <TextInput
                  value={row.material}
                  placeholder="소재 (예: 면)"
                  onChange={(e) => setRow(i, { material: e.target.value })}
                />
                <div className="w-24 shrink-0">
                  <NumInput
                    decimal
                    value={row.pct}
                    suffix="%"
                    onChange={(n) => setRow(i, { pct: n })}
                  />
                </div>
                <Button
                  variant="ghost"
                  aria-label="줄 삭제"
                  onClick={() =>
                    set(
                      'composition',
                      spec.composition.filter((_, idx) => idx !== i),
                    )
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          <datalist id="part-presets">
            {PART_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <Button
            size="sm"
            variant="ghost"
            className="mt-1"
            onClick={() =>
              set('composition', [
                ...spec.composition,
                { part: spec.composition.at(-1)?.part ?? '겉감', material: '', pct: 0 },
              ])
            }
          >
            <Plus size={15} />
            소재 줄 추가
          </Button>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="제품 치수 *">
            <TextInput
              value={spec.size}
              onChange={(e) => set('size', e.target.value)}
              placeholder="예: Q 200×220cm"
            />
          </Field>
          <Field label="제조자 / 수입자 *">
            <TextInput value={spec.maker} onChange={(e) => set('maker', e.target.value)} />
          </Field>
          <Field label="제조국 *">
            <TextInput value={spec.country} onChange={(e) => set('country', e.target.value)} />
          </Field>
          <Field label="제조연월 *">
            <TextInput
              type="month"
              value={spec.madeOn}
              onChange={(e) => set('madeOn', e.target.value)}
              placeholder={thisMonthISO()}
            />
          </Field>
          <Field label="A/S 책임자 *">
            <TextInput value={spec.asName} onChange={(e) => set('asName', e.target.value)} />
          </Field>
          <Field label="A/S 전화번호 *">
            <TextInput
              type="tel"
              value={spec.asPhone}
              onChange={(e) => set('asPhone', e.target.value)}
              placeholder="02-000-0000"
            />
          </Field>
          <Field label="KC 인증번호" className="sm:col-span-2">
            <TextInput value={spec.kcNumber} onChange={(e) => set('kcNumber', e.target.value)} />
          </Field>
        </div>

        {/* 세탁기호 */}
        <section>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            취급 시 주의사항 <span className="text-slate-400">(계열별로 하나씩)</span>
          </p>
          <div className="space-y-3">
            {CARE_FAMILY_ORDER.map((family) => (
              <div key={family}>
                <p className="mb-1.5 text-[11px] font-semibold text-slate-400">
                  {CARE_FAMILY_LABEL[family]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {careSymbolsOf(family).map((sym) => {
                    const on = spec.careCodes.includes(sym.code)
                    return (
                      <button
                        key={sym.code}
                        type="button"
                        title={sym.label}
                        onClick={() => toggleCare(sym.code)}
                        className={cx(
                          'flex size-12 items-center justify-center rounded-xl border-2 transition-colors',
                          on
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                            : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
                        )}
                      >
                        <CareSymbolIcon glyph={sym.glyph} size={32} />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Field label="추가 주의사항" hint="한 줄에 하나씩 — 그대로 라벨 문구에 들어갑니다">
          <TextArea
            value={spec.precautions}
            onChange={(e) => set('precautions', e.target.value)}
            placeholder={'단독 세탁\n비틀어 짜지 마세요'}
          />
        </Field>

        {/* 검증 */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <Card className="space-y-1.5 px-3 py-3">
            {validation.errors.map((e) => (
              <p key={e} className="flex gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle size={14} className="mt-px shrink-0" />
                {e}
              </p>
            ))}
            {validation.warnings.map((w) => (
              <p key={w} className="flex gap-2 text-xs text-amber-600 dark:text-amber-400">
                <TriangleAlert size={14} className="mt-px shrink-0" />
                {w}
              </p>
            ))}
          </Card>
        )}

        {/* 생성 결과 */}
        <section>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            라벨 인쇄용 문구
          </p>
          <Card className="px-3 py-3">
            <pre className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-100">
              {text}
            </pre>
            {spec.careCodes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                {spec.careCodes.map((code) => {
                  const sym = CARE_BY_CODE[code]
                  return sym ? <CareSymbolIcon key={code} glyph={sym.glyph} size={36} /> : null
                })}
              </div>
            )}
          </Card>
        </section>
      </div>
    </Sheet>
  )
}
