// jsdom에는 IndexedDB가 없다. Dexie가 뜨려면 먼저 깔아 둬야 한다.
import 'fake-indexeddb/auto'

if (typeof window !== 'undefined') {
  // 사진 미리보기용 — jsdom에는 구현이 없다
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => {}
  }
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  }
}
