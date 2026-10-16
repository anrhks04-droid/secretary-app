/**
 * @vitest-environment jsdom
 *
 * 앱 전체 스모크 테스트.
 * 화면을 띄워 프로젝트를 만들고, 체크리스트를 체크하고, 원가를 넣어
 * 마진이 나오는 데까지를 실제 DOM에서 한 번에 훑는다.
 * 클릭 한 번 못 해 보고 배포하는 사고를 막기 위한 최소한의 안전망이다.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { App } from './App'
import { db } from './db/db'
import { ensureSeeded } from './db/repo/settings'

beforeAll(async () => {
  await ensureSeeded()
})

afterAll(() => {
  cleanup()
  db.close()
})

describe('앱 전체 흐름', () => {
  it('프로젝트 생성 → 체크리스트 → 원가·마진까지 실제로 동작한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 1. 처음에는 빈 상태 안내가 뜬다
    expect(await screen.findByText('첫 제품 프로젝트를 만들어 보세요')).toBeTruthy()

    // 2. 프로젝트 생성
    await user.click(screen.getByRole('button', { name: /프로젝트 만들기/ }))
    expect(await screen.findByText('새 제품 프로젝트')).toBeTruthy()

    await user.type(screen.getByPlaceholderText('품목명'), '호텔식 구스 이불')
    await user.click(screen.getByRole('button', { name: '만들기' }))

    // 3. 체크리스트로 이동하고 6단계가 깔려 있다
    expect(await screen.findByRole('heading', { name: '호텔식 구스 이불' })).toBeTruthy()
    expect(screen.getByText('소싱 및 원가 기획')).toBeTruthy()
    expect(screen.getByText('CS 및 사후관리')).toBeTruthy()

    const seeded = await db.checklistItems.count()
    expect(seeded).toBeGreaterThan(20)

    // 4. 항목 하나를 체크하면 진행률이 올라간다
    await waitFor(() => expect(screen.getByText(`0/${seeded} · 0%`)).toBeTruthy())
    const [firstCheckbox] = screen.getAllByRole('button', { name: '완료 체크' })
    await user.click(firstCheckbox)
    const onePct = Math.round((1 / seeded) * 100)
    await waitFor(() => expect(screen.getByText(`1/${seeded} · ${onePct}%`)).toBeTruthy())

    // 5. 원가 탭 — BOM에 자재를 넣으면 제조원가와 채널 마진이 계산된다
    await user.click(screen.getAllByRole('link', { name: '원가·마진' })[0])
    expect(await screen.findByText('① 상세 제조원가 (BOM)')).toBeTruthy()

    await user.click(await screen.findByRole('button', { name: /주원단.*항목 추가/ }))
    const priceField = await screen.findByText('단가')
    const priceInput = within(priceField.closest('label')!).getByRole('textbox')
    await user.clear(priceInput)
    await user.type(priceInput, '12000')

    // 요척 1 × 12,000원 + 로스율 3% = 12,360원
    await waitFor(() => expect(screen.getByText('12,360원')).toBeTruthy())

    // 6. 판매가를 넣으면 채널별 마진 비교가 채워진다
    const sellingField = screen.getByText('목표 판매가').closest('label')!
    await user.type(within(sellingField).getByRole('textbox'), '49000')

    await waitFor(() => expect(screen.getAllByText('네이버 스마트스토어').length).toBeGreaterThan(0))
    // 확정하지 않은 기본 요율에는 경고 배지가 붙는다
    expect(screen.getAllByText('요율 확인').length).toBeGreaterThan(0)

    // 7. 리포트 탭이 열린다
    await user.click(screen.getAllByRole('link', { name: '리포트' })[0])
    expect(await screen.findByText('제품 런칭 진행 보고서')).toBeTruthy()
    expect(screen.getByText('제조원가 (BOM) 명세서')).toBeTruthy()
  }, 60_000)
})
