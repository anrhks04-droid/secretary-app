import type { ChecklistItem, Project, StepNo } from '@/db/schema'
import { ALL_STEPS } from '@/db/schema'
import { daysUntil, todayISO } from '@/lib/date'

export interface StepProgress {
  step: StepNo
  done: number
  total: number
  pct: number
}

export interface ProjectProgress {
  done: number
  total: number
  pct: number
  steps: StepProgress[]
  /** 아직 완료되지 않은 가장 앞선 단계 — '지금 어디쯤인지' 표시용 */
  currentStep: StepNo | null
}

export function computeProgress(items: ChecklistItem[]): ProjectProgress {
  const steps: StepProgress[] = ALL_STEPS.map((step) => {
    const inStep = items.filter((i) => i.step === step)
    const done = inStep.filter((i) => i.done).length
    return {
      step,
      done,
      total: inStep.length,
      pct: inStep.length > 0 ? (done / inStep.length) * 100 : 0,
    }
  })

  const total = items.length
  const done = items.filter((i) => i.done).length
  const currentStep = steps.find((s) => s.total > 0 && s.done < s.total)?.step ?? null

  return {
    done,
    total,
    pct: total > 0 ? (done / total) * 100 : 0,
    steps,
    currentStep,
  }
}

/* ───────────────────────── 오늘의 비서 브리핑 ───────────────────────── */

export type BriefingKind = 'overdue' | 'dueSoon' | 'launchRisk'

export interface BriefingEntry {
  kind: BriefingKind
  projectId: string
  projectName: string
  item: ChecklistItem
  /** overdue면 지난 일수(양수), dueSoon이면 남은 일수 */
  days: number
  reason: string
}

const DUE_SOON_DAYS = 7
const LAUNCH_RISK_DAYS = 21

/**
 * 한 프로젝트의 '지금 챙겨야 할 일'을 뽑는다.
 *
 * 우선순위
 *  1. 마감일이 지난 미완료 항목 (가장 많이 지난 것부터)
 *  2. 7일 안에 마감인 미완료 항목
 *  3. 출시일이 21일 안인데 1~3단계(소싱·생산·패키징)가 아직 안 끝난 항목
 *     — 뒤 단계는 앞 단계가 끝나야 진행되므로 앞 단계 지연이 곧 출시 지연이다
 */
export function buildProjectBriefing(
  project: Project,
  items: ChecklistItem[],
  today: string = todayISO(),
): BriefingEntry[] {
  const open = items.filter((i) => !i.done)
  const entries: BriefingEntry[] = []
  const seen = new Set<string>()

  const push = (item: ChecklistItem, kind: BriefingKind, days: number, reason: string) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    entries.push({ kind, projectId: project.id, projectName: project.name, item, days, reason })
  }

  const withDue = open
    .filter((i) => i.dueDate)
    .map((i) => ({ item: i, d: daysUntil(i.dueDate, today) }))
    .filter((x): x is { item: ChecklistItem; d: number } => x.d !== null)

  withDue
    .filter((x) => x.d < 0)
    .sort((a, b) => a.d - b.d)
    .forEach((x) => push(x.item, 'overdue', -x.d, `마감 ${-x.d}일 지남`))

  withDue
    .filter((x) => x.d >= 0 && x.d <= DUE_SOON_DAYS)
    .sort((a, b) => a.d - b.d)
    .forEach((x) =>
      push(x.item, 'dueSoon', x.d, x.d === 0 ? '오늘 마감' : `마감까지 ${x.d}일`),
    )

  const toLaunch = project.targetLaunchDate ? daysUntil(project.targetLaunchDate, today) : null
  if (toLaunch !== null && toLaunch <= LAUNCH_RISK_DAYS) {
    open
      .filter((i) => i.step <= 3)
      .sort((a, b) => a.step - b.step || a.order - b.order)
      .forEach((i) =>
        push(
          i,
          'launchRisk',
          toLaunch,
          toLaunch >= 0 ? `출시 D-${toLaunch} — 앞 단계 미완료` : `출시일 ${-toLaunch}일 지남`,
        ),
      )
  }

  return entries
}

const KIND_WEIGHT: Record<BriefingKind, number> = { overdue: 0, dueSoon: 1, launchRisk: 2 }

/** 여러 프로젝트를 합쳐 홈 화면 브리핑으로. 기본 5건. */
export function buildBriefing(
  projects: Project[],
  itemsByProject: Map<string, ChecklistItem[]>,
  limit = 5,
  today: string = todayISO(),
): BriefingEntry[] {
  const all = projects
    .filter((p) => p.status !== 'archived')
    .flatMap((p) => buildProjectBriefing(p, itemsByProject.get(p.id) ?? [], today))

  return all
    .sort((a, b) => {
      const w = KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind]
      if (w !== 0) return w
      // 같은 종류면 급한 것부터 (overdue는 많이 지난 것, 나머지는 남은 날이 적은 것)
      return a.kind === 'overdue' ? b.days - a.days : a.days - b.days
    })
    .slice(0, limit)
}
