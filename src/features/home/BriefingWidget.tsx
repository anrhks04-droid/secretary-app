import { AlertTriangle, CalendarClock, CheckCircle2, Flag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, cx } from '@/components/ui/primitives'
import { toggleItem } from '@/db/repo/checklist'
import { setCurrentProject } from '@/db/repo/settings'
import { STEP_META } from '@/db/schema'
import { useAllChecklists, useProjects } from '@/hooks/useData'
import { buildBriefing, type BriefingEntry, type BriefingKind } from '@/domain/progress'

const KIND_STYLE: Record<
  BriefingKind,
  { icon: typeof AlertTriangle; dot: string; text: string; label: string }
> = {
  overdue: {
    icon: AlertTriangle,
    dot: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    label: '지연',
  },
  dueSoon: {
    icon: CalendarClock,
    dot: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    label: '임박',
  },
  launchRisk: {
    icon: Flag,
    dot: 'bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
    text: 'text-brand-600 dark:text-brand-400',
    label: '출시 위험',
  },
}

/**
 * 오늘의 비서 브리핑.
 * "지금 안 하면 출시가 밀리는 일"만 위에 모아 보여 준다.
 * 체크박스를 바로 누를 수 있어서, 현장에서 브리핑만 보고 처리할 수 있다.
 */
export function BriefingWidget() {
  const projects = useProjects()
  const checklists = useAllChecklists()
  const navigate = useNavigate()

  if (!projects || !checklists) return null

  const entries = buildBriefing(projects, checklists, 5)

  if (entries.length === 0) {
    return (
      <Card className="flex items-center gap-3 px-4 py-4">
        <CheckCircle2 size={22} className="shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            지금 급한 일은 없습니다.
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            마감일을 넣어 두면 지연되기 전에 여기로 알려 드립니다.
          </p>
        </div>
      </Card>
    )
  }

  const open = async (entry: BriefingEntry) => {
    await setCurrentProject(entry.projectId)
    navigate('/checklist')
  }

  return (
    <Card>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => {
          const style = KIND_STYLE[entry.kind]
          const Icon = style.icon
          return (
            <li key={entry.item.id} className="flex items-start gap-3 px-3 py-3">
              <button
                type="button"
                aria-label={`${entry.item.title} 완료 처리`}
                onClick={() => void toggleItem(entry.item.id)}
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-600 dark:hover:bg-emerald-950"
              />

              <button
                type="button"
                onClick={() => void open(entry)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {entry.item.title}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className={cx('inline-flex items-center gap-1 font-medium', style.text)}>
                    <Icon size={12} />
                    {entry.reason}
                  </span>
                  <span>·</span>
                  <span className="truncate">{entry.projectName}</span>
                  <span>·</span>
                  <span>STEP {entry.item.step} {STEP_META[entry.item.step].short}</span>
                </p>
              </button>

              <span
                className={cx(
                  'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  style.dot,
                )}
              >
                {style.label}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
