import { useEffect, useRef } from 'react'
import styles from './CustomCursor.module.css'

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  // Actual mouse position
  const target = useRef({ x: -100, y: -100 })
  // Smoothed position
  const current = useRef({ x: -100, y: -100 })
  const hoveredRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    const el = cursorRef.current
    if (!el) return
    // No custom cursor on touch/pointer-coarse devices — they have no mouse
    if (window.matchMedia('(pointer: coarse)').matches) return

    function onMouseMove(e: MouseEvent) {
      target.current = { x: e.clientX, y: e.clientY }
    }

    function onMouseOver(e: MouseEvent) {
      const node = (e.target as Element).closest(
        'a, button, [role="button"], input, select, textarea, label, [tabindex]'
      )
      if (node && !hoveredRef.current) {
        hoveredRef.current = true
        el?.classList.add(styles.hovered)
      }
    }

    function onMouseOut(e: MouseEvent) {
      const node = (e.target as Element).closest(
        'a, button, [role="button"], input, select, textarea, label, [tabindex]'
      )
      // Only remove if we're leaving the element entirely
      if (node && !node.contains(e.relatedTarget as Node | null)) {
        hoveredRef.current = false
        el?.classList.remove(styles.hovered)
      }
    }

    function loop() {
      // Lerp smoothing — 0.18 gives a slight lag, feels natural
      const lerp = 0.18
      current.current.x += (target.current.x - current.current.x) * lerp
      current.current.y += (target.current.y - current.current.y) * lerp

      if (el) {
        el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout', onMouseOut)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return <div ref={cursorRef} className={styles.cursor} />
}
