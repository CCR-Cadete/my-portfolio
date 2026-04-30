import { useEffect, useRef } from 'react'
import type React from 'react'
import FRAMES_JSON from '../frames.json'
import styles from './IntroAnimation.module.css'

const FRAMES = FRAMES_JSON as string[]
const BASE   = 'https://res.cloudinary.com/dfiyxjf5t/image/upload/f_webp,q_75/'

interface Props {
  planetCanvasRef: React.RefObject<HTMLCanvasElement | null>
  onScrollReady: () => void
}

interface Particle {
  ox: number; oy: number
  x:  number; y:  number
  ex: number; ey: number
  r:  number; a:  number
  sp: number; ph: number
  dx: number; dy: number
  isCon: boolean
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
}

export default function IntroAnimation({ planetCanvasRef, onScrollReady }: Props) {
  const bgCanvasRef    = useRef<HTMLCanvasElement>(null)
  const introRef       = useRef<HTMLDivElement>(null)
  const wrapCaioRef    = useRef<HTMLDivElement>(null)
  const wrapCadeteRef  = useRef<HTMLDivElement>(null)
  const baseCaioRef    = useRef<HTMLDivElement>(null)
  const baseCadeteRef  = useRef<HTMLDivElement>(null)
  const fillCaioRef    = useRef<HTMLDivElement>(null)
  const fillCadeteRef  = useRef<HTMLDivElement>(null)
  const ghostCaioRef   = useRef<HTMLDivElement>(null)
  const ghostCadeteRef = useRef<HTMLDivElement>(null)
  const subtitleRef    = useRef<HTMLDivElement>(null)
  const heroRef        = useRef<HTMLDivElement>(null)
  const nameCornerRef  = useRef<HTMLDivElement>(null)
  const heroRoleRef    = useRef<HTMLDivElement>(null)
  const heroDividerRef = useRef<HTMLDivElement>(null)
  const heroBodyRef    = useRef<HTMLDivElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const introInnerRef  = useRef<HTMLDivElement>(null)

  const anim = useRef({
    particles:          [] as Particle[],
    cps:                [] as Particle[],
    cState:             'idle' as 'idle' | 'dispersing' | 'done',
    constellationAlpha: 1,
    heroVisible:        false,
    rafId:              0,
    glitchIv:           null as ReturnType<typeof setInterval> | null,
    timers:             [] as ReturnType<typeof setTimeout>[],
  })

  useEffect(() => {
    const st        = anim.current
    const _bgCanvas = bgCanvasRef.current
    if (!_bgCanvas) return
    const bgCanvas: HTMLCanvasElement = _bgCanvas
    const ctx = bgCanvas.getContext('2d')!

    let mounted = true

    const pCanvas = planetCanvasRef.current
    if (pCanvas) {
      pCanvas.width  = window.innerWidth
      pCanvas.height = window.innerHeight
    }

    function resize() {
      bgCanvas.width  = window.innerWidth
      bgCanvas.height = window.innerHeight
      const pc = planetCanvasRef.current
      if (pc) { pc.width = window.innerWidth; pc.height = window.innerHeight }
      initConstellation()
    }

    function initConstellation() {
      const W = bgCanvas.width, H = bgCanvas.height
      const isMobile = W <= 768
      const TOTAL_P  = isMobile ? 40  : 150
      const CON_P    = isMobile ? 0   : 40  // no constellation lines on mobile
      st.particles = Array.from({ length: TOTAL_P }, (_, i) => {
        const isCon = i < CON_P
        const ox    = Math.random(), oy = Math.random()
        const angle = Math.atan2(oy - 0.5, ox - 0.5) || Math.random() * Math.PI * 2
        return {
          ox, oy,
          x: ox * W, y: oy * H,
          ex: Math.cos(angle), ey: Math.sin(angle),
          r:  isCon ? 0.8 + Math.random() * 1.8 : 0.3 + Math.random() * 1.1,
          a:  isCon ? 0.3 + Math.random() * 0.55 : 0.15 + Math.random() * 0.55,
          sp: 0.001 + Math.random() * 0.005,
          ph: Math.random() * Math.PI * 2,
          dx: (Math.random() - 0.5) * 0.0002,
          dy: (Math.random() - 0.5) * 0.0002,
          isCon,
        }
      })
      st.cps = st.particles.filter(p => p.isCon)
    }

    function drawBgFrame(ts: number) {
      // When tab is hidden, stop the RAF loop entirely — visibilitychange will restart it
      if (document.hidden) return

      const W = bgCanvas.width, H = bgCanvas.height
      const t = ts * 0.001

      ctx.clearRect(0, 0, W, H)

      // ── Particle simulation ──
      if (st.cState !== 'done') {
        if (st.cState === 'dispersing') {
          st.constellationAlpha = Math.max(0, st.constellationAlpha - 0.012)
          if (st.constellationAlpha === 0) st.cState = 'done'
        }

        st.particles.forEach(p => {
          if (st.cState === 'idle') {
            p.ox = Math.max(0.01, Math.min(0.99, p.ox + p.dx))
            p.oy = Math.max(0.01, Math.min(0.99, p.oy + p.dy))
            p.x  = p.ox * W
            p.y  = p.oy * H
          } else if (st.cState === 'dispersing') {
            p.x  += p.ex
            p.y  += p.ey
            p.ex *= 0.97
            p.ey *= 0.97
          }

          const twinkle = 0.4 + 0.6 * Math.sin(t * p.sp * 60 + p.ph)
          const alpha   = p.a * twinkle * st.constellationAlpha

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`
          ctx.fill()
        })

        // Constellation lines — idle only
        if (st.constellationAlpha > 0 && st.cState === 'idle') {
          const maxDist  = W * 0.18
          const maxDist2 = maxDist * maxDist
          for (let i = 0; i < st.cps.length; i++) {
            for (let j = i + 1; j < st.cps.length; j++) {
              const dx = st.cps[i].x - st.cps[j].x
              const dy = st.cps[i].y - st.cps[j].y
              const d2 = dx * dx + dy * dy
              if (d2 < maxDist2) {
                const d = Math.sqrt(d2)
                ctx.beginPath()
                ctx.moveTo(st.cps[i].x, st.cps[i].y)
                ctx.lineTo(st.cps[j].x, st.cps[j].y)
                ctx.strokeStyle = `rgba(255,255,255,${(st.constellationAlpha * (1 - d / maxDist) * 0.22).toFixed(3)})`
                ctx.lineWidth = 0.4
                ctx.stroke()
              }
            }
          }
        }
      }

      // ── Waveform (hero phase only) ──
      if (st.heroVisible) {
        const wY       = H * 0.82
        const isMobile = W <= 768
        const step     = isMobile ? 4 : 2
        const wLayers  = isMobile
          ? [{ amp: 10, freq: 0.016, sp: 0.55, a: 0.06 }]
          : [
              { amp: 10, freq: 0.016, sp: 0.55, a: 0.06 },
              { amp:  6, freq: 0.027, sp: 0.85, a: 0.04 },
            ]
        for (const l of wLayers) {
          ctx.beginPath()
          for (let x = 0; x <= W; x += step) {
            const y = wY
              + Math.sin(x * l.freq + t * l.sp * 3) * l.amp
              + Math.sin(x * l.freq * 0.5 + t * l.sp * 1.7) * (l.amp * 0.4)
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.strokeStyle = `rgba(77,142,255,${l.a})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
      }

      st.rafId = requestAnimationFrame(drawBgFrame)
    }

    function setFillProgress(p: number) {
      const pct  = Math.round((1 - p) * 50)
      const clip = `inset(0 ${pct}% 0 ${pct}%)`
      if (fillCaioRef.current)   fillCaioRef.current.style.clipPath   = clip
      if (fillCadeteRef.current) fillCadeteRef.current.style.clipPath = clip
    }

    function glitchTick(intensity: number) {
      const ghosts = [ghostCaioRef.current, ghostCadeteRef.current]
      ghosts.forEach(g => {
        if (!g) return
        if (Math.random() < intensity * 0.7) {
          const dx = (Math.random()-0.5) * 12 * intensity
          const dy = (Math.random()-0.5) *  6 * intensity
          g.style.transform = `translate(${dx}px,${dy}px)`
          g.style.opacity   = String((0.3 + Math.random() * 0.4) * intensity)
        } else {
          g.style.opacity = '0'
        }
      })
    }

    function triggerDispersion() {
      const W  = bgCanvas.width
      const H  = bgCanvas.height
      const cx = W / 2
      const cy = H / 2

      // ── Load planet canvas ──
      const pCanvas = planetCanvasRef.current
      if (pCanvas) {
        const pc: HTMLCanvasElement = pCanvas
        const frame0 = new Image()
        frame0.crossOrigin = 'anonymous'
        frame0.src = `${BASE}${FRAMES[0]}.png`
        frame0.onload = () => {
          const pCtx = pc.getContext('2d')
          if (!pCtx) return
          const cw = pc.width || W
          const ch = pc.height || H
          if (!pc.width) { pc.width = cw; pc.height = ch }
          const s = Math.max(cw / frame0.naturalWidth, ch / frame0.naturalHeight)
          pCtx.clearRect(0, 0, cw, ch)
          pCtx.drawImage(
            frame0,
            (cw - frame0.naturalWidth  * s) / 2,
            (ch - frame0.naturalHeight * s) / 2,
            frame0.naturalWidth  * s,
            frame0.naturalHeight * s,
          )
        }
        pc.style.transition = 'opacity 1.8s ease, transform 1.8s ease'
        pc.style.opacity    = '1'
        pc.style.transform  = 'scale(1)'
      }

      // ── Compute repulsion velocities from current positions ──
      // Each particle is pushed away from its neighbours based on proximity.
      // Combined with a gentle push away from center, this clears space for the hero.
      st.particles.forEach(p => { p.ex = 0; p.ey = 0 })

      const repelR  = Math.max(W, H) * 0.28
      const repelR2 = repelR * repelR
      for (let i = 0; i < st.particles.length; i++) {
        for (let j = i + 1; j < st.particles.length; j++) {
          const pi = st.particles[i], pj = st.particles[j]
          const dx = pi.x - pj.x, dy = pi.y - pj.y
          const d2 = dx * dx + dy * dy
          if (d2 < repelR2 && d2 > 0.01) {
            const d  = Math.sqrt(d2)
            const f  = (repelR - d) / repelR * 2.2  // linear falloff
            const nx = dx / d, ny = dy / d
            pi.ex += nx * f;  pi.ey += ny * f
            pj.ex -= nx * f;  pj.ey -= ny * f
          }
        }
      }

      // Add a push away from center so the hero space clears
      st.particles.forEach(p => {
        const dx = p.x - cx, dy = p.y - cy
        const d  = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        p.ex += (dx / d) * 1.2
        p.ey += (dy / d) * 1.2
      })

      st.cState             = 'dispersing'
      st.constellationAlpha = 1

      // ── Fade out the intro name overlay ──
      const introInner = introInnerRef.current
      if (introInner) {
        introInner.style.transition = 'opacity 0.9s ease'
        introInner.style.opacity    = '0'
      }
      setTimeout(() => {
        const introEl = introRef.current
        if (introEl) introEl.style.opacity = '0'
      }, 950)

      // ── Reveal hero while particles are still dispersing ──
      setTimeout(revealHero, 200)
    }

    function revealHero() {
      st.heroVisible = true

      heroRoleRef.current?.classList.add(styles.heroRoleShow)
      heroDividerRef.current?.classList.add(styles.heroDividerShow)

      setTimeout(() => {
        heroBodyRef.current?.classList.add(styles.heroBodyShow)
        setTimeout(revealHeroText, 300)
      }, 220)
    }

    function revealHeroText() {
      const sentence = "I'm a product designer and a musician in my spare time. I enjoy designing interfaces in the same way I compose music, with intention, rhythm, and harmony in every detail."
      const words    = sentence.split(' ')
      const container = heroBodyRef.current
      if (!container) return
      container.innerHTML = ''

      const wordSpans = words.map((w, i) => {
        const sp = document.createElement('span')
        sp.className   = styles.W
        sp.textContent = w + (i < words.length - 1 ? ' ' : '')
        container.appendChild(sp)
        return sp
      })

      nameCornerRef.current?.classList.add(styles.nameCornerShow)
      onScrollReady()

      let idx = 0
      function next() {
        if (idx < wordSpans.length) {
          wordSpans[idx].classList.add(styles.Wshow)
          idx++
          setTimeout(next, 55 + Math.random() * 35)
        }
      }
      setTimeout(next, 300)
    }

    function run() {
      if (!mounted) return
      st.heroVisible        = false
      st.cState             = 'idle'
      st.constellationAlpha = 1

      setFillProgress(0)

      const introEl  = introRef.current
      const bgEl     = bgCanvasRef.current
      if (!introEl || !bgEl) return

      introEl.style.opacity    = '1'
      introEl.style.transform  = 'none'
      introEl.style.transition = 'none'
      bgEl.style.transition    = 'none'

      if (introInnerRef.current) {
        introInnerRef.current.style.transition = 'none'
        introInnerRef.current.style.opacity    = ''
      }

      const fillItems = [
        { ref: fillCaioRef,   text: 'CAIO'   },
        { ref: fillCadeteRef, text: 'CADETE' },
      ]
      fillItems.forEach(({ ref, text }) => {
        if (!ref.current) return
        ref.current.textContent    = text
        ref.current.style.clipPath = ''
      })

      ;[baseCaioRef, baseCadeteRef, ghostCaioRef, ghostCadeteRef].forEach(r => {
        if (r.current) r.current.style.opacity = ''
      })

      const pc = planetCanvasRef.current
      if (pc) {
        pc.style.transition = 'none'
        pc.style.opacity    = '0'
        pc.style.transform  = 'scale(1.05)'
      }

      nameCornerRef.current?.classList.remove(styles.nameCornerShow)
      heroRoleRef.current?.classList.remove(styles.heroRoleShow)
      heroDividerRef.current?.classList.remove(styles.heroDividerShow)
      heroBodyRef.current?.classList.remove(styles.heroBodyShow)
      subtitleRef.current?.classList.remove(styles.subtitleShow)
      if (heroBodyRef.current) heroBodyRef.current.innerHTML = ''

      ;[ghostCaioRef, ghostCadeteRef].forEach(r => {
        if (!r.current) return
        r.current.style.opacity   = '0'
        r.current.style.transform = ''
      })

      requestAnimationFrame(() => {
        if (!mounted) return
        introEl.style.transition = ''
        bgEl.style.transition    = ''
        introEl.classList.add(styles.introVisible)
        bgEl.classList.add(styles.bgVisible)
      })

      const later = (fn: () => void, ms: number) => {
        st.timers.push(setTimeout(fn, ms))
      }

      later(() => {
        subtitleRef.current?.classList.add(styles.subtitleShow)
      }, 500)

      later(() => {
        let intensity = 0.1
        st.glitchIv = setInterval(() => {
          intensity = Math.min(intensity + 0.02, 0.6)
          glitchTick(intensity)
        }, 150)
      }, 900)

      later(() => {
        if (st.glitchIv) { clearInterval(st.glitchIv); st.glitchIv = null }
        ;[ghostCaioRef, ghostCadeteRef].forEach(r => {
          if (r.current) r.current.style.opacity = '0'
        })

        const duration = 1800
        const start    = performance.now()

        function fillStep(now: number) {
          const p     = Math.min((now - start) / duration, 1)
          const eased = easeInOutCubic(p)
          setFillProgress(eased)
          if (p < 1) {
            requestAnimationFrame(fillStep)
          } else {
            setTimeout(triggerDispersion, 400)
          }
        }
        requestAnimationFrame(fillStep)
      }, 2200)
    }

    let heroScrollPending = false
    function onHeroScroll() {
      if (heroScrollPending) return
      heroScrollPending = true
      requestAnimationFrame(() => {
        heroScrollPending = false
        const wrap = document.getElementById('scroll-wrap')
        if (!wrap) return
        const maxY = wrap.offsetHeight - window.innerHeight
        if (maxY <= 0) return
        const p = Math.min(1, window.scrollY / maxY)
        const heroOpacity = Math.max(0, 1 - p * 5)
        const content = heroContentRef.current
        if (content) content.style.opacity = heroOpacity.toFixed(3)
      })
    }

    function onVisibilityChange() {
      if (!document.hidden && mounted) {
        // Restart the RAF loop when the user returns to this tab
        cancelAnimationFrame(st.rafId)
        st.rafId = requestAnimationFrame(drawBgFrame)
      }
    }

    resize()
    st.rafId = requestAnimationFrame(drawBgFrame)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onHeroScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.fonts.ready.then(() => { if (mounted) run() })

    return () => {
      mounted = false
      cancelAnimationFrame(st.rafId)
      if (st.glitchIv) clearInterval(st.glitchIv)
      st.timers.forEach(clearTimeout)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onHeroScroll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <canvas ref={bgCanvasRef} className={styles.bg} />
      <div className={styles.scanline} />

      <div ref={introRef} className={styles.intro}>
        <div ref={introInnerRef} className={styles.introInner}>
          {/* CAIO */}
          <div ref={wrapCaioRef} className={styles.nameWrap}>
            <div ref={baseCaioRef}  className={`${styles.nameLine} ${styles.nameBase}`}>CAIO</div>
            <div ref={fillCaioRef}  className={`${styles.nameLine} ${styles.nameFill}`}>CAIO</div>
            <div ref={ghostCaioRef} className={`${styles.nameLine} ${styles.nameGhost}`}>CAIO</div>
          </div>
          {/* CADETE */}
          <div ref={wrapCadeteRef} className={styles.nameWrap}>
            <div ref={baseCadeteRef}  className={`${styles.nameLine} ${styles.nameBase}`}>CADETE</div>
            <div ref={fillCadeteRef}  className={`${styles.nameLine} ${styles.nameFill}`}>CADETE</div>
            <div ref={ghostCadeteRef} className={`${styles.nameLine} ${styles.nameGhost}`}>CADETE</div>
          </div>
          <div ref={subtitleRef} className={styles.subtitle}>
            Product &amp; Interactive Designer
          </div>
        </div>
      </div>

      {/* nameCorner sits in its own fixed layer above the works section */}
      <div ref={nameCornerRef} className={styles.nameCorner}>
        CAIO<br />CADETE
      </div>

      <div ref={heroRef} className={styles.hero}>
        <div ref={heroContentRef} className={styles.heroContent}>
          <div ref={heroRoleRef}    className={styles.heroRole}>Product &amp; Interactive Designer</div>
          <div ref={heroDividerRef} className={styles.heroDivider} />
          <div ref={heroBodyRef}    className={styles.heroBody} />
        </div>
      </div>
    </>
  )
}
