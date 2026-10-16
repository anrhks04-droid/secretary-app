import type { CareGlyph } from '@/data/careSymbols'

/**
 * 세탁기호 아이콘.
 *
 * 기호를 '도형 + 내부 표시 + 아래 막대 + 금지선'으로 분해해 두고
 * (data/careSymbols.ts) 여기서 한 번에 그린다. 그래서 기호가 늘어나도
 * SVG를 새로 그릴 필요 없이 데이터만 추가하면 된다.
 *
 * 인쇄에서도 선이 살아 있도록 fill 대신 stroke로만 그린다.
 */
export function CareSymbolIcon({ glyph, size = 40 }: { glyph: CareGlyph; size?: number }) {
  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {/* 바깥 도형 */}
      {glyph.shape === 'tub' && (
        <>
          <path d="M6 17 h36 l-3.5 18.5 a4 4 0 0 1 -4 3.5 h-21 a4 4 0 0 1 -4 -3.5 Z" {...s} />
          <path d="M6 17 q5 -5 10 -1.5 t10 0 t10 -1.5" {...s} strokeWidth={2} />
        </>
      )}
      {glyph.shape === 'triangle' && <path d="M24 7 L42 38 H6 Z" {...s} />}
      {glyph.shape === 'square' && <rect x="8" y="10" width="32" height="28" rx="2" {...s} />}
      {glyph.shape === 'iron' && (
        <path d="M7 38 H41 L38.5 23 C37.5 17.5 33.5 14 28 14 H18 C12 14 8.5 19 7 38 Z" {...s} />
      )}
      {glyph.shape === 'circle' && <circle cx="24" cy="24" r="16" {...s} />}

      {/* 내부 표시 */}
      {glyph.inner === 'circle' && <circle cx="24" cy="24" r="9" {...s} />}
      {glyph.inner === 'hang' && <path d="M24 13 V35" {...s} />}
      {glyph.inner === 'flat' && <path d="M13 24 H35" {...s} />}
      {glyph.inner === 'diag' && (
        <>
          <path d="M17 33 L27 16" {...s} strokeWidth={2} />
          <path d="M23 33 L33 16" {...s} strokeWidth={2} />
        </>
      )}
      {glyph.inner === 'hand' && (
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="currentColor"
          stroke="none"
        >
          손
        </text>
      )}

      {/* 그늘 건조 — 좌상단 사선 */}
      {glyph.shade && <path d="M8 21 L19 10" {...s} />}

      {/* 도형 안 텍스트 (온도, P/F/W) */}
      {glyph.text && (
        <text
          x="24"
          y={glyph.shape === 'tub' ? 31 : 25}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={glyph.text.length > 1 ? 14 : 17}
          fontWeight="700"
          fill="currentColor"
          stroke="none"
        >
          {glyph.text}
        </text>
      )}

      {/* 다림질 온도 점 / 건조 온도 점 */}
      {glyph.dots != null &&
        glyph.dots > 0 &&
        Array.from({ length: glyph.dots }, (_, i) => (
          <circle
            key={i}
            cx={24 + (i - (glyph.dots! - 1) / 2) * 8}
            cy={glyph.shape === 'iron' ? 27 : 24}
            r="2.2"
            fill="currentColor"
            stroke="none"
          />
        ))}

      {/* 약하게 / 매우 약하게 */}
      {glyph.bars != null &&
        glyph.bars > 0 &&
        Array.from({ length: glyph.bars }, (_, i) => (
          <path key={i} d={`M12 ${glyph.bars === 1 ? 44 : 42 + i * 5} H36`} {...s} strokeWidth={2.6} />
        ))}

      {/* 금지 */}
      {glyph.crossed && (
        <>
          <path d="M7 8 L41 40" {...s} strokeWidth={2.8} />
          <path d="M41 8 L7 40" {...s} strokeWidth={2.8} />
        </>
      )}
    </svg>
  )
}
