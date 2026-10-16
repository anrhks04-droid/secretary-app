import { Calculator, FileText, Home, ListChecks, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/components/ui/primitives'
import { ProjectSwitcher } from './ProjectSwitcher'

interface Tab {
  to: string
  label: string
  icon: typeof Home
}

const TABS: Tab[] = [
  { to: '/', label: '홈', icon: Home },
  { to: '/checklist', label: '체크리스트', icon: ListChecks },
  { to: '/cost', label: '원가·마진', icon: Calculator },
  { to: '/report', label: '리포트', icon: FileText },
  { to: '/more', label: '더보기', icon: MoreHorizontal },
]

/**
 * 모바일 퍼스트 앱 셸.
 *  - 폰: 상단 고정 헤더 + 하단 탭바 (홈 화면에 설치했을 때 네이티브 앱처럼)
 *  - PC: 좌측 사이드바 + 와이드 본문
 * 인쇄할 때는 헤더·탭바가 모두 빠지도록 no-print 를 달아 둔다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const title = TABS.find((t) => t.to === pathname)?.label ?? '제품 런칭 비서'

  return (
    <div className="min-h-full md:flex">
      {/* PC 사이드바 */}
      <aside className="no-print hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-5">
          <p className="text-base font-bold text-slate-900 dark:text-slate-50">제품 런칭 비서</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            소싱부터 판매까지 현장 관리
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <tab.icon size={18} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <ProjectSwitcher className="w-full border border-slate-200 dark:border-slate-800" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 헤더 */}
        <header className="no-print safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex min-h-14 items-center gap-2 px-3">
            <h1 className="shrink-0 text-base font-bold text-slate-900 dark:text-slate-50">
              {title}
            </h1>
            <div className="min-w-0 flex-1" />
            <ProjectSwitcher className="min-w-0" />
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-24 md:pb-8">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-8 md:py-8">{children}</div>
        </main>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <ul className="flex">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  cx(
                    // 최소 56px — 장갑 낀 손으로도 누를 수 있는 크기
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors',
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span className="truncate">{tab.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
