import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, cx } from './primitives'

/**
 * 모바일에서는 아래에서 올라오는 바텀 시트, PC에서는 가운데 모달.
 * 비서 미니 도구(QC 기록장·라벨 생성기·재고 계산기)가 전부 이 위에 올라간다.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // 시트 뒤 본문이 같이 스크롤되는 것 방지
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl',
          'rounded-t-3xl sm:rounded-2xl dark:bg-slate-950',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <header className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="닫기" className="-mr-1">
            <X size={18} />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

        {footer && (
          <footer className="safe-bottom border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** 되돌릴 수 없는 동작(삭제·덮어쓰기) 앞에 반드시 끼운다 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '확인',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</div>
      <div className="mt-5 flex gap-2">
        <Button full onClick={onCancel}>
          취소
        </Button>
        <Button full variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  )
}
