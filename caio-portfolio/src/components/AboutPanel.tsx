import { useEffect, useRef } from 'react'
import Spline from '@splinetool/react-spline'
import styles from './AboutPanel.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

interface Particle {
  ox: number; oy: number   // fractional base position (0-1)
  x:  number; y:  number   // pixel position
  dx: number; dy: number   // fractional drift per frame
  vx: number; vy: number   // extra velocity from mouse pull
  r:  number; a:  number
  ph: number; sp: number   // twinkle phase & speed
  isCon: boolean           // constellation particle (brighter, draws lines)
}

export default function AboutPanel({ open, onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const mouseRef   = useRef({ x: -9999, y: -9999 })
  const rafRef     = useRef(0)
  // Refs that persist across the open/close cycle so cleanup can be deferred
  const aliveRef   = useRef(false)
  const stopRef    = useRef<() => void>(() => {})

  // On unmount: stop immediately regardless
  useEffect(() => () => stopRef.current(), [])

  useEffect(() => {
    if (!open) {
      // Delay teardown until AFTER the 0.5 s CSS fade-out finishes
      const t = setTimeout(() => stopRef.current(), 600)
      return () => clearTimeout(t)
    }

    // Opening: tear down any previous run first
    stopRef.current()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    aliveRef.current = true
    let particles: Particle[] = []

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      if (!canvas) return
      const W = canvas.width
      const H = canvas.height
      particles = Array.from({ length: 175 }, (_, i) => {
        const isCon = i < 55
        const ox    = Math.random()
        const oy    = Math.random()
        return {
          ox, oy,
          x:  ox * W,
          y:  oy * H,
          dx: (Math.random() - 0.5) * 0.00018,
          dy: (Math.random() - 0.5) * 0.00018,
          vx: 0,
          vy: 0,
          r:  isCon ? 0.8 + Math.random() * 1.8 : 0.3 + Math.random() * 1.1,
          a:  isCon ? 0.3  + Math.random() * 0.55 : 0.15 + Math.random() * 0.5,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 1.5,
          isCon,
        }
      })
    }

    function draw(ts: number) {
      if (!aliveRef.current || !canvas) return
      const W = canvas.width
      const H = canvas.height
      const t = ts * 0.001
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Fill background in draw loop — canvas element itself stays transparent
      ctx.fillStyle = '#05090f'
      ctx.fillRect(0, 0, W, H)

      const ATTRACT_R = 200   // px radius around cursor
      const ATTRACT_F = 0.012 // force multiplier
      const DAMPING   = 0.88  // velocity damping per frame

      particles.forEach(p => {
        // Ambient drift (fractional coords, same approach as intro)
        p.ox = Math.max(0.005, Math.min(0.995, p.ox + p.dx))
        p.oy = Math.max(0.005, Math.min(0.995, p.oy + p.dy))

        // Mouse attraction — all particles respond, constellation ones more so
        if (mx > -100) {
          const tdx  = mx - p.x
          const tdy  = my - p.y
          const dist = Math.sqrt(tdx * tdx + tdy * tdy)
          if (dist < ATTRACT_R) {
            const f = (1 - dist / ATTRACT_R) * ATTRACT_F * (p.isCon ? 1.4 : 0.7)
            p.vx += tdx * f
            p.vy += tdy * f
          }
        }

        // Damp extra velocity so particles settle back after cursor leaves
        p.vx *= DAMPING
        p.vy *= DAMPING

        p.x = p.ox * W + p.vx
        p.y = p.oy * H + p.vy

        // Twinkle
        const twinkle = 0.4 + 0.6 * Math.sin(t * p.sp + p.ph)
        const alpha   = p.a * twinkle

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        ctx.fill()
      })

      // Constellation lines — only between brighter particles, tight radius
      const cps     = particles.filter(p => p.isCon)
      const maxDist = W * 0.16
      for (let i = 0; i < cps.length; i++) {
        for (let j = i + 1; j < cps.length; j++) {
          const dx = cps[i].x - cps[j].x
          const dy = cps[i].y - cps[j].y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < maxDist) {
            ctx.beginPath()
            ctx.moveTo(cps[i].x, cps[i].y)
            ctx.lineTo(cps[j].x, cps[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${((1 - d / maxDist) * 0.18).toFixed(3)})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    // Register the stop function so the close-delay and unmount handlers can call it
    stopRef.current = () => {
      aliveRef.current = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      stopRef.current = () => {}
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    rafRef.current = requestAnimationFrame(draw)

    // No inline cleanup — the if(!open) branch above handles teardown after fade
    return () => {}
  }, [open])

  return (
    <div className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}>
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.panel}>
        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close about panel">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="1" y1="1" x2="17" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="17" y1="1" x2="1" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.container}>
          {/* Left — Spline 3D */}
          <div className={styles.photoWrap}>
            <div className={styles.photoCircle}>
              <div className={styles.splineScaler}>
                <Spline scene="https://prod.spline.design/49Hes-ELkjWJ1uZd/scene.splinecode" />
              </div>
            </div>
          </div>

          {/* Right — content */}
          <div className={styles.content}>
            <h2 className={styles.header}>Hi, I'm Caio,</h2>

            <div className={styles.bio}>
              <p>
                I'm a UX/UI Designer with 8 years of experience in B2B and SaaS products. My
                background started in building automation, working directly with technical users and
                stakeholders on complex supervisory systems, identifying usability failures and
                redesigning operational flows that had to work under pressure. That experience
                shaped the way I approach every project.
              </p>
              <p>
                Today I apply that same mindset to digital products, building functional interfaces,
                scalable design systems and experiences that make sense to the people using them. I
                actively use AI in my process, building MVPs through vibe coding to validate flows
                faster. I also have knowledge of HTML and CSS, which brings me closer to
                development and makes collaboration with engineering teams more fluid and
                precise.
              </p>
            </div>

            <div className={styles.divider} />

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>3x</span>
                <span className={styles.statDesc}>Faster failure response<br />after interface redesign</span>
              </div>
              <div className={styles.statRule} />
              <div className={styles.stat}>
                <span className={styles.statLabel}>40%</span>
                <span className={styles.statDesc}>Increase in critical alert<br />identification in CCTV</span>
              </div>
              <div className={styles.statRule} />
              <div className={styles.stat}>
                <span className={styles.statLabel}>8yr</span>
                <span className={styles.statDesc}>Experience in industrial<br />interfaces &amp; digital products</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
