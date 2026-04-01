import { useEffect } from 'react'

/**
 * M3 Terminaller üzerindeki fiziksel tuşları dinlemek için Hook.
 */
export function useTerminalKeys(onF1?: () => void, onF2?: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 basıldı
      if (e.key === 'F1') {
        e.preventDefault() // Tarayıcının varsayılan Yardım sayfasını engelle
        if (onF1) onF1()
      }
      // F2 basıldı
      if (e.key === 'F2') {
        e.preventDefault()
        if (onF2) onF2()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onF1, onF2])
}
