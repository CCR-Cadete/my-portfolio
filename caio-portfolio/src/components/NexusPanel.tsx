import { useEffect, useRef, useState } from 'react'
import styles from './NexusPanel.module.css'
import Footer from './Footer'

// ── Gallery screens ───────────────────────────────────────────────
// Export each screen from Figma, upload to Cloudinary, then replace these URLs.
// Figma node references:
//   Dashboard          → 06 — Key Screens / Screen 01
//   Transactions       → 06 — Key Screens / Screen 02
//   Connected Accounts → 06 — Key Screens / Screen 03
//   Access Management  → 06 — Key Screens / Screen 04
const GALLERY = [
  { num: '01', label: 'Dashboard',          src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { num: '02', label: 'Transactions',       src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { num: '03', label: 'Connected Accounts', src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { num: '04', label: 'Access Management',  src: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
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

export default function NexusPanel({ open, onClose }: Props) {
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

  // ── Particle canvas ────────────────────────────────────────────
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
              src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776639222/Nexus_d1wlxq.png"
              alt="Nexus — B2B Financial Dashboard"
              className={styles.heroImg}
            />
          </section>

          {/* ── 2 · Overview ─────────────────────────────────────── */}
          <section className={styles.overviewSection}>
            <h1 className={styles.projectTitle}>Nexus</h1>
            <p className={styles.projectSub}>Intelligent Financial Management for SMBs</p>
            <div className={styles.tag}>Fintech B2B · Open Finance · 2025–2026</div>
            <div className={styles.rule} />
            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ROLE</span>
                <span className={styles.metaValue}>Lead Designer + Vibe Coder</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>SCOPE</span>
                <span className={styles.metaValue}>Research · UX Design · Prototype</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>TARGET</span>
                <span className={styles.metaValue}>Small &amp; Medium Business Owners</span>
              </div>
            </div>
            <p className={`${styles.overviewBody} ${styles.reveal} ${styles.revealSubtle}`}>
              Nexus was built to prove that B2B financial UX does not have to be complex to be powerful. It connects multiple bank accounts through Open Finance and surfaces the insights SMB owners actually need.
            </p>
          </section>

          {/* ── 3 · Key Screens (right after overview) ───────────── */}
          <section className={styles.gallerySection}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Screens</h2>
            <div className={`${styles.galleryLayout} ${styles.reveal}`}>
              <div className={styles.galleryMain}>
                <div className={styles.screenFrame}>
                  {open && (
                    <video
                      key={activeScreen}
                      src={GALLERY[activeScreen].src}
                      className={styles.screenVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="none"
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

          {/* ── 4 · The Problem ──────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>The Problem</h2>
            <h3 className={`${styles.problemHeadline} ${styles.reveal} ${styles.revealSubtle}`}>SMBs are flying blind</h3>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '60ms' }}>
              Small business owners juggle multiple bank accounts, spreadsheets and manual reconciliation with no unified view of their own finances.
            </p>
            <div className={styles.statsGrid}>
              {[
                { num: '86%',  label: 'No Unified View',       desc: 'of SMBs have no consolidated view of their financial data across banks' },
                { num: '25h',  label: 'Lost Every Month',      desc: 'wasted per month on manual reconciliation across accounts and spreadsheets' },
                { num: '143%', label: 'Higher Risk',           desc: 'more likely to face cash flow crises without real-time financial visibility' },
              ].map((s, i) => (
                <div key={s.label} className={`${styles.statCard} ${styles.reveal} ${styles.revealStat}`} style={{ transitionDelay: `${i * 120}ms` }}>
                  <span className={styles.statNum}>{s.num}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                  <p className={styles.statDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
            <p className={`${styles.pullQuote} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>
              "Core challenge: help owners understand their cash position in real time, without requiring them to be finance experts."
            </p>
          </section>

          {/* ── 5 · User Insights ────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>User Insights</h2>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`}>
              In-depth interviews with small business owners revealed a consistent pattern: financial anxiety driven by fragmentation, not by lack of data.
            </p>
            <div className={styles.insightGrid}>
              {[
                {
                  name: 'Renata Silva',
                  role: '38 · Aesthetics clinic owner · São Paulo',
                  quote: '"I have 4 accounts at different banks and have no idea how much money I have available in total. Every Monday is a shock."',
                  pains: ['No consolidated balance view', 'Manual spreadsheet reconciliation every week', 'Afraid to give accountant full bank access'],
                },
                {
                  name: 'Rafael Mendes',
                  role: '45 · Construction company owner · Curitiba',
                  quote: '"Before I commit to a new project I need to know if I have cash to cover payroll. Right now I just guess — and sometimes I get it wrong."',
                  pains: ['Cash flow blind spots across 3 bank accounts', 'No forward visibility on 30/60-day position', 'Wasted 25h/month on manual reconciliation'],
                },
              ].map((p, i) => (
                <div className={`${styles.insightCard} ${styles.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className={styles.insightCardHeader}>
                    <div>
                      <p className={styles.personaName}>{p.name}</p>
                      <p className={styles.personaRole}>{p.role}</p>
                    </div>
                  </div>
                  <p className={styles.personaQuote}>{p.quote}</p>
                  <ul className={styles.insightPains}>
                    {p.pains.map(pain => (
                      <li key={pain} className={styles.insightPainItem}>{pain}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5 · Solution ─────────────────────────────────────── */}
          <section className={styles.solutionSection}>
            <div className={styles.solutionText}>
              <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>The Solution</h2>
              <h3 className={`${styles.problemHeadline} ${styles.reveal} ${styles.revealSubtle}`}>One platform. Total clarity.</h3>
              <p className={`${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '60ms' }}>
                Nexus connects all bank accounts via Open Finance and delivers the insights SMB owners need in a clean, role-aware interface.
              </p>
            </div>
            <div className={`${styles.solutionItems} ${styles.reveal}`} style={{ transitionDelay: '120ms' }}>
              {[
                { num: '[1]', title: 'Unified Dashboard',      body: 'Consolidated balance across all connected accounts with real-time sync via Open Finance API' },
                { num: '[2]', title: 'Cash Flow Projection',   body: '30/60/90-day forecast based on historical patterns and scheduled receivables' },
                { num: '[3]', title: 'Role-Based Access',      body: 'Owner, Accountant and Viewer roles — each sees only what they need to see' },
                { num: '[4]', title: 'Smart Alerts',           body: 'Proactive notifications for low balance, unusual transactions and projection shortfalls' },
              ].map(item => (
                <div key={item.num} className={styles.solutionItem}>
                  <span className={styles.solutionNum}>{item.num}</span>
                  <div>
                    <p className={styles.solutionItemTitle}>{item.title}</p>
                    <p className={styles.solutionItemBody}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 7 · Vibe Coding ──────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Vibe Coding</h2>
            <h3 className={`${styles.problemHeadline} ${styles.reveal} ${styles.revealSubtle}`}>From prompt to prototype in under 5 minutes</h3>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '60ms' }}>
              Nexus was prototyped using v0 by Vercel — an AI-powered UI generation tool. Instead of building components from scratch, natural language prompts generated React + Tailwind screens that were then refined in Figma. This compressed a 2-week build into 3 days, letting me focus on UX decisions rather than implementation details.
            </p>
            <div className={`${styles.processSteps} ${styles.reveal}`} style={{ transitionDelay: '100ms' }}>
              {([
                { num: '01', title: 'Describe the screen',   body: 'Plain language prompt to v0' },
                { num: '02', title: 'Generate and review',   body: 'AI produces React + Tailwind' },
                { num: '03', title: 'Refine in Figma',       body: 'Polish layout, spacing, tokens' },
                { num: '04', title: 'Validate with users',   body: 'Test flows, gather feedback' },
              ]).flatMap((step, i, arr) => {
                const stepEl = (
                  <div key={step.num} className={styles.processStep}>
                    <span className={styles.processNum}>{step.num}</span>
                    <p className={styles.processTitle}>{step.title}</p>
                    <p className={styles.processBody}>{step.body}</p>
                  </div>
                )
                return i < arr.length - 1
                  ? [stepEl, <span key={`arrow-${i}`} className={styles.processArrow}>→</span>]
                  : [stepEl]
              })}
            </div>
          </section>

          {/* ── 8 · Learnings ────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Learnings</h2>
            <h3 className={`${styles.problemHeadline} ${styles.reveal} ${styles.revealSubtle}`}>What I learned building Nexus</h3>
            <div className={`${styles.learnings3} ${styles.reveal}`} style={{ transitionDelay: '80ms' }}>
              <div className={styles.learningBlock}>
                <div className={`${styles.learningAccent} ${styles.learningAccentGreen}`} />
                <h4 className={styles.learningBlockTitle}>What Worked</h4>
                <ul className={styles.learningList}>
                  {[
                    'Open Finance as a UX constraint',
                    'Role-based views reduced cognitive load',
                    'v0 prototyping proved the concept fast',
                    'Cash flow projection as key differentiator',
                  ].map(item => (
                    <li key={item} className={styles.learningListItem}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.learningBlock}>
                <div className={`${styles.learningAccent} ${styles.learningAccentAmber}`} />
                <h4 className={styles.learningBlockTitle}>What I Would Change</h4>
                <ul className={styles.learningList}>
                  {[
                    'Start with even fewer features, true MVP',
                    'Test with real accountants earlier',
                    'Invest more in the onboarding flow',
                    'Add empty states from day one',
                  ].map(item => (
                    <li key={item} className={styles.learningListItem}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.learningBlock}>
                <div className={`${styles.learningAccent} ${styles.learningAccentBlue}`} />
                <h4 className={styles.learningBlockTitle}>What Is Next</h4>
                <ul className={styles.learningList}>
                  {[
                    'Mobile-first version for on-the-go access',
                    'AI-powered financial insights and alerts',
                    'WhatsApp integration for daily cash digest',
                    'Multi-entity support for multiple companies',
                  ].map(item => (
                    <li key={item} className={styles.learningListItem}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── 9 · Closing CTA ──────────────────────────────────── */}
          <section className={`${styles.closingSection} ${styles.reveal} ${styles.revealSubtle}`}>
            <p className={styles.closingTitle}>
              Nexus was designed to prove that B2B financial UX does not have to be complex to be powerful.
            </p>
            <div className={styles.closingRule} />
            <p className={styles.closingByline}>Designed by Caio Cadete · 2026</p>
          </section>

          {/* ── 10 · Next Project ────────────────────────────────── */}
          <section className={styles.nextSection}>
            <span className={`${styles.nextLabel} ${styles.reveal} ${styles.revealSubtle}`}>Next Project</span>
            <h2 className={`${styles.nextTitle} ${styles.reveal} ${styles.revealStat}`}>depth</h2>
            <p className={`${styles.nextSub} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>eSIM UX/UI Platform</p>
            <button className={`${styles.nextBtn} ${styles.reveal}`} style={{ transitionDelay: '160ms' }}>View Case Study →</button>
            <div className={`${styles.dots} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '200ms' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`${styles.dot} ${i === 1 ? styles.dotActive : ''}`} />
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
