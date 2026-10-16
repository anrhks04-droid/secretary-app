import {
  Check,
  Database,
  Download,
  HardDrive,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Field,
  NumInput,
  SectionTitle,
  TextInput,
} from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { downloadBackup, importBackup, parseBackup, wipeAll, type ImportMode } from '@/db/backup'
import {
  addCustomChannel,
  deleteChannel,
  patchChannel,
  patchSettings,
  resetBuiltinChannels,
} from '@/db/repo/settings'
import type { ChannelRate } from '@/db/schema'
import { useChannels, useSettings } from '@/hooks/useData'
import { bytes } from '@/lib/format'
import { storageEstimate } from '@/lib/image'

export function SettingsPage() {
  const settings = useSettings()
  const channels = useChannels()
  const fileRef = useRef<HTMLInputElement>(null)

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [pendingImport, setPendingImport] = useState<{ text: string; name: string }>()
  const [confirmWipe, setConfirmWipe] = useState(false)

  useEffect(() => {
    void storageEstimate().then(setStorage)
  }, [message])

  const runImport = async (mode: ImportMode) => {
    if (!pendingImport) return
    try {
      const file = parseBackup(pendingImport.text)
      const summary = await importBackup(file, mode)
      setError(undefined)
      setMessage(
        `복원 완료 — 프로젝트 ${summary.projects}건, 체크리스트 ${summary.checklistItems}건, 사진 ${summary.photos}장` +
          (summary.photosSkipped ? ' (사진 미포함 백업이라 이미지는 건너뛰었습니다)' : ''),
      )
    } catch (e) {
      setMessage(undefined)
      setError(e instanceof Error ? e.message : '복원에 실패했습니다.')
    } finally {
      setPendingImport(undefined)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>기본 정보</SectionTitle>
        <Card className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <Field label="회사명" hint="리포트 머리말에 표시됩니다">
            <TextInput
              defaultValue={settings?.companyName ?? ''}
              onBlur={(e) => void patchSettings({ companyName: e.target.value })}
            />
          </Field>
          <Field label="기본 담당자" hint="체크리스트 담당자 입력 시 안내로 표시">
            <TextInput
              defaultValue={settings?.defaultAssignee ?? ''}
              onBlur={(e) => void patchSettings({ defaultAssignee: e.target.value })}
            />
          </Field>
        </Card>
      </section>

      <section>
        <SectionTitle
          right={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void addCustomChannel('새 채널')}
            >
              <Plus size={15} />
              채널 추가
            </Button>
          }
        >
          판매 채널 수수료
        </SectionTitle>

        <p className="mb-2 px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          기본값은 참고용 추정치입니다. 실제 정산서 요율로 고친 뒤 <b>[확인함]</b>을 누르면 마진
          비교표의 &apos;요율 확인&apos; 배지가 사라집니다.
        </p>

        <div className="space-y-2">
          {(channels ?? []).map((c) => (
            <ChannelRow key={c.id} channel={c} />
          ))}
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => void resetBuiltinChannels()}
        >
          <RotateCcw size={15} />
          기본 채널 요율 초기화
        </Button>
      </section>

      <section>
        <SectionTitle>백업 · 복원</SectionTitle>
        <Card className="space-y-3 px-4 py-4">
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            데이터는 이 기기 안에만 저장됩니다. 다른 기기로 옮기거나 안전하게 보관하려면 JSON으로
            내보내세요.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => void downloadBackup(true)}>
              <Download size={16} />
              내보내기 (사진 포함)
            </Button>
            <Button onClick={() => void downloadBackup(false)}>
              <Download size={16} />
              내보내기 (사진 제외·가벼움)
            </Button>
          </div>

          <Button full variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            JSON 파일에서 복원
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setPendingImport({ text: await file.text(), name: file.name })
              e.target.value = ''
            }}
          />

          {message && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>저장 공간</SectionTitle>
        <Card className="flex items-center gap-3 px-4 py-4">
          <HardDrive size={20} className="shrink-0 text-slate-400" />
          <div className="flex-1 text-sm">
            {storage ? (
              <>
                <p className="tabular text-slate-800 dark:text-slate-100">
                  {bytes(storage.usage)} 사용 중
                  {storage.quota > 0 && (
                    <span className="text-slate-400"> / 약 {bytes(storage.quota)} 가능</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  사진은 저장 시 1600px로 압축되어 한 장당 보통 200~400KB입니다.
                </p>
              </>
            ) : (
              <p className="text-slate-400">이 브라우저는 사용량을 알려 주지 않습니다.</p>
            )}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>위험 구역</SectionTitle>
        <Card className="px-4 py-4">
          <Button variant="danger" full onClick={() => setConfirmWipe(true)}>
            <Trash2 size={16} />
            모든 데이터 삭제
          </Button>
          <p className="mt-2 text-xs text-slate-400">
            <Database size={11} className="mr-1 inline" />
            지우기 전에 먼저 백업을 내려받아 두세요.
          </p>
        </Card>
      </section>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="어떻게 복원할까요?"
        confirmLabel="덮어쓰기"
        danger
        message={
          <>
            <b>{pendingImport?.name}</b>
            <br />
            <br />
            <b>덮어쓰기</b>는 지금 기기의 데이터를 모두 지우고 백업 내용으로 바꿉니다.
            <br />
            <b>병합</b>은 기존 데이터를 두고 같은 항목만 백업 값으로 갱신합니다.
            <br />
            <br />
            <Button full variant="secondary" onClick={() => void runImport('merge')}>
              병합해서 가져오기
            </Button>
          </>
        }
        onCancel={() => setPendingImport(undefined)}
        onConfirm={() => void runImport('replace')}
      />

      <ConfirmDialog
        open={confirmWipe}
        danger
        title="정말 모든 데이터를 지울까요?"
        confirmLabel="전부 삭제"
        message="프로젝트, 체크리스트, 검수 사진, BOM, 채널 요율이 모두 사라집니다. 되돌릴 수 없습니다."
        onCancel={() => setConfirmWipe(false)}
        onConfirm={async () => {
          await wipeAll()
          setConfirmWipe(false)
          setMessage('모든 데이터를 삭제했습니다.')
        }}
      />
    </div>
  )
}

function ChannelRow({ channel }: { channel: ChannelRate }) {
  return (
    <Card className="px-3 py-3">
      <div className="flex items-center gap-2">
        <TextInput
          defaultValue={channel.name}
          className="min-h-9 font-medium"
          onBlur={(e) => void patchChannel(channel.id, { name: e.target.value })}
        />
        {channel.confirmed ? (
          <Badge tone="success" className="shrink-0">
            <Check size={12} />
            확인함
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="shrink-0"
            onClick={() => void patchChannel(channel.id, { confirmed: true })}
          >
            확인함
          </Button>
        )}
        {!channel.isBuiltin && (
          <Button
            size="sm"
            variant="ghost"
            aria-label="채널 삭제"
            onClick={() => void deleteChannel(channel.id)}
          >
            <Trash2 size={15} />
          </Button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Field label="수수료율">
          <NumInput
            decimal
            value={channel.feePct}
            suffix="%"
            onChange={(n) => void patchChannel(channel.id, { feePct: n, confirmed: false })}
          />
        </Field>
        <Field label="건당 고정비">
          <NumInput
            value={channel.fixedFeePerOrder}
            suffix="원"
            onChange={(n) => void patchChannel(channel.id, { fixedFeePerOrder: n, confirmed: false })}
          />
        </Field>
        <Field label="물류비/개" hint="0이면 실 택배비 사용">
          <NumInput
            value={channel.fulfillmentPerUnit}
            suffix="원"
            onChange={(n) =>
              void patchChannel(channel.id, { fulfillmentPerUnit: n, confirmed: false })
            }
          />
        </Field>
      </div>

      {channel.note && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{channel.note}</p>}
    </Card>
  )
}
