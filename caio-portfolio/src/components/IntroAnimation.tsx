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
    particles:           [] as Particle[],
    cps:                 [] as Particle[],  // constellation subset — cached, avoids per-frame filter
    cState:              'idle' as 'idle' | 'contracting' | 'expanding' | 'done',
    cProgress:           0,
    expandScale:         1,
    constellationAlpha:  1,
    heroVisible:         false,
    rafId:               0,
    glitchIv:            null as ReturnType<typeof setInterval> | null,
    timers:              [] as ReturnType<typeof setTimeout>[],
    textPos:             { x: 0.5, y: 0.5 },
  })

  useEffect(() => {
    const st      = anim.current
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
      // Fewer particles on mobile — still looks good, runs much faster
      const isMobile = W <= 768
      const TOTAL_P  = isMobile ? 80  : 175
      const CON_P    = isMobile ? 20  : 55
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
      // Cache constellation particles once — avoids a new array allocation every frame
      st.cps = st.particles.filter(p => p.isCon)
    }

    function drawBgFrame(ts: number) {
      // Pause when tab is not visible — browser already throttles rAF but this avoids
      // any unnecessary computation on the frames that do fire while hidden
      if (document.hidden) {
        st.rafId = requestAnimationFrame(drawBgFrame)
        return
      }

      const W = bgCanvas.width, H = bgCanvas.height
      ctx.clearRect(0, 0, W, H)
      const t = ts * 0.001

      // ── Particle simulation — skipped entirely once intro is done ──
      // After the intro completes, constellationAlpha = 0 so particles are invisible.
      // There is no reason to simulate or draw them; only the waveform remains.
      if (st.cState !== 'done') {
        st.particles.forEach(p => {
          if (st.cState === 'idle') {
            p.ox = Math.max(0.01, Math.min(0.99, p.ox + p.dx))
            p.oy = Math.max(0.01, Math.min(0.99, p.oy + p.dy))
            p.x  = p.ox * W
            p.y  = p.oy * H
          } else if (st.cState === 'contracting') {
            const e = easeInOutCubic(st.cProgress)
            p.x = p.ox * W + (W * 0.5 - p.ox * W) * e
            p.y = p.oy * H + (H * 0.5 - p.oy * H) * e
          } else if (st.cState === 'expanding') {
            p.x += p.ex * Math.max(W, H) * 0.06
            p.y += p.ey * Math.max(W, H) * 0.06
          }

          const twinkle = 0.4 + 0.6 * Math.sin(t * p.sp * 60 + p.ph)
          let alpha = p.a * twinkle * st.constellationAlpha
          if (st.cState === 'expanding') alpha *= (1 - st.expandScale)

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`
          ctx.fill()
        })

        // ── Constellation lines ──
        // Use cached cps array (no per-frame filter allocation).
        // Use d² comparison to avoid sqrt on the majority of pairs that are too far.
        if (st.constellationAlpha > 0 && st.cState !== 'expanding') {
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
        const wY      = H * 0.82
        const isMobile = W <= 768
        // Larger step on mobile — fewer lineTo calls, still looks smooth
        const step    = isMobile ? 4 : 2
        // Single layer on mobile saves ~half the path calculations
        const wLayers = isMobile
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

    function triggerConstellation() {
      st.cState    = 'contracting'
      st.cProgress = 0
      const pCanvas = planetCanvasRef.current
      if (!pCanvas) return
      const pc: HTMLCanvasElement = pCanvas

      const frame0 = new Image()
      frame0.crossOrigin = 'anonymous'
      frame0.src = `${BASE}${FRAMES[0]}.png`
      frame0.onload = () => {
        const pCtx = pc.getContext('2d')
        if (!pCtx) return
        const cw = pc.width || window.innerWidth
        const ch = pc.height || window.innerHeight
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

      const contractDur   = 900
      const contractStart = performance.now()

      function contractStep(now: number) {
        st.cProgress          = Math.min((now - contractStart) / contractDur, 1)
        st.constellationAlpha = 1 - st.cProgress

        pc.style.opacity   = (st.cProgress * st.cProgress).toFixed(3)
        pc.style.transform = `scale(${(1.3 - st.cProgress * 0.3).toFixed(3)})`

        if (st.cProgress < 1) {
          requestAnimationFrame(contractStep)
        } else {
          st.constellationAlpha = 0
          st.cState             = 'done'
          pc.style.opacity      = '1'
          pc.style.transform    = 'scale(1)'
        }
      }
      requestAnimationFrame(contractStep)
    }

    function revealHero() {
      st.heroVisible = true

      const subtitle = subtitleRef.current
      if (subtitle) {
        subtitle.style.transition = 'opacity 0.35s ease'
        subtitle.style.opacity    = '0'
      }

      ;[baseCaioRef, baseCadeteRef, ghostCaioRef, ghostCadeteRef].forEach(r => {
        if (r.current) r.current.style.opacity = '0'
      })

      const _introEl    = introRef.current
      const _introInner = introInnerRef.current
      if (!_introEl || !_introInner) return
      const introEl:    HTMLDivElement = _introEl
      const introInner: HTMLDivElement = _introInner

      introInner.style.transformOrigin = '50% 50%'
      const dur   = 900
      const start = performance.now()

      function collapseFrame(now: number) {
        const raw = Math.min((now - start) / dur, 1)
        const t   = easeInOutCubic(raw)

        introInner.style.transform = `scale(${(1 - t).toFixed(4)})`
        introInner.style.opacity   = (1 - t).toFixed(4)

        if (raw < 1) {
          requestAnimationFrame(collapseFrame)
          return
        }

        introEl.style.opacity = '0'

        setTimeout(() => {
          heroRoleRef.current?.classList.add(styles.heroRoleShow)
          heroDividerRef.current?.classList.add(styles.heroDividerShow)
          setTimeout(() => {
            heroBodyRef.current?.classList.add(styles.heroBodyShow)
            setTimeout(revealHeroText, 300)
          }, 150)
        }, 100)
      }
      requestAnimationFrame(collapseFrame)
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
      st.heroVisible          = false
      st.cState               = 'idle'
      st.cProgress            = 0
      st.expandScale          = 0
      st.constellationAlpha   = 1

      setFillProgress(0)

      const introEl  = introRef.current
      const bgEl     = bgCanvasRef.current
      if (!introEl || !bgEl) return

      introEl.style.opacity    = '1'
      introEl.style.transform  = 'none'
      introEl.style.transition = 'none'
      bgEl.style.transition    = 'none'
      if (introInnerRef.current) {
        introInnerRef.current.style.transform       = 'none'
        introInnerRef.current.style.transformOrigin = ''
        introInnerRef.current.style.opacity         = ''
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
        pc.style.opacity   = '0'
        pc.style.transform = 'scale(1.3)'
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
            setTimeout(() => {
              triggerConstellation()
              revealHero()
            }, 400)
          }
        }
        requestAnimationFrame(fillStep)
      }, 2200)
    }

    function onHeroScroll() {
      const wrap = document.getElementById('scroll-wrap')
      if (!wrap) return
      const maxY = wrap.offsetHeight - window.innerHeight
      if (maxY <= 0) return
      const p = Math.min(1, window.scrollY / maxY)
      const heroOpacity = Math.max(0, 1 - p * 5)
      const content = heroContentRef.current
      if (content) content.style.opacity = heroOpacity.toFixed(3)
    }

    resize()
    st.rafId = requestAnimationFrame(drawBgFrame)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onHeroScroll, { passive: true })
    document.fonts.ready.then(() => { if (mounted) run() })

    return () => {
      mounted = false
      cancelAnimationFrame(st.rafId)
      if (st.glitchIv) clearInterval(st.glitchIv)
      st.timers.forEach(clearTimeout)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onHeroScroll)
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
