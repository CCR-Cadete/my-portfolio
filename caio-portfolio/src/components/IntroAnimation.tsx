import { useEffect, useRef } from 'react'
import type React from 'react'
import FRAMES_JSON from '../frames.json'
import styles from './IntroAnimation.module.css'

const FRAMES = (FRAMES_JSON as string[]).slice(0, 450)
const BASE   = 'https://ik.imagekit.io/n2zwd2oc9/tr:q-60,w-1920/Scroll/'

interface Props {
  planetCanvasRef: React.RefObject<HTMLCanvasElement | null>
  onScrollReady: () => void
  skip?: boolean
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

interface ShootingStar {
  x: number; y: number
  vx: number; vy: number
  tailLen: number
  active: boolean
  spawnAt: number   // performance.now() timestamp when this slot may next fire
}

interface Asteroid {
  x: number; y: number
  vx: number; vy: number
  size: number
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
}

export default function IntroAnimation({ planetCanvasRef, onScrollReady, skip }: Props) {
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
    stars:              [] as ShootingStar[],
    asteroids:          [] as Asteroid[],
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

    // ── Desktop hero effects: shooting stars + asteroids ──
    // Closure variable so drawBgFrame (below) can read it without an extra event param.
    let mouseInPage = true
    function onMouseLeave() { mouseInPage = false }
    function onMouseEnter() { mouseInPage = true  }

    function initEffects(W: number, H: number) {
      const now = performance.now()
      // Two independent shooting-star slots with staggered initial delays
      st.stars = [
        { x:0, y:0, vx:0, vy:0, tailLen:0, active:false, spawnAt: now + 1500 + Math.random() * 3500 },
        { x:0, y:0, vx:0, vy:0, tailLen:0, active:false, spawnAt: now + 4500 + Math.random() * 5000 },
      ]
      // Three slow-drifting asteroids spread across the hero
      st.asteroids = Array.from({ length: 3 }, () => ({
        x:    Math.random() * W,
        y:    H * (0.12 + Math.random() * 0.58),
        vx:   (Math.random() < 0.5 ? 1 : -1) * (0.18 + Math.random() * 0.28),
        vy:   (Math.random() - 0.5) * 0.10,
        size: 0.9 + Math.random() * 1.1,
      }))
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

      // ── Shooting stars + Asteroids (desktop, hero zone only) ──
      if (st.heroVisible && W > 768 && st.stars.length) {
        const wrap  = document.getElementById('scroll-wrap')
        const mxY   = wrap ? wrap.offsetHeight - window.innerHeight : Infinity
        const inHero = mxY > 0 && window.scrollY <= mxY

        if (inHero) {
          const now = performance.now()

          // ── Shooting stars (require cursor on page) ──
          if (mouseInPage) {
            for (const star of st.stars) {
              if (!star.active) {
                if (now >= star.spawnAt) {
                  const goRight = Math.random() < 0.5
                  const spd     = 9 + Math.random() * 7
                  star.vx      = goRight ? spd : -spd
                  star.vy      = (Math.random() - 0.5) * 2.5
                  star.x       = goRight ? -130 : W + 130
                  star.y       = H * (0.07 + Math.random() * 0.62)
                  star.tailLen = 80 + Math.random() * 90
                  star.active  = true
                }
                continue
              }
              star.x += star.vx
              star.y += star.vy
              if (star.x < -240 || star.x > W + 240) {
                star.active  = false
                star.spawnAt = now + 2500 + Math.random() * 7000
                continue
              }
              const spd = Math.sqrt(star.vx * star.vx + star.vy * star.vy)
              const nx  = star.vx / spd, ny = star.vy / spd
              const tx  = star.x - nx * star.tailLen
              const ty  = star.y - ny * star.tailLen
              const grad = ctx.createLinearGradient(tx, ty, star.x, star.y)
              grad.addColorStop(0,   'rgba(255,255,255,0)')
              grad.addColorStop(0.5, 'rgba(210,225,255,0.10)')
              grad.addColorStop(1,   'rgba(255,255,255,0.85)')
              ctx.save()
              ctx.beginPath()
              ctx.moveTo(tx, ty)
              ctx.lineTo(star.x, star.y)
              ctx.strokeStyle = grad
              ctx.lineWidth   = 1.5
              ctx.stroke()
              ctx.beginPath()
              ctx.arc(star.x, star.y, 1.8, 0, Math.PI * 2)
              ctx.fillStyle = 'rgba(255,255,255,0.95)'
              ctx.fill()
              ctx.restore()
            }
          }

          // ── Asteroids / meteors (always drift when in hero zone) ──
          for (const ast of st.asteroids) {
            ast.x += ast.vx
            ast.y += ast.vy
            // Soft vertical bounce
            if (ast.y < H * 0.05) ast.vy =  Math.abs(ast.vy)
            if (ast.y > H * 0.80) ast.vy = -Math.abs(ast.vy)
            // Horizontal wrap with new random y
            if (ast.x < -35) { ast.x = W + 35; ast.y = H * (0.12 + Math.random() * 0.58) }
            if (ast.x > W + 35) { ast.x = -35; ast.y = H * (0.12 + Math.random() * 0.58) }

            // Soft glow halo
            const glow = ctx.createRadialGradient(ast.x, ast.y, 0, ast.x, ast.y, ast.size * 6)
            glow.addColorStop(0,   'rgba(160,190,255,0.38)')
            glow.addColorStop(0.5, 'rgba(160,190,255,0.07)')
            glow.addColorStop(1,   'rgba(160,190,255,0)')
            ctx.beginPath()
            ctx.arc(ast.x, ast.y, ast.size * 6, 0, Math.PI * 2)
            ctx.fillStyle = glow
            ctx.fill()

            // Core dot
            ctx.beginPath()
            ctx.arc(ast.x, ast.y, ast.size, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(215,230,255,0.88)'
            ctx.fill()

            // Faint drift trail
            const tLen = ast.size * 14
            const aspd = Math.sqrt(ast.vx * ast.vx + ast.vy * ast.vy)
            if (aspd > 0.05) {
              const anx = ast.vx / aspd, any = ast.vy / aspd
              const tg  = ctx.createLinearGradient(
                ast.x - anx * tLen, ast.y - any * tLen, ast.x, ast.y,
              )
              tg.addColorStop(0, 'rgba(160,190,255,0)')
              tg.addColorStop(1, 'rgba(160,190,255,0.20)')
              ctx.beginPath()
              ctx.moveTo(ast.x - anx * tLen, ast.y - any * tLen)
              ctx.lineTo(ast.x, ast.y)
              ctx.strokeStyle = tg
              ctx.lineWidth   = ast.size * 0.7
              ctx.stroke()
            }
          }

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
        frame0.src = `${BASE}${FRAMES[0]}.webp`
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
      initEffects(bgCanvas.width, bgCanvas.height)

      heroRoleRef.current?.classList.add(styles.heroRoleShow)
      heroDividerRef.current?.classList.add(styles.heroDividerShow)

      setTimeout(() => {
        heroBodyRef.current?.classList.add(styles.heroBodyShow)
        setTimeout(revealHeroText, 300)
      }, 220)
    }

    function revealHeroText() {
      const sentence = "I design interfaces for complex B2B and SaaS products, combining 8 years of experience with technical users and stakeholders with an active use of AI in my process. I use vibe coding to build and validate MVPs faster, and my knowledge in HTML and CSS keeps me close to engineering. Good design, for me, starts way before the first screen."
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

    // ── Skip path: returning from a project page — no intro, go straight to scroll ──
    if (skip) {
      const pc = planetCanvasRef.current
      if (pc) {
        pc.style.transition = 'none'
        pc.style.opacity    = '1'
        pc.style.transform  = 'scale(1)'
      }

      // Use inline styles directly — bypasses CSS transition delays and class-name
      // resolution issues. heroContent must be opacity:1 before the first scroll event
      // fires, otherwise there is a flash of invisible content when the user scrolls back.
      st.heroVisible = true
      st.cState      = 'done'

      if (heroContentRef.current)  heroContentRef.current.style.opacity  = '1'
      if (heroRoleRef.current)     heroRoleRef.current.style.opacity      = '1'
      if (heroDividerRef.current)  heroDividerRef.current.style.opacity   = '1'
      if (heroBodyRef.current) {
        heroBodyRef.current.style.opacity = '1'
        // Build word spans identical to revealHeroText so existing CSS applies cleanly
        const sentence = "I design interfaces for complex B2B and SaaS products, combining 8 years of experience with technical users and stakeholders with an active use of AI in my process. I use vibe coding to build and validate MVPs faster, and my knowledge in HTML and CSS keeps me close to engineering. Good design, for me, starts way before the first screen."
        heroBodyRef.current.innerHTML = ''
        sentence.split(' ').forEach((w, i, arr) => {
          const sp = document.createElement('span')
          sp.className   = `${styles.W} ${styles.Wshow}`
          sp.textContent = w + (i < arr.length - 1 ? ' ' : '')
          heroBodyRef.current!.appendChild(sp)
        })
      }

      nameCornerRef.current?.classList.add(styles.nameCornerShow)

      // Start bg canvas (waveform only — stars already dispersed)
      const bgEl = bgCanvasRef.current
      if (bgEl) {
        bgEl.style.transition = 'none'
        bgEl.classList.add(styles.bgVisible)
      }
      resize()
      initEffects(bgCanvas.width, bgCanvas.height)
      st.rafId = requestAnimationFrame(drawBgFrame)
      window.addEventListener('resize', resize)
      window.addEventListener('scroll', onHeroScroll, { passive: true })
      document.addEventListener('visibilitychange', onVisibilityChange)
      document.addEventListener('mouseleave', onMouseLeave)
      document.addEventListener('mouseenter', onMouseEnter)
      onScrollReady()
      return () => {
        mounted = false
        cancelAnimationFrame(st.rafId)
        window.removeEventListener('resize', resize)
        window.removeEventListener('scroll', onHeroScroll)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        document.removeEventListener('mouseleave', onMouseLeave)
        document.removeEventListener('mouseenter', onMouseEnter)
      }
    }

    resize()
    st.rafId = requestAnimationFrame(drawBgFrame)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onHeroScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)
    document.fonts.ready.then(() => { if (mounted) run() })

    return () => {
      mounted = false
      cancelAnimationFrame(st.rafId)
      if (st.glitchIv) clearInterval(st.glitchIv)
      st.timers.forEach(clearTimeout)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onHeroScroll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
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
