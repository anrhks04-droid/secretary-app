import { Info, TriangleAlert } from 'lucide-react'
import { Badge, Card, cx } from '@/components/ui/primitives'
import { RATE_NOTICE } from '@/data/channelPresets'
import type { ChannelMarginResult } from '@/domain/margin'
import { pct, won, wonSigned } from '@/lib/format'

/**
 * 채널별 마진 동시 비교.
 *
 * 한 번 입력한 원가·판매가로 전 채널을 한 화면에 세워 놓고 비교한다.
 * 공헌이익이 음수인 채널은 빨갛게 — 팔수록 손해라는 뜻이다.
 */
export function ChannelMarginTable({
  results,
  hasUnconfirmed,
}: {
  results: ChannelMarginResult[]
  hasUnconfirmed: boolean
}) {
  if (results.length === 0) {
    return (
      <Card className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        비교할 채널이 없습니다. 아래에서 채널을 켜 주세요.
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {hasUnconfirmed && (
        <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          {RATE_NOTICE}
        </p>
      )}

      {/* 모바일: 채널 카드 스택 */}
      <div className="space-y-2 md:hidden">
        {results.map((r) => (
          <ChannelCard key={r.channelId} r={r} />
        ))}
      </div>

      {/* PC: 비교표 */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">채널</th>
              <th className="px-3 py-2.5 text-right font-medium">수수료</th>
              <th className="px-3 py-2.5 text-right font-medium">물류비</th>
              <th className="px-3 py-2.5 text-right font-medium">공헌이익</th>
              <th className="px-3 py-2.5 text-right font-medium">마진율</th>
              <th className="px-3 py-2.5 text-right font-medium">손익분기 ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((r) => (
              <tr
                key={r.channelId}
                className={cx(r.contribution <= 0 && 'bg-rose-50 dark:bg-rose-950/40')}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {r.channelName}
                    </span>
                    {!r.confirmed && <Badge tone="warning">요율 확인</Badge>}
                  </div>
                </td>
                <td className="tabular px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                  {won(r.fee)}
                  <span className="ml-1 text-[11px] text-slate-400">{pct(r.feePct)}</span>
                </td>
                <td className="tabular px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                  {won(r.logistics)}
                </td>
                <td
                  className={cx(
                    'tabular px-3 py-3 text-right font-bold',
                    r.contribution > 0
                      ? 'text-slate-900 dark:text-slate-50'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {wonSigned(r.contribution)}
                </td>
                <td
                  className={cx(
                    'tabular px-3 py-3 text-right font-semibold',
                    marginTone(r.marginPct),
                  )}
                >
                  {pct(r.marginPct)}
                </td>
                <td className="tabular px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                  {r.bepRoasPct === null ? (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <TriangleAlert size={13} />
                      불가
                    </span>
                  ) : (
                    pct(r.bepRoasPct, 0)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function ChannelCard({ r }: { r: ChannelMarginResult }) {
  const loss = r.contribution <= 0

  return (
    <Card
      className={cx('px-4 py-3', loss && 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-50">{r.channelName}</p>
          {!r.confirmed && <Badge tone="warning">요율 확인</Badge>}
        </div>
        <p
          className={cx(
            'tabular shrink-0 text-lg font-bold',
            loss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50',
          )}
        >
          {wonSigned(r.contribution)}
        </p>
      </div>

      <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
        <Cell label="수수료" value={won(r.fee)} sub={pct(r.feePct)} />
        <Cell label="물류비" value={won(r.logistics)} />
        <Cell label="마진율" value={pct(r.marginPct)} tone={marginTone(r.marginPct)} />
        <Cell
          label="BEP ROAS"
          value={r.bepRoasPct === null ? '불가' : pct(r.bepRoasPct, 0)}
          tone={r.bepRoasPct === null ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
      </dl>
    </Card>
  )
}

function Cell({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
}) {
  return (
    <div>
      <dt className="text-[10px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={cx(
          'tabular text-[13px] font-semibold',
          tone ?? 'text-slate-800 dark:text-slate-100',
        )}
      >
        {value}
      </dd>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  )
}

function marginTone(marginPct: number): string {
  if (marginPct <= 0) return 'text-rose-600 dark:text-rose-400'
  if (marginPct < 15) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}
