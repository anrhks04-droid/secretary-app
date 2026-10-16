import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { useState } from 'react'
import { num, toNum } from '@/lib/format'

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/* ───────────────────────── Button ───────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
  ghost:
    'text-slate-600 hover:bg-slate-200/70 active:bg-slate-300/70 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300',
}

// 현장에서 장갑 끼고도 눌리도록 최소 44px 높이를 지킨다
const SIZE: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[15px] gap-2',
  lg: 'min-h-13 px-5 text-base gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  full,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT[variant],
        SIZE[size],
        full && 'w-full',
        className,
      )}
    />
  )
}

/* ───────────────────────── Card ───────────────────────── */

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'li'
}) {
  return (
    <As
      className={cx(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        'dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </As>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 px-1">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{children}</h2>
      {right}
    </div>
  )
}

/* ───────────────────────── Badge ───────────────────────── */

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ───────────────────────── 입력 ───────────────────────── */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

const INPUT_BASE =
  'w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-brand-500 focus:outline-2 focus:outline-offset-0 focus:outline-brand-500/30 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(INPUT_BASE, className)} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(INPUT_BASE, 'min-h-20 py-2 leading-relaxed', className)} />
}

export function Select({
  className,
  children,
  ...rest
}: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...rest} className={cx(INPUT_BASE, 'pr-8', className)}>
      {children}
    </select>
  )
}

/**
 * 금액·수량 입력.
 * 포커스를 두면 순수 숫자로, 손을 떼면 천 단위 구분이 들어간 읽기 좋은 형태로 바뀐다.
 * 모바일에서 숫자 키패드가 바로 뜨도록 inputMode를 지정한다.
 */
export function NumInput({
  value,
  onChange,
  suffix,
  placeholder,
  decimal,
  className,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  suffix?: string
  placeholder?: string
  /** 소수점 입력 허용 (요척 등) */
  decimal?: boolean
  className?: string
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const shown = focused ? draft : value ? num(value, decimal && !Number.isInteger(value) ? 2 : 0) : ''

  return (
    <div className="relative">
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        disabled={disabled}
        value={shown}
        placeholder={placeholder ?? '0'}
        onFocus={() => {
          setDraft(value ? String(value) : '')
          setFocused(true)
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.-]/g, '')
          setDraft(raw)
          onChange(toNum(raw))
        }}
        onBlur={() => setFocused(false)}
        className={cx(INPUT_BASE, 'tabular text-right', suffix && 'pr-10', className)}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  )
}

/* ───────────────────────── 진행률 ───────────────────────── */

export function ProgressBar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'success' }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx(
          'h-full rounded-full transition-[width] duration-300',
          tone === 'success' ? 'bg-emerald-500' : 'bg-brand-500',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/* ───────────────────────── 빈 상태 ───────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
      <div>
        <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export { cx }
