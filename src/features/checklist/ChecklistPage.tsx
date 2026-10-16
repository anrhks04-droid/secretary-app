import {
  CalendarClock,
  ChevronDown,
  CircleCheck,
  FolderPlus,
  Images,
  Paperclip,
  Pencil,
  Plus,
  Ruler,
  Settings2,
  User,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  TextInput,
  cx,
} from '@/components/ui/primitives'
import { addItem, toggleItem } from '@/db/repo/checklist'
import {
  ALL_STEPS,
  STEP_META,
  type ChecklistItem,
  type StepNo,
  type ToolKey,
} from '@/db/schema'
import { useChecklist, useCurrentProject, usePhotos } from '@/hooks/useData'
import { computeProgress } from '@/domain/progress'
import { daysUntil, ddayLabel } from '@/lib/date'
import { ItemSheet } from './ItemSheet'
import { LabelGeneratorSheet } from '../tools/LabelGeneratorSheet'
import { QcLogSheet } from '../tools/QcLogSheet'
import { ReorderCalculatorSheet } from '../tools/ReorderCalculatorSheet'

const TOOL_LABEL: Record<ToolKey, string> = {
  qc: 'QC 사진 기록장',
  label: '한글표시사항 생성기',
  reorder: '재고·적재 계산기',
}

export function ChecklistPage() {
  const project = useCurrentProject()
  const items = useChecklist(project?.id)
  const photos = usePhotos(project?.id)
  const navigate = useNavigate()

  // items 를 이미 구독하고 있으므로 진행률은 여기서 바로 계산한다.
  // 따로 구독하면 두 구독이 서로 다른 틱에 채워져 진행률이 한 박자 늦게 뜬다.
  const progress = useMemo(() => computeProgress(items ?? []), [items])

  const [openSteps, setOpenSteps] = useState<Set<StepNo> | null>(null)
  const [activeItem, setActiveItem] = useState<ChecklistItem>()
  const [activeTool, setActiveTool] = useState<ToolKey>()

  const photoCountByItem = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of photos ?? []) {
      if (p.itemId) map.set(p.itemId, (map.get(p.itemId) ?? 0) + 1)
    }
    return map
  }, [photos])

  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={<FolderPlus size={44} strokeWidth={1.4} />}
          title="아직 프로젝트가 없습니다"
          description="프로젝트를 먼저 만들면 6단계 체크리스트가 여기에 나타납니다."
          action={
            <Button variant="primary" onClick={() => navigate('/project/new')}>
              프로젝트 만들기
            </Button>
          }
        />
      </Card>
    )
  }

  if (!items) return null

  // 처음 열 때는 아직 안 끝난 단계만 펼쳐 둔다 — 현장에서 바로 할 일이 보이게
  const expanded = openSteps ?? new Set<StepNo>(progress.currentStep ? [progress.currentStep] : [1])

  const toggleStep = (step: StepNo) => {
    const next = new Set(expanded)
    if (next.has(step)) next.delete(step)
    else next.add(step)
    setOpenSteps(next)
  }

  const dday = project.targetLaunchDate ? ddayLabel(project.targetLaunchDate) : null

  return (
    <div className="space-y-4">
      <Card className="px-4 py-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-900 dark:text-slate-50">
              {project.name}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {project.category && <span>{project.category}</span>}
              {project.sizeSpec && (
                <span className="inline-flex items-center gap-1">
                  <Ruler size={12} />
                  {project.sizeSpec}
                </span>
              )}
              {dday && (
                <Badge tone={dday.startsWith('D+') ? 'danger' : 'brand'}>출시 {dday}</Badge>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="프로젝트 수정"
            onClick={() => navigate(`/project/${project.id}/edit`)}
          >
            <Settings2 size={18} />
          </Button>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">전체 진행률</span>
            <span className="tabular font-semibold text-slate-700 dark:text-slate-200">
              {progress.done}/{progress.total} · {Math.round(progress.pct)}%
            </span>
          </div>
          <ProgressBar pct={progress.pct} tone={progress.pct >= 100 ? 'success' : 'brand'} />
        </div>
      </Card>

      {ALL_STEPS.map((step) => (
        <StepSection
          key={step}
          step={step}
          projectId={project.id}
          items={items.filter((i) => i.step === step)}
          open={expanded.has(step)}
          onToggle={() => toggleStep(step)}
          photoCountByItem={photoCountByItem}
          onOpenItem={setActiveItem}
          onOpenTool={setActiveTool}
        />
      ))}

      <ItemSheet
        item={activeItem}
        projectId={project.id}
        onClose={() => setActiveItem(undefined)}
        onOpenTool={(tool) => {
          setActiveItem(undefined)
          setActiveTool(tool)
        }}
      />

      <QcLogSheet
        open={activeTool === 'qc'}
        projectId={project.id}
        onClose={() => setActiveTool(undefined)}
      />
      <LabelGeneratorSheet
        open={activeTool === 'label'}
        projectId={project.id}
        onClose={() => setActiveTool(undefined)}
      />
      <ReorderCalculatorSheet
        open={activeTool === 'reorder'}
        projectId={project.id}
        onClose={() => setActiveTool(undefined)}
      />
    </div>
  )
}

function StepSection({
  step,
  projectId,
  items,
  open,
  onToggle,
  photoCountByItem,
  onOpenItem,
  onOpenTool,
}: {
  step: StepNo
  projectId: string
  items: ChecklistItem[]
  open: boolean
  onToggle: () => void
  photoCountByItem: Map<string, number>
  onOpenItem: (item: ChecklistItem) => void
  onOpenTool: (tool: ToolKey) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const done = items.filter((i) => i.done).length
  const pct = items.length > 0 ? (done / items.length) * 100 : 0
  const complete = items.length > 0 && done === items.length

  const submitNew = async () => {
    if (draft.trim()) await addItem(projectId, step, draft)
    setDraft('')
    setAdding(false)
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className={cx(
            'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
            complete
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
          )}
        >
          {complete ? <CircleCheck size={18} /> : step}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {STEP_META[step].title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar pct={pct} tone={complete ? 'success' : 'brand'} />
            <span className="tabular shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
              {done}/{items.length}
            </span>
          </div>
        </div>

        <ChevronDown
          size={18}
          className={cx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                photoCount={photoCountByItem.get(item.id) ?? 0}
                onOpen={() => onOpenItem(item)}
                onOpenTool={onOpenTool}
              />
            ))}
          </ul>

          <div className="px-3 py-2.5">
            {adding ? (
              <div className="flex gap-2">
                <TextInput
                  autoFocus
                  value={draft}
                  placeholder="추가할 항목"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitNew()
                    if (e.key === 'Escape') setAdding(false)
                  }}
                />
                <Button variant="primary" onClick={() => void submitNew()}>
                  추가
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
                <Plus size={15} />항목 추가
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function ItemRow({
  item,
  photoCount,
  onOpen,
  onOpenTool,
}: {
  item: ChecklistItem
  photoCount: number
  onOpen: () => void
  onOpenTool: (tool: ToolKey) => void
}) {
  const due = item.dueDate ? daysUntil(item.dueDate) : null
  const overdue = !item.done && due !== null && due < 0
  const soon = !item.done && due !== null && due >= 0 && due <= 7

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <button
        type="button"
        aria-label={item.done ? '완료 해제' : '완료 체크'}
        aria-pressed={item.done}
        onClick={() => void toggleItem(item.id)}
        className={cx(
          // 44px 터치 영역 확보 — 현장에서 손가락으로 빠르게 체크
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
          item.done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-600 dark:hover:bg-emerald-950',
        )}
      >
        {item.done && <CircleCheck size={18} />}
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-0.5 text-left">
        <p
          className={cx(
            'text-sm leading-snug',
            item.done
              ? 'text-slate-400 line-through dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100',
          )}
        >
          {item.title}
        </p>

        {(item.assignee || item.dueDate || item.memo || photoCount > 0) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {item.assignee && (
              <span className="inline-flex items-center gap-0.5">
                <User size={11} />
                {item.assignee}
              </span>
            )}
            {item.dueDate && (
              <span
                className={cx(
                  'inline-flex items-center gap-0.5',
                  overdue && 'font-semibold text-rose-600 dark:text-rose-400',
                  soon && 'font-semibold text-amber-600 dark:text-amber-400',
                )}
              >
                <CalendarClock size={11} />
                {item.dueDate.slice(5)} {overdue ? `(${-due!}일 지남)` : soon ? `(D-${due})` : ''}
              </span>
            )}
            {photoCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Images size={11} />
                {photoCount}
              </span>
            )}
            {item.memo && <Paperclip size={11} />}
          </p>
        )}
      </button>

      {item.toolKey && (
        <button
          type="button"
          aria-label={TOOL_LABEL[item.toolKey]}
          title={TOOL_LABEL[item.toolKey]}
          onClick={() => onOpenTool(item.toolKey!)}
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300"
        >
          <Wrench size={15} />
        </button>
      )}

      <button
        type="button"
        aria-label="상세"
        onClick={onOpen}
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
      >
        <Pencil size={15} />
      </button>
    </li>
  )
}
