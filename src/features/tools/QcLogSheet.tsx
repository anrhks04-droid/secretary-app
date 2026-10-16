import { ClipboardList } from 'lucide-react'
import { PhotoStrip } from '@/components/photos/PhotoStrip'
import { Badge, Card, EmptyState } from '@/components/ui/primitives'
import { Sheet } from '@/components/ui/Sheet'
import { summarizeDefects } from '@/db/repo/photos'
import { SEVERITY_LABEL, type ID, type Severity } from '@/db/schema'
import { usePhotos } from '@/hooks/useData'
import { num } from '@/lib/format'

const SEVERITY_TONE: Record<Severity, 'neutral' | 'warning' | 'danger'> = {
  minor: 'neutral',
  major: 'warning',
  critical: 'danger',
}

/**
 * QC 사진 기록장.
 *
 * 검수 중에 불량을 발견하면 그 자리에서 찍고, 유형·심각도·수량을 달아 둔다.
 * 아래 집계표가 그대로 공장에 보낼 피드백 자료가 되고, 리포트에도 같이 실린다.
 */
export function QcLogSheet({
  open,
  projectId,
  onClose,
}: {
  open: boolean
  projectId: ID
  onClose: () => void
}) {
  const photos = usePhotos(projectId)
  const defects = (photos ?? []).filter((p) => p.kind === 'defect')
  const summary = summarizeDefects(defects)
  const totalQty = summary.reduce((s, r) => s + r.qty, 0)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title="QC 사진 기록장"
      subtitle="불량을 찍고 유형·심각도·수량을 남기세요"
    >
      <div className="space-y-5">
        <PhotoStrip
          projectId={projectId}
          kind="defect"
          defectMode
          photos={defects}
          label={`불량 기록 ${defects.length}건`}
        />

        <section>
          <h3 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            불량 유형별 집계
          </h3>

          {summary.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ClipboardList size={36} strokeWidth={1.4} />}
                title="아직 기록된 불량이 없습니다"
                description="위 [사진] 버튼을 눌러 현장에서 바로 촬영하세요."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">불량 유형</th>
                    <th className="px-3 py-2 text-right font-medium">건수</th>
                    <th className="px-3 py-2 text-right font-medium">수량</th>
                    <th className="px-3 py-2 text-right font-medium">최고 심각도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.map((row) => (
                    <tr key={row.defectType}>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-100">
                        {row.defectType}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {row.count}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {num(row.qty)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge tone={SEVERITY_TONE[row.worst]}>{SEVERITY_LABEL[row.worst]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 text-sm font-semibold dark:bg-slate-800/60">
                  <tr>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">합계</td>
                    <td className="tabular px-3 py-2.5 text-right text-slate-700 dark:text-slate-200">
                      {defects.length}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-slate-700 dark:text-slate-200">
                      {num(totalQty)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </Card>
          )}
        </section>

        <p className="text-xs leading-relaxed text-slate-400">
          사진을 누르면 불량 유형·심각도·발생 수량과 메모를 고칠 수 있습니다. 이 집계는 [리포트]
          탭에도 함께 실려 공장에 바로 전달할 수 있습니다.
        </p>
      </div>
    </Sheet>
  )
}
