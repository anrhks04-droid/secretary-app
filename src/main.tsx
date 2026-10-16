import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ensureSeeded } from './db/repo/settings'
import './styles/index.css'

// 채널 프리셋·설정 싱글턴을 먼저 깔아 둔다. 실패해도 앱은 떠야 하므로 막지 않는다.
void ensureSeeded().catch((e) => console.error('초기 데이터 생성 실패', e))

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾을 수 없습니다.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
