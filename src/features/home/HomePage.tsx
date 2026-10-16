import { ChevronRight, FolderPlus, PackageSearch, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle } from '@/components/ui/primitives'
import { setCurrentProject } from '@/db/repo/settings'
import { PROJECT_STATUS_LABEL, STEP_META, type Project } from '@/db/schema'
import { computeProgress } from '@/domain/progress'
import { useAllChecklists, useProjects } from '@/hooks/useData'
import { ddayLabel, formatDateKo } from '@/lib/date'
import { BriefingWidget } from './BriefingWidget'

export function HomePage() {
  const projects = useProjects()
  const navigate = useNavigate()

  if (!projects) return null

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<PackageSearch size={44} strokeWidth={1.4} />}
          title="첫 제품 프로젝트를 만들어 보세요"
          description="프로젝트를 만들면 소싱부터 CS까지 6단계 체크리스트가 자동으로 깔립니다."
          action={
            <Button variant="primary" size="lg" onClick={() => navigate('/project/new')}>
              <FolderPlus size={18} />
              프로젝트 만들기
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>오늘의 비서 브리핑</SectionTitle>
        <BriefingWidget />
      </section>

      <section>
        <SectionTitle
          right={
            <Button size="sm" variant="ghost" onClick={() => navigate('/project/new')}>
              <Plus size={15} />새 프로젝트
            </Button>
          }
        >
          프로젝트 {projects.length}건
        </SectionTitle>

        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const checklists = useAllChecklists()
  const navigate = useNavigate()

  const items = checklists?.get(project.id) ?? []
  const progress = computeProgress(items)
  const dday = project.targetLaunchDate ? ddayLabel(project.targetLaunchDate) : null
  const overdue = dday?.startsWith('D+') ?? false

  const open = async () => {
    await setCurrentProject(project.id)
    navigate('/checklist')
  }

  return (
    <Card as="li" className="overflow-hidden">
      <button type="button" onClick={() => void open()} className="w-full px-4 py-4 text-left">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 dark:text-slate-50">
              {project.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {[project.category, project.sizeSpec].filter(Boolean).join(' · ') || '규격 미입력'}
            </p>
          </div>
          <Badge tone={project.status === 'selling' ? 'success' : 'neutral'}>
            {PROJECT_STATUS_LABEL[project.status]}
          </Badge>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-slate-300" />
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {progress.currentStep
                ? `STEP ${progress.currentStep} ${STEP_META[progress.currentStep].short} 진행 중`
                : '전 단계 완료'}
            </span>
            <span className="tabular font-semibold text-slate-700 dark:text-slate-200">
              {progress.done}/{progress.total} · {Math.round(progress.pct)}%
            </span>
          </div>
          <ProgressBar pct={progress.pct} tone={progress.pct >= 100 ? 'success' : 'brand'} />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          {project.targetLaunchDate ? (
            <>
              <Badge tone={overdue ? 'danger' : 'brand'}>출시 {dday}</Badge>
              <span className="text-slate-400">{formatDateKo(project.targetLaunchDate)}</span>
            </>
          ) : (
            <span className="text-slate-400">목표 출시일 미설정</span>
          )}
        </div>
      </button>
    </Card>
  )
}
