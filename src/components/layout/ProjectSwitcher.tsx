import { Check, ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setCurrentProject } from '@/db/repo/settings'
import { PROJECT_STATUS_LABEL } from '@/db/schema'
import { useCurrentProject, useProjects } from '@/hooks/useData'
import { ddayLabel } from '@/lib/date'
import { Badge, Button, cx } from '@/components/ui/primitives'
import { Sheet } from '@/components/ui/Sheet'

/**
 * 헤더에 고정된 프로젝트 선택기.
 * 탭을 옮겨 다녀도 "지금 보고 있는 프로젝트"가 유지되도록, 선택은 DB(settings)에 저장한다.
 */
export function ProjectSwitcher({ className }: { className?: string }) {
  const projects = useProjects()
  const current = useCurrentProject()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (!projects || projects.length === 0) return null

  const dday = current?.targetLaunchDate ? ddayLabel(current.targetLaunchDate) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          'flex min-h-10 max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left transition-colors',
          'hover:bg-slate-200/70 active:bg-slate-300/60 dark:hover:bg-slate-800',
          className,
        )}
      >
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {current?.name ?? '프로젝트 선택'}
        </span>
        {dday && (
          <Badge tone={dday.startsWith('D+') ? 'danger' : 'brand'} className="hidden sm:inline-flex">
            {dday}
          </Badge>
        )}
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="프로젝트 선택">
        <ul className="space-y-2">
          {projects.map((p) => {
            const d = p.targetLaunchDate ? ddayLabel(p.targetLaunchDate) : null
            const active = p.id === current?.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={async () => {
                    await setCurrentProject(p.id)
                    setOpen(false)
                  }}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                    active
                      ? 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-950'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {p.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{PROJECT_STATUS_LABEL[p.status]}</span>
                      {p.category && <span>· {p.category}</span>}
                      {d && <span>· 출시 {d}</span>}
                    </p>
                  </div>
                  {active && <Check size={18} className="shrink-0 text-brand-600" />}
                </button>
              </li>
            )
          })}
        </ul>

        <Button
          full
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setOpen(false)
            navigate('/project/new')
          }}
        >
          <Plus size={16} />새 프로젝트
        </Button>
      </Sheet>
    </>
  )
}
