import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui/primitives'

/**
 * 새 버전이 배포되면 띄우는 알림.
 * 홈 화면에 설치해 쓰는 앱은 브라우저처럼 새로고침할 일이 없어서,
 * 업데이트가 있다는 걸 이렇게 알려 주지 않으면 옛 버전에 계속 머문다.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="no-print fixed inset-x-0 bottom-20 z-40 mx-auto w-[min(26rem,calc(100%-2rem))] md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <RefreshCw size={18} className="shrink-0 text-brand-600" />
        <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">새 버전이 있습니다.</p>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          나중에
        </Button>
        <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)}>
          새로고침
        </Button>
      </div>
    </div>
  )
}
