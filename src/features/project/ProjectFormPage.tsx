import { ArrowLeft, Copy, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  Field,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Sheet'
import {
  createProject,
  deleteProject,
  duplicateProject,
  patchProject,
} from '@/db/repo/projects'
import { PROJECT_STATUS_LABEL, type ProjectStatus } from '@/db/schema'
import { useProjects } from '@/hooks/useData'
 import { TEMPLATE_TOTAL_COUNT } from '@/data/checklistTemplate'

const STATUSES: ProjectStatus[] = ['planning', 'production', 'selling', 'archived']

export function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projects = useProjects()
  const existing = id ? projects?.find((p) => p.id === id) : undefined
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    name: '',
    category: '',
    sizeSpec: '',
    targetLaunchDate: '',
    status: 'planning' as ProjectStatus,
    memo: '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // 기존 프로젝트를 열었을 때 한 번만 폼에 싣는다 (입력 중 덮어쓰기 방지)
  useEffect(() => {
    if (!isEdit || loaded || !existing) return
    setForm({
      name: existing.name,
      category: existing.category,
      sizeSpec: existing.sizeSpec,
      targetLaunchDate: existing.targetLaunchDate,
      status: existing.status,
      memo: existing.memo,
    })
    setLoaded(true)
  }, [isEdit, loaded, existing])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const canSave = form.name.trim().length > 0

  const save = async () => {
    if (!canSave) return
    if (isEdit && id) {
      await patchProject(id, form)
    } else {
      await createProject(form)
    }
    navigate('/checklist')
  }

  if (isEdit && projects && !existing) {
    return (
      <Card className="px-4 py-8 text-center text-sm text-slate-500">
        프로젝트를 찾을 수 없습니다.
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>홈으로</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft size={16} />
        뒤로
      </Button>

      <Card className="space-y-4 px-4 py-4">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {isEdit ? '프로젝트 수정' : '새 제품 프로젝트'}
        </h1>

        <Field label="품목명 *" hint="예: 호텔식 구스 이불">
          <TextInput
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="품목명"
            autoFocus={!isEdit}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="카테고리" hint="예: 침구, 아우터">
            <TextInput value={form.category} onChange={(e) => set('category', e.target.value)} />
          </Field>
          <Field label="규격 · 사이즈" hint="예: Q 200×220cm">
            <TextInput value={form.sizeSpec} onChange={(e) => set('sizeSpec', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="목표 출시일" hint="D-Day와 브리핑의 기준이 됩니다">
            <TextInput
              type="date"
              value={form.targetLaunchDate}
              onChange={(e) => set('targetLaunchDate', e.target.value)}
            />
          </Field>
          {isEdit && (
            <Field label="진행 상태">
              <Select
                value={form.status}
                onChange={(e) => set('status', e.target.value as ProjectStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <Field label="메모">
          <TextArea
            value={form.memo}
            onChange={(e) => set('memo', e.target.value)}
            placeholder="컨셉, 타깃, 공장 연락처 등"
          />
        </Field>

        {!isEdit && (
          <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            만들면 소싱 → 생산·QC → 패키징 → 물류 → 런칭 → CS 6단계 체크리스트 {TEMPLATE_TOTAL_COUNT}개 항목이 자동으로 깔립니다.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button full onClick={() => navigate(-1)}>
            취소
          </Button>
          <Button full variant="primary" disabled={!canSave} onClick={() => void save()}>
            {isEdit ? '저장' : '만들기'}
          </Button>
        </div>
      </Card>

      {isEdit && id && (
        <Card className="space-y-2 px-4 py-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">그 밖의 작업</p>
          <Button
            full
            onClick={async () => {
              const newId = await duplicateProject(id, `${form.name} (복제)`)
              if (newId) navigate('/checklist')
            }}
          >
            <Copy size={16} />
            프로젝트 복제 (체크는 초기화, 원가·요율은 유지)
          </Button>
          <Button full variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
            프로젝트 삭제
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="프로젝트를 삭제할까요?"
        confirmLabel="삭제"
        message={
          <>
            <b>{form.name}</b>의 체크리스트, 검수 사진, BOM 원가가 모두 지워집니다. 되돌릴 수
            없습니다.
          </>
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (id) await deleteProject(id)
          setConfirmDelete(false)
          navigate('/')
        }}
      />
    </div>
  )
}
