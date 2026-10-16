import { useState } from 'react'

/** 테스트에서는 서비스워커가 없으므로 virtual:pwa-register/react 를 이걸로 바꿔 끼운다. */
export function useRegisterSW() {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async () => {},
  }
}
