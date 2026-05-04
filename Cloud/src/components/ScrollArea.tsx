/**
 * ScrollArea.tsx
 * Conteneur scroll avec scrollbar cachée + fades haut/bas dynamiques.
 */
import { useRef, useState, useEffect, type ReactNode } from 'react'

interface ScrollAreaProps {
  children: ReactNode
  className?: string
}

export default function ScrollArea({ children, className = '' }: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop]       = useState(false)
  const [showBottom, setShowBottom] = useState(false)

  const update = () => {
    const el = ref.current
    if (!el) return
    setShowTop(el.scrollTop > 10)
    setShowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 10)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    // Relancer après chargement des données (resize observer)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [])

  return (
    <div className={`relative flex-1 overflow-hidden ${className}`}>
      {/* Fade haut */}
      <div
        className={`pointer-events-none absolute top-0 left-0 right-0 h-8 z-10
          bg-gradient-to-b from-gray-100 dark:from-gray-950 to-transparent
          transition-opacity duration-200 ${showTop ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Zone scrollable */}
      <div
        ref={ref}
        className="h-full overflow-y-auto scrollbar-hide"
      >
        {children}
      </div>

      {/* Fade bas */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10
          bg-gradient-to-t from-gray-100 dark:from-gray-950 to-transparent
          transition-opacity duration-200 ${showBottom ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

