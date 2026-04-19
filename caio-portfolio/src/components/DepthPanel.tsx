import { useEffect, useRef, useState } from 'react'
import styles from './DepthPanel.module.css'
import Footer from './Footer'

// ── Gallery screens ───────────────────────────────────────────────
// Replace these with the actual Cloudinary image URLs for each screen.
const GALLERY = [
  { num: '01', label: 'Onboarding',                src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { num: '02', label: 'Login & Sign Up',            src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { num: '03', label: 'Homepage — My Global Panel', src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { num: '04', label: 'Plans Store',                src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
]

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

export default function DepthPanel({ open, onClose }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const mouseRef     = useRef({ x: -9999, y: -9999 })
  const rafRef       = useRef(0)
  const aliveRef     = useRef(false)
  const stopRef      = useRef<() => void>(() => {})
  const scrollRef    = useRef<HTMLDivElement>(null)
  const revealObsRef = useRef<IntersectionObserver | null>(null)
  const [activeScreen, setActiveScreen] = useState(0)

  // Reset scroll + gallery on open; lock body scroll
  useEffect(() => {
    if (open) {
      setActiveScreen(0)
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
        scrollRef.current.querySelectorAll(`.${styles.revealed}`)
          .forEach(el => el.classList.remove(styles.revealed))
      }
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Scroll-reveal via IntersectionObserver
  useEffect(() => {
    revealObsRef.current?.disconnect()
    if (!open) return

    const timer = setTimeout(() => {
      const root = scrollRef.current
      if (!root) return

      revealObsRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add(styles.revealed)
            } else {
              entry.target.classList.remove(styles.revealed)
            }
          })
        },
        { root, threshold: 0.1 }
      )

      const revealSelector = [
        styles.reveal, styles.revealTitle, styles.revealStat, styles.revealSubtle,
      ].map(c => `.${c}`).join(', ')
      root.querySelectorAll(revealSelector)
          .forEach(el => revealObsRef.current!.observe(el))
    }, 200)

    return () => {
      clearTimeout(timer)
      revealObsRef.current?.disconnect()
    }
  }, [open])

  useEffect(() => () => stopRef.current(), [])

  // ── Particle canvas (identical to OmniControlPanel) ────────────
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
    let cps: Particle[] = []
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
      const isMobile = W <= 768
      const TOTAL_P  = isMobile ? 60  : 175
      const CON_P    = isMobile ? 0   : 55
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
      cps = particles.filter(p => p.isCon)
    }

    function draw(ts: number) {
      if (!aliveRef.current || !canvas) return
      if (document.hidden) { rafRef.current = requestAnimationFrame(draw); return }
      const isMobile = canvas.width <= 768
      if (isMobile && ts - lastFrame < 33) { rafRef.current = requestAnimationFrame(draw); return }
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

      {/* Close button */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line x1="1" y1="1" x2="17" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="17" y1="1" x2="1" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Scrollable content */}
      <div ref={scrollRef} className={styles.scroll}>
        <div className={`${styles.page} ${open ? styles.pageIn : ''}`}>

          {/* ── 1 · Hero ──────────────────────────────────────────── */}
          <section className={styles.heroSection}>
            <img
              src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png"
              alt="Depth — Global eSIM Platform"
              className={styles.heroImg}
            />
          </section>

          {/* ── 2 · Overview ─────────────────────────────────────── */}
          <section className={styles.overviewSection}>
            <h1 className={styles.projectTitle}>Depth</h1>
            <p className={styles.projectSub}>Global eSIM Platform for Digital Nomads</p>
            <div className={styles.tag}>Mobile UX/UI · 2025 · Concept</div>
            <div className={styles.rule} />
            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ROLE</span>
                <span className={styles.metaValue}>Lead UX/UI Designer</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>PLATFORM</span>
                <span className={styles.metaValue}>iOS · Android</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>TARGET</span>
                <span className={styles.metaValue}>Digital Nomads &amp; Travelers</span>
              </div>
            </div>
          </section>

          {/* ── 3 · Screens (immediately after header, same as OmniControl) ── */}
          <section className={styles.gallerySection}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Screens</h2>
            <div className={`${styles.galleryLayout} ${styles.reveal}`}>
              <div className={styles.galleryMain}>
                <div className={styles.screenFrame}>
                  {open && (
                    <img
                      key={activeScreen}
                      src={GALLERY[activeScreen].src}
                      alt={GALLERY[activeScreen].label}
                      className={styles.screenImg}
                    />
                  )}
                </div>
                <p className={styles.screenCaption}>{GALLERY[activeScreen].label}</p>
              </div>
              <div className={styles.galleryNav}>
                {GALLERY.map((s, i) => (
                  <button
                    key={s.num}
                    className={`${styles.navBtn} ${activeScreen === i ? styles.navBtnActive : ''}`}
                    onMouseEnter={() => setActiveScreen(i)}
                    onClick={() => setActiveScreen(i)}
                    aria-label={s.label}
                  >
                    {s.num}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── 4 · Challenge ────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Challenge</h2>
            <div className={styles.bodyText}>
              <p className={`${styles.reveal} ${styles.revealSubtle}`}>
                Every international traveler knows the anxiety of landing in a new country and scrambling to connect. Existing eSIM solutions are fragmented — multiple apps, confusing activation flows, temporary numbers, zero continuity.
              </p>
              <p className={`${styles.pullQuote} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>
                "Digital nomads needed a persistent global identity: one permanent number that follows them everywhere, paired with instant local data plans activated in seconds."
              </p>
            </div>
            <div className={styles.cardGrid}>
              {[
                { title: 'No Global Identity',   body: 'New temp number per country, breaking continuity with contacts and services.' },
                { title: 'Complex Activation',   body: 'eSIM setup requires technical knowledge — QR codes, carrier settings, APN configurations.' },
                { title: 'Fragmented Plans',      body: 'Users juggle multiple apps per region with no unified data view or cost tracking.' },
                { title: 'Zero Onboarding',       body: 'No guidance for first-time eSIM users. High drop-off before first connection.' },
              ].map((c, i) => (
                <div key={c.title} className={`${styles.card} ${styles.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <h4 className={styles.cardTitle}>{c.title}</h4>
                  <p className={styles.cardBody}>{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5 · Insights ─────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Insights</h2>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`}>
              Interviews and shadowing sessions were conducted with digital nomads across three continents to map the emotional and practical friction in their connectivity routines.
            </p>
            <div className={styles.quoteGrid}>
              {[
                { text: '"I need a number people can reach me on everywhere. I don\'t want to explain every month that I have a new SIM. I want one identity, global data, zero friction."', author: 'Ravena · Digital Nomad & UX Researcher' },
                { text: '"Every trip means a new SIM ordeal. By the time I\'m connected, I\'ve missed calls, lost messages, and wasted the first hour of my day."',                           author: 'Marco · Freelance Product Consultant' },
                { text: '"I travel every three weeks for work. Managing a different carrier app per country is a part-time job. I just need to open one app and be online."',                author: 'Yuna · Remote Software Developer' },
              ].map((q, i) => (
                <div key={q.author} className={`${styles.quoteCard} ${styles.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <span className={styles.quoteIcon}>&ldquo;</span>
                  <p className={styles.quoteText}>{q.text}</p>
                  <span className={styles.quoteAuthor}>— {q.author}</span>
                </div>
              ))}
            </div>
            <div className={styles.insightsBody}>
              <p className={`${styles.reveal} ${styles.revealSubtle}`}>
                <strong>Goals.</strong> Across all participants, the core aspiration was a single, permanent global identity — not merely connectivity. Users wanted a phone number their contacts could rely on regardless of which country they were in, instant eSIM activation the moment they landed without any technical setup, and a single unified view of all their active plans and data usage across regions.
              </p>
              <p className={`${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>
                <strong>Frustrations.</strong> The recurring pain points followed a predictable pattern: hunting for physical SIM cards at airports during an already stressful arrival window, re-explaining a new number to their professional and personal network every trip, and context-switching between multiple disconnected carrier apps with no shared data visibility or cost tracking.
              </p>
            </div>
          </section>

          {/* ── 6 · Solution ─────────────────────────────────────── */}
          <section className={styles.solutionSection}>
            <div className={styles.solutionText}>
              <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Solution</h2>
              <p className={`${styles.reveal} ${styles.revealSubtle}`}>
                Depth provides every traveler with a permanent global number paired with instant regional eSIM plans — all from one app.
              </p>
              <p className={`${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>
                Built around one promise: "Connect anytime, anywhere." Search destination, select plan, pay, activate. Zero technical steps. Every friction point removed from the critical landing window.
              </p>
            </div>
            <div className={`${styles.solutionSteps} ${styles.reveal}`} style={{ transitionDelay: '120ms' }}>
              {[
                { num: '01', title: 'Land & Open',       body: 'App detects location, surfaces relevant plans instantly.' },
                { num: '02', title: 'Select a Plan',     body: 'Europe, Asia, Americas — clear data, duration, price.' },
                { num: '03', title: 'One-tap Checkout',  body: 'Saved payment. Confirm in one tap. eSIM downloads automatically.' },
                { num: '04', title: 'Connected',         body: '"You\'re connected from sky to hell." Zero friction.' },
              ].map(s => (
                <div key={s.num} className={styles.solutionStep}>
                  <span className={styles.stepNum}>{s.num}</span>
                  <div>
                    <p className={styles.stepTitle}>{s.title}</p>
                    <p className={styles.stepBody}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 6 · Impact & Outcomes ────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Impact &amp; Outcomes</h2>
            <div className={styles.statsGrid}>
              {[
                { num: '92%',  label: 'Task Completion',    desc: 'Users activated eSIM successfully on first attempt in usability testing' },
                { num: '3min', label: 'Time to Connect',    desc: 'From app open to live eSIM — down from 25+ minutes with legacy flows' },
                { num: '4.8★', label: 'User Satisfaction',  desc: 'Average rating from prototype sessions with digital nomads worldwide' },
              ].map((s, i) => (
                <div key={s.label} className={`${styles.statCard} ${styles.reveal} ${styles.revealStat}`} style={{ transitionDelay: `${i * 120}ms` }}>
                  <span className={styles.statNum}>{s.num}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                  <p className={styles.statDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 7 · Key Learnings ────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Key Learnings</h2>
            <div className={styles.learningsGrid}>
              {[
                { num: '01', title: 'Solve for the emotional peak',          body: 'The landing anxiety window — first 10 minutes in a new country — is the highest-stakes moment. Designing for that context drove every key UX decision.' },
                { num: '02', title: 'Identity reduces load more than features', body: "Users didn't want more options — they wanted to stop thinking about connectivity. One permanent number was the single most impactful design decision." },
                { num: '03', title: 'Zero-friction needs ruthless scope cuts', body: 'Every extra screen caused measurable drop-off. Cutting from 8 steps to 3 doubled the success rate in prototype testing.' },
              ].map((l, i) => (
                <div key={l.num} className={`${styles.learning} ${styles.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <span className={styles.learningNum}>{l.num}</span>
                  <h4 className={styles.learningTitle}>{l.title}</h4>
                  <p className={styles.learningBody}>{l.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 8 · Beyond the MVP ──────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Beyond the MVP</h2>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`}>
              The MVP successfully addresses the anxiety of landing and connecting, providing a permanent global identity and a seamless eSIM activation process for travelers.
            </p>
            <div className={styles.nextStepsGrid}>
              {[
                { title: 'Integration with Digital Banks',       desc: 'Direct top-ups and financial management for digital nomads.' },
                { title: 'In-Flight and Maritime Connectivity',  desc: 'Expanding the promise to all modes of travel.' },
                { title: 'Community Features',                   desc: 'Real-time local insights and networking for the nomad community.' },
              ].map((ns, i) => (
                <div key={ns.title} className={`${styles.nextStep} ${styles.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <h4 className={styles.nextStepTitle}>{ns.title}</h4>
                  <p className={styles.nextStepDesc}>{ns.desc}</p>
                </div>
              ))}
            </div>
            <p className={`${styles.closingQuote} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '200ms' }}>
              "It's more than just data; it's about freedom and staying connected to what matters, no matter where you are."
            </p>
          </section>

          {/* ── 9 · Next Project ──────────────────────────────────── */}
          <section className={styles.nextSection}>
            <span className={`${styles.nextLabel} ${styles.reveal} ${styles.revealSubtle}`}>Next Project</span>
            <h2 className={`${styles.nextTitle} ${styles.reveal} ${styles.revealStat}`}>OmniControl</h2>
            <p className={`${styles.nextSub} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>BMS UX/UI Platform</p>
            <button className={`${styles.nextBtn} ${styles.reveal}`} style={{ transitionDelay: '160ms' }}>View Case Study →</button>
            <div className={`${styles.dots} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '200ms' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`${styles.dot} ${i === 2 ? styles.dotActive : ''}`} />
              ))}
            </div>
          </section>

        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <Footer />

      </div>
    </div>
  )
}
