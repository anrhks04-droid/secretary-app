import { describe, expect, it } from 'vitest'
import type { ChecklistItem, Project, StepNo } from '@/db/schema'
import { buildBriefing, buildProjectBriefing, computeProgress } from './progress'

const TODAY = '2026-10-16'

let seq = 0
const item = (step: StepNo, done: boolean, dueDate = '', title = 'item'): ChecklistItem => ({
  id: `i${seq++}`,
  projectId: 'p1',
  step,
  templateKey: `k${seq}`,
  title,
  done,
  assignee: '',
  dueDate,
  memo: '',
  order: seq,
  createdAt: '',
  updatedAt: '',
})

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: '구스 이불',
  category: '침구',
  sizeSpec: '',
  targetLaunchDate: '',
  status: 'planning',
  memo: '',
  createdAt: '',
  updatedAt: '',
  ...over,
})

describe('computeProgress', () => {
  it('전체 진행률과 단계별 진행률을 함께 낸다', () => {
    const r = computeProgress([item(1, true), item(1, false), item(2, true), item(2, true)])

    expect(r.done).toBe(3)
    expect(r.total).toBe(4)
    expect(r.pct).toBe(75)
    expect(r.steps[0].pct).toBe(50)
    expect(r.steps[1].pct).toBe(100)
  })

  it('현재 단계는 아직 안 끝난 가장 앞 단계다', () => {
    const r = computeProgress([item(1, true), item(2, false), item(3, false)])
    expect(r.currentStep).toBe(2)
  })

  it('전부 끝나면 현재 단계는 null', () => {
    expect(computeProgress([item(1, true)]).currentStep).toBeNull()
  })

  it('항목이 없어도 0으로 나누지 않는다', () => {
    const r = computeProgress([])
    expect(r.pct).toBe(0)
    expect(r.steps).toHaveLength(6)
  })
})

describe('buildProjectBriefing', () => {
  it('마감 지난 항목이 가장 먼저, 많이 지난 순으로 나온다', () => {
    const entries = buildProjectBriefing(
      project(),
      [
        item(1, false, '2026-10-14', '이틀 지남'),
        item(1, false, '2026-10-01', '보름 지남'),
        item(1, false, '2026-10-20', '나흘 남음'),
      ],
      TODAY,
    )

    expect(entries[0].item.title).toBe('보름 지남')
    expect(entries[0].kind).toBe('overdue')
    expect(entries[0].days).toBe(15)
    expect(entries[1].item.title).toBe('이틀 지남')
  })

  it('오늘 마감은 dueSoon 으로 "오늘 마감" 표기', () => {
    const entries = buildProjectBriefing(project(), [item(1, false, TODAY)], TODAY)
    expect(entries[0].kind).toBe('dueSoon')
    expect(entries[0].reason).toBe('오늘 마감')
  })

  it('7일을 넘겨 마감인 항목은 브리핑에 올리지 않는다', () => {
    const entries = buildProjectBriefing(project(), [item(1, false, '2026-11-30')], TODAY)
    expect(entries).toHaveLength(0)
  })

  it('완료된 항목은 마감이 지났어도 올리지 않는다', () => {
    const entries = buildProjectBriefing(project(), [item(1, true, '2026-01-01')], TODAY)
    expect(entries).toHaveLength(0)
  })

  it('출시가 임박했는데 1~3단계가 남아 있으면 출시 위험으로 올린다', () => {
    const entries = buildProjectBriefing(
      project({ targetLaunchDate: '2026-10-30' }), // D-14
      [item(1, false), item(5, false)],
      TODAY,
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('launchRisk')
    expect(entries[0].item.step).toBe(1)
    expect(entries[0].reason).toContain('D-14')
  })

  it('같은 항목이 마감 지남과 출시 위험에 동시에 걸려도 한 번만 나온다', () => {
    const only = item(1, false, '2026-10-01')
    const entries = buildProjectBriefing(
      project({ targetLaunchDate: '2026-10-20' }),
      [only],
      TODAY,
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('overdue')
  })
})

describe('buildBriefing', () => {
  it('여러 프로젝트를 합쳐 급한 순으로 자른다', () => {
    const p1 = project({ id: 'p1', name: 'A' })
    const p2 = project({ id: 'p2', name: 'B' })

    const map = new Map([
      ['p1', [item(1, false, '2026-10-20', '곧 마감')]],
      ['p2', [item(1, false, '2026-09-30', '많이 지남')]],
    ])

    const r = buildBriefing([p1, p2], map, 5, TODAY)

    expect(r[0].projectName).toBe('B')
    expect(r[0].kind).toBe('overdue')
    expect(r[1].projectName).toBe('A')
  })

  it('종료된 프로젝트는 제외한다', () => {
    const archived = project({ id: 'p1', status: 'archived' })
    const map = new Map([['p1', [item(1, false, '2026-01-01')]]])
    expect(buildBriefing([archived], map, 5, TODAY)).toHaveLength(0)
  })

  it('limit 만큼만 돌려준다', () => {
    const p = project()
    const map = new Map([
      [
        'p1',
        [
          item(1, false, '2026-10-01'),
          item(1, false, '2026-10-02'),
          item(1, false, '2026-10-03'),
        ],
      ],
    ])
    expect(buildBriefing([p], map, 2, TODAY)).toHaveLength(2)
  })
})
