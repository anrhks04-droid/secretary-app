import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge, Button, Field, NumInput, Select, TextArea, cx } from '@/components/ui/primitives'
import { Sheet } from '@/components/ui/Sheet'
import { addPhoto, deletePhoto, patchPhoto } from '@/db/repo/photos'
import {
  DEFECT_TYPES,
  SEVERITY_LABEL,
  type ID,
  type Photo,
  type PhotoKind,
  type Severity,
} from '@/db/schema'
import { useObjectUrl } from '@/hooks/useData'
import { formatDateTimeKo } from '@/lib/date'

/**
 * 현장 사진 촬영·첨부.
 *
 * accept="image/*" capture="environment" 를 쓰면 폰에서 후면 카메라가 바로 열린다.
 * 저장할 때 1600px/JPEG로 압축하므로(lib/image.ts) 수십 장을 찍어도 용량이 버틴다.
 */
export function PhotoStrip({
  projectId,
  itemId,
  kind = 'etc',
  photos,
  label,
  defectMode,
}: {
  projectId: ID
  itemId?: ID
  kind?: PhotoKind
  photos: Photo[]
  label?: string
  /** QC 기록장 — 불량 유형·심각도·수량까지 함께 받는다 */
  defectMode?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [viewing, setViewing] = useState<Photo>()

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(undefined)
    try {
      for (const file of Array.from(files)) {
        await addPhoto(file, {
          projectId,
          itemId,
          kind: defectMode ? 'defect' : kind,
          defectType: defectMode ? DEFECT_TYPES[0] : undefined,
          severity: defectMode ? 'major' : undefined,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 저장하지 못했습니다.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <PhotoThumb key={photo.id} photo={photo} onOpen={() => setViewing(photo)} />
        ))}

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cx(
            'flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed',
            'border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-500',
            'dark:border-slate-700 dark:hover:border-brand-600',
            busy && 'opacity-60',
          )}
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : photos.length === 0 ? (
            <Camera size={20} />
          ) : (
            <ImagePlus size={20} />
          )}
          <span className="text-[11px]">{busy ? '저장 중' : '사진'}</span>
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void onPick(e.target.files)}
      />

      <PhotoViewer photo={viewing} defectMode={defectMode} onClose={() => setViewing(undefined)} />
    </div>
  )
}

function PhotoThumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = useObjectUrl(photo.thumbBlob)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
    >
      {url && <img src={url} alt={photo.caption || '검수 사진'} className="size-full object-cover" />}
      {photo.severity === 'critical' && (
        <span className="absolute inset-x-0 bottom-0 bg-rose-600/90 py-0.5 text-[10px] font-semibold text-white">
          치명
        </span>
      )}
    </button>
  )
}

/** 사진 확대 + 메모·불량 정보 편집 */
function PhotoViewer({
  photo,
  defectMode,
  onClose,
}: {
  photo: Photo | undefined
  defectMode?: boolean
  onClose: () => void
}) {
  const url = useObjectUrl(photo?.blob)

  if (!photo) return null

  return (
    <Sheet
      open
      onClose={onClose}
      title="사진 기록"
      subtitle={formatDateTimeKo(photo.createdAt)}
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              await deletePhoto(photo.id)
              onClose()
            }}
          >
            <Trash2 size={16} />
            삭제
          </Button>
          <Button full variant="primary" onClick={onClose}>
            완료
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl bg-slate-900">
          {url && (
            <img src={url} alt={photo.caption || '검수 사진'} className="max-h-[50vh] w-full object-contain" />
          )}
        </div>

        {(defectMode || photo.kind === 'defect') && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="불량 유형" className="sm:col-span-2">
              <Select
                value={photo.defectType ?? DEFECT_TYPES[0]}
                onChange={(e) => void patchPhoto(photo.id, { defectType: e.target.value })}
              >
                {DEFECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="심각도">
              <Select
                value={photo.severity ?? 'major'}
                onChange={(e) => void patchPhoto(photo.id, { severity: e.target.value as Severity })}
              >
                {(Object.keys(SEVERITY_LABEL) as Severity[]).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="발생 수량" hint="집계 리포트에 합산됩니다">
              <NumInput
                value={photo.defectQty ?? 0}
                onChange={(n) => void patchPhoto(photo.id, { defectQty: n })}
                suffix="개"
              />
            </Field>
          </div>
        )}

        <Field label="메모">
          <TextArea
            defaultValue={photo.caption}
            placeholder="어디서 / 무엇이 / 어떻게 — 공장에 그대로 전달할 내용"
            onBlur={(e) => void patchPhoto(photo.id, { caption: e.target.value })}
          />
        </Field>

        <p className="text-xs text-slate-400">
          <Badge>{photo.width}×{photo.height}</Badge>
        </p>
      </div>
    </Sheet>
  )
}
