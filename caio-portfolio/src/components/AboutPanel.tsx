import { createElement, useEffect, useRef, useState } from 'react'
import styles from './AboutPanel.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

interface Particle {
  ox: number; oy: number
  x:  number; y:  number
  dx: number; dy: number
  vx: number; vy: number
  r:  number; a:  number
  ph: number; sp: number
  isCon: boolean
}

export default function AboutPanel({ open, onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const mouseRef   = useRef({ x: -9999, y: -9999 })
  const rafRef     = useRef(0)
  const aliveRef   = useRef(false)
  const stopRef    = useRef<() => void>(() => {})
  // Spline is mounted on first open and kept in the DOM — avoids reloading the scene
  const [splineReady, setSplineReady] = useState(false)

  useEffect(() => {
    if (!open || splineReady) return
    // Inject the viewer script once, on first open
    if (!document.querySelector('script[data-spline-viewer]')) {
      const s = document.createElement('script')
      s.type = 'module'
      s.src  = 'https://unpkg.com/@splinetool/viewer@1.12.90/build/spline-viewer.js'
      s.setAttribute('data-spline-viewer', '')
      document.head.appendChild(s)
    }
    setSplineReady(true)
  }, [open, splineReady])

  useEffect(() => () => stopRef.current(), [])

  // Lock body scroll while panel is open; restore + go to hero on close
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      window.scrollTo(0, 0)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => stopRef.current(), 600)
      return () => clearTimeout(t)
    }

    stopRef.current()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    aliveRef.current = true
    let particles: Particle[] = []
    let cps: Particle[] = []   // constellation subset — cached to avoid per-frame filter
    let lastFrame = 0

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      if (!canvas) return
      const W = canvas.width, H = canvas.height
      // Reduce particle count on mobile — still looks great, runs much faster
      const isMobile = W <= 768
      const TOTAL_P  = isMobile ? 60  : 175
      const CON_P    = isMobile ? 0   : 55   // no constellation lines on mobile
      particles = Array.from({ length: TOTAL_P }, (_, i) => {
        const isCon = i < CON_P
        const ox    = Math.random()
        const oy    = Math.random()
        return {
          ox, oy,
          x: ox * W, y: oy * H,
          dx: (Math.random() - 0.5) * 0.00018,
          dy: (Math.random() - 0.5) * 0.00018,
          vx: 0, vy: 0,
          r:  isCon ? 0.8 + Math.random() * 1.8 : 0.3 + Math.random() * 1.1,
          a:  isCon ? 0.3  + Math.random() * 0.55 : 0.15 + Math.random() * 0.5,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 1.5,
          isCon,
        }
      })
      // Cache once — on mobile this is an empty array, skipping the O(n²) loop entirely
      cps = particles.filter(p => p.isCon)
    }

    function draw(ts: number) {
      if (!aliveRef.current || !canvas) return

      // Pause when the tab is not visible
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      // Throttle to ~30 fps on mobile — imperceptible for a background effect
      const isMobile = canvas.width <= 768
      if (isMobile && ts - lastFrame < 33) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      lastFrame = ts

      const W = canvas.width, H = canvas.height
      const t = ts * 0.001
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      ctx.fillStyle = '#05070F'
      ctx.fillRect(0, 0, W, H)

      const ATTRACT_R = 200
      const ATTRACT_F = 0.012
      const DAMPING   = 0.88

      particles.forEach(p => {
        p.ox = Math.max(0.005, Math.min(0.995, p.ox + p.dx))
        p.oy = Math.max(0.005, Math.min(0.995, p.oy + p.dy))

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

        p.vx *= DAMPING
        p.vy *= DAMPING
        p.x = p.ox * W + p.vx
        p.y = p.oy * H + p.vy

        const twinkle = 0.4 + 0.6 * Math.sin(t * p.sp + p.ph)
        const alpha   = p.a * twinkle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        ctx.fill()
      })

      // Constellation lines — cps is empty on mobile so this block never runs there.
      // Use d² comparison to skip sqrt for the majority of pairs that are too far apart.
      if (cps.length > 0) {
        const maxDist  = W * 0.16
        const maxDist2 = maxDist * maxDist
        for (let i = 0; i < cps.length; i++) {
          for (let j = i + 1; j < cps.length; j++) {
            const dx = cps[i].x - cps[j].x
            const dy = cps[i].y - cps[j].y
            const d2 = dx * dx + dy * dy
            if (d2 < maxDist2) {
              const d = Math.sqrt(d2)
              ctx.beginPath()
              ctx.moveTo(cps[i].x, cps[i].y)
              ctx.lineTo(cps[j].x, cps[j].y)
              ctx.strokeStyle = `rgba(255,255,255,${((1 - d / maxDist) * 0.18).toFixed(3)})`
              ctx.lineWidth = 0.4
              ctx.stroke()
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

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

    return () => {}
  }, [open])

  return (
    <div className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}>
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.panel}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close about panel">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="1" y1="1" x2="17" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="17" y1="1" x2="1" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.container}>
          {/* Left — Spline 3D: mounted on first open, stays mounted to avoid scene reload */}
          <div className={styles.photoWrap}>
            <div className={styles.photoCircle}>
              <div className={styles.splineScaler}>
                {splineReady && createElement('spline-viewer', { url: 'https://prod.spline.design/bDkU4ksunu8lSYJ7/scene.splinecode' })}
              </div>
            </div>
          </div>

          {/* Right — content */}
          <div className={styles.content}>
            <h2 className={styles.header}>Hi, I'm Caio,</h2>

            <div className={styles.bio}>
              <p>I've spent 8 years designing interfaces for B2B and SaaS products in the technology 
                 sector, working directly with technical users, engineers, and stakeholders. Throughout 
                 that time I was constantly in meetings, bridging the gap between what users needed and 
                 what the interface delivered.
              </p>
              <p>
                 I actively use AI in my design process, from generating personas and mapping flows to 
                 building MVPs through vibe coding to validate ideas faster. My knowledge in HTML and CSS 
                 keeps collaboration with engineering teams precise and fluid.
              </p>
               <p>
                 On a personal note, I'm a musician. I play guitar. And the creativity, technique, and 
                 precision I put into every composition are equivalent to the delivery I bring to every 
                 design challenge.
              </p>
            </div>

            <div className={styles.divider} />

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>40%</span>
                <span className={styles.statDesc}>Optimization in interface response speed</span>
              </div>
              <div className={styles.statRule} />
              <div className={styles.stat}>
                <span className={styles.statLabel}>10+</span>
                <span className={styles.statDesc}>Projects B2B & SaaS products delivered</span>
              </div>
              <div className={styles.statRule} />
              <div className={styles.stat}>
                <span className={styles.statLabel}>8+</span>
                <span className={styles.statDesc}>Years experience in digital interfaces &amp; industrial systems</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
