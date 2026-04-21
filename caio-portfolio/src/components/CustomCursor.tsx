import { useEffect, useRef } from 'react'
import styles from './CustomCursor.module.css'

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  const target  = useRef({ x: -200, y: -200 })
  const current = useRef({ x: -200, y: -200 })
  const hoveredRef = useRef(false)
  const rafRef  = useRef(0)
  const readyRef = useRef(false)

  useEffect(() => {
    // Fine-pointer check is more reliable than coarse for detecting mice.
    // Coarse can match on desktop touchscreens; fine will not match on touch-only.
    if (!window.matchMedia('(pointer: fine)').matches) return

    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    function onMouseMove(e: MouseEvent) {
      target.current = { x: e.clientX, y: e.clientY }

      // Reveal both elements on first mouse movement
      if (!readyRef.current) {
        readyRef.current = true
        dot!.style.opacity  = '1'
        ring!.style.opacity = '1'
      }

      // Dot follows instantly — no lerp
      dot!.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
    }

    function onMouseOver(e: MouseEvent) {
      const node = (e.target as Element).closest(
        'a, button, [role="button"], input, select, textarea, label, [tabindex]'
      )
      if (node && !hoveredRef.current) {
        hoveredRef.current = true
        ring?.classList.add(styles.hovered)
        dot?.classList.add(styles.dotHovered)
      }
    }

    function onMouseOut(e: MouseEvent) {
      const node = (e.target as Element).closest(
        'a, button, [role="button"], input, select, textarea, label, [tabindex]'
      )
      if (node && !node.contains(e.relatedTarget as Node | null)) {
        hoveredRef.current = false
        ring?.classList.remove(styles.hovered)
        dot?.classList.remove(styles.dotHovered)
      }
    }

    function loop() {
      const lerp = 0.18
      current.current.x += (target.current.x - current.current.x) * lerp
      current.current.y += (target.current.y - current.current.y) * lerp

      ring!.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`

      rafRef.current = requestAnimationFrame(loop)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout',  onMouseOut)
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout',  onMouseOut)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  className={styles.dot}  />
      <div ref={ringRef} className={styles.ring} />
    </>
  )
}
