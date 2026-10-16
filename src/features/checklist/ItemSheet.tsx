import { Info, Trash2, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PhotoStrip } from '@/components/photos/PhotoStrip'
import { Button, Field, TextArea, TextInput } from '@/components/ui/primitives'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { deleteItem, patchItem, toggleItem } from '@/db/repo/checklist'
import { STEP_META, type ChecklistItem, type ID, type ToolKey } from '@/db/schema'
import { useItemPhotos, useSettings } from '@/hooks/useData'

const TOOL_LABEL: Record<ToolKey, string> = {
  qc: 'QC 사진 기록장 열기',
  label: '한글표시사항 생성기 열기',
  reorder: '재고·적재 계산기 열기',
}

/** 체크리스트 항목 상세 — 담당자·마감일·현장 메모·사진 */
export function ItemSheet({
  item,
  projectId,
  onClose,
  onOpenTool,
}: {
  item: ChecklistItem | undefined
  projectId: ID
  onClose: () => void
  onOpenTool: (tool: ToolKey) => void
}) {
  const photos = useItemPhotos(item?.id)
  const settings = useSettings()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({ title: '', assignee: '', dueDate: '', memo: '' })

  // 다른 항목을 열 때마다 폼을 새로 싣는다
  useEffect(() => {
    if (!item) return
    setForm({
      title: item.title,
      assignee: item.assignee,
      dueDate: item.dueDate,
      memo: item.memo,
    })
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // 시트를 닫을 때 한 번에 저장 — 현장에서 타이핑 중 저장이 튀지 않게
  const close = async () => {
    await patchItem(item.id, form)
    onClose()
  }

  return (
    <>
      <Sheet
        open
        onClose={() => void close()}
        title={`STEP ${item.step} · ${STEP_META[item.step].short}`}
        subtitle={item.title}
        footer={
          <div className="flex gap-2">
            <Button
              variant={item.done ? 'secondary' : 'primary'}
              full
              onClick={async () => {
                await toggleItem(item.id)
                await close()
              }}
            >
              {item.done ? '완료 취소' : '완료 체크'}
            </Button>
            <Button variant="secondary" onClick={() => void close()}>
              닫기
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {item.hint && (
            <p className="flex gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-900 dark:bg-brand-950 dark:text-brand-200">
              <Info size={14} className="mt-0.5 shrink-0" />
              {item.hint}
            </p>
          )}

          {item.toolKey && (
            <Button full variant="primary" onClick={() => onOpenTool(item.toolKey!)}>
              <Wrench size={16} />
              {TOOL_LABEL[item.toolKey]}
            </Button>
          )}

          <Field label="항목명">
            <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="담당자">
              <TextInput
                value={form.assignee}
                placeholder={settings?.defaultAssignee || '이름'}
                onChange={(e) => set('assignee', e.target.value)}
              />
            </Field>
            <Field label="마감일">
              <TextInput
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="현장 메모" hint="실측 치수, 공장 담당자 말, 합의 내용 등">
            <TextArea
              value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              placeholder="현장에서 확인한 내용을 적어 두세요"
            />
          </Field>

          <PhotoStrip
            projectId={projectId}
            itemId={item.id}
            kind={item.templateKey === 's1-sample' ? 'golden' : 'etc'}
            photos={photos ?? []}
            label="사진 기록"
          />

          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
            이 항목 삭제
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="항목을 삭제할까요?"
        confirmLabel="삭제"
        message="이 항목에 붙은 사진도 함께 지워집니다."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteItem(item.id)
          setConfirmDelete(false)
          onClose()
        }}
      />
    </>
  )
}
