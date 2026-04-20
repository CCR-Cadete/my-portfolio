import { useEffect, useRef, useState } from 'react'
import styles from './OmniControlPanel.module.css'
import Footer from './Footer'

// ── Gallery screens ───────────────────────────────────────────────
// Export each screen from Figma, upload to Cloudinary, then replace these URLs.
// Figma node IDs for reference:
//   Dashboard Overview    → 7:4953
//   AccessControl Overview → 7:5716
//   GlobalAlarms Overview  → 7:6383
//   HVAC Command           → 7:7055
const GALLERY = [
  { num: '01', label: 'HVAC',     src: 'https://res.cloudinary.com/dfiyxjf5t/video/upload/v1776560570/01_-_HVAC_ups55o.mp4' },
  { num: '02', label: 'Lighting', src: 'https://res.cloudinary.com/dfiyxjf5t/video/upload/v1776560576/02_-_Lighting_bkrvlt.mp4' },
  { num: '03', label: 'Systems',  src: 'https://res.cloudinary.com/dfiyxjf5t/video/upload/v1776560584/03_-_Systems_naqtgo.mp4' },
  { num: '04', label: 'Schedule', src: 'https://res.cloudinary.com/dfiyxjf5t/video/upload/v1776560577/04_-_Schedule_efmg28.mp4' },
]

const ALL_PROJECTS = [
  { id: 'omnicontrol', name: 'OmniControl', desc: 'Building Management System · UX/UI', cover: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776539067/CoverProject_otzeww.png' },
  { id: 'nexus',       name: 'Nexus',       desc: 'B2B Financial Dashboard · UX/UI',    cover: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776639222/Nexus_d1wlxq.png' },
  { id: 'depth',       name: 'Depth',       desc: 'Global eSIM Platform · UX/UI',       cover: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776628235/depth_threx4.png' },
  { id: 'kinesis',     name: 'Kinesis',     desc: 'Drone Brand Website · UI Design',    cover: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776639222/Kinesis_xkz44c.png' },
]

interface Props {
  open: boolean
  onClose: () => void
  onProjectClick: (id: string) => void
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

export default function OmniControlPanel({ open, onClose, onProjectClick }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const mouseRef     = useRef({ x: -9999, y: -9999 })
  const rafRef       = useRef(0)
  const aliveRef     = useRef(false)
  const stopRef      = useRef<() => void>(() => {})
  const scrollRef    = useRef<HTMLDivElement>(null)
  const revealObsRef = useRef<IntersectionObserver | null>(null)
  const [activeScreen, setActiveScreen] = useState(0)

  // Reset scroll + gallery on open; lock body scroll to prevent double scrollbar
  useEffect(() => {
    if (open) {
      setActiveScreen(0)
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
        // Reset any previously revealed sections so re-open starts fresh
        scrollRef.current.querySelectorAll(`.${styles.revealed}`)
          .forEach(el => el.classList.remove(styles.revealed))
      }
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [open])

  // Scroll-reveal: watch sections below the fold via IntersectionObserver
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

  // On unmount: stop canvas immediately
  useEffect(() => () => stopRef.current(), [])

  // ── Particle canvas (mirrors AboutPanel) ───────────────────────
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
              src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776539067/CoverProject_otzeww.png"
              alt="OmniControl — Building Management System"
              className={styles.heroImg}
            />
          </section>

          {/* ── 2 · Overview ─────────────────────────────────────── */}
          <section className={styles.overviewSection}>
            <h1 className={styles.projectTitle}>OmniControl</h1>
            <p className={styles.projectSub}>Building Management System · UX/UI</p>
            <div className={styles.tag}>BMS UX/UI · 2024 · 2 months</div>
            <div className={styles.rule} />
            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ROLE</span>
                <span className={styles.metaValue}>Lead UX/UI Designer</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>TEAM</span>
                <span className={styles.metaValue}>3 Designers · 2 Engineers</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>TARGET</span>
                <span className={styles.metaValue}>Facility Managers &amp; Operators</span>
              </div>
            </div>
          </section>

          {/* ── 3 · Gallery ──────────────────────────────────────── */}
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

          {/* ── 4 · Challenge ────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Challenge</h2>
            <div className={styles.bodyText}>
              <p className={`${styles.reveal} ${styles.revealSubtle}`}>Based on years of field observations and informal interviews with facility managers and system operators, I mapped the critical friction points in existing Building Management Systems (BMS).</p>
              <p className={`${styles.pullQuote} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>"80% of critical errors occur due to information overload and lack of visual hierarchy in legacy BMS interfaces."</p>
            </div>
            <div className={styles.cardGrid}>
              {[
                { title: 'Cognitive Overload',  body: 'Excessive raw data without visual hierarchy, making it difficult to distinguish between noise and critical information.' },
                { title: 'Delayed Response',    body: 'Critical alarms buried under multiple layers of navigation, increasing response time to emergency incidents.' },
                { title: 'Lack of Context',     body: "Metrics shown in isolation, preventing a holistic view of the building\u2019s health and making root-cause diagnosis impossible." },
                { title: 'Inconsistent UI',     body: 'Different modules (HVAC, Energy, Access) feeling like separate software, breaking the user\'s mental model.' },
              ].map((c, i) => (
                <div key={c.title} className={`${styles.card} ${styles.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <h4 className={styles.cardTitle}>{c.title}</h4>
                  <p className={styles.cardBody}>{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5 · User Insights ────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Insights</h2>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`}>
              Individual interviews were conducted with five facility managers, and several hours of operations were observed in the control room to identify points of cognitive friction.
            </p>
            <div className={styles.quoteGrid}>
              {[
                { text: '"I have over 200 sensors to monitor. When an alarm goes off, I spend 5 minutes just trying to find which floor it\'s on."', author: 'Operator' },
                { text: '"The current system looks like Windows 95. It\'s hard to train new staff because nothing is intuitive."',                  author: 'Facility Manager' },
                { text: '"I need to see energy consumption and HVAC status at the same time, but I have to keep switching tabs."',                 author: 'Maintenance Tech' },
              ].map((q, i) => (
                <div key={q.author} className={`${styles.quoteCard} ${styles.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <span className={styles.quoteIcon}>&ldquo;</span>
                  <p className={styles.quoteText}>{q.text}</p>
                  <span className={styles.quoteAuthor}>— {q.author}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── 6 · Solution ─────────────────────────────────────── */}
          <section className={styles.solutionSection}>
            <div className={styles.solutionText}>
              <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Solution</h2>
              <p className={`${styles.reveal} ${styles.revealSubtle}`}>OmniControl delivers a unified command interface that consolidates HVAC, energy, hydraulics, lighting, alarms, and access control into a single intelligent platform.</p>
              <p className={`${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '80ms' }}>The design system prioritises information hierarchy, critical alerts surface instantly while routine data stays accessible without noise. A dark-first UI reduces eye strain during long monitoring sessions, and progressive disclosure guides new users without limiting expert workflows.</p>
            </div>
            <div className={`${styles.solutionVisual} ${styles.reveal}`} style={{ transitionDelay: '120ms' }}>
              <img
                src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776723110/OmniControl_Mockup_caitsq.png"
                alt="OmniControl solution mockup"
                className={styles.solutionFrame}
              />
            </div>
          </section>

          {/* ── 7 · Impact & Outcomes ────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Impact &amp; Outcomes</h2>
            <div className={styles.statsGrid}>
              {[
                { num: '89%',  label: 'User Satisfaction', desc: 'Post-launch NPS surveys across all facility manager segments' },
                { num: '40%',  label: 'Faster Decisions',  desc: 'Reduction in average incident response time versus the legacy system' },
                { num: '150+', label: 'Active Users',      desc: 'Facility managers onboarded within the first 60 days post-launch' },
              ].map((s, i) => (
                <div key={s.label} className={`${styles.statCard} ${styles.reveal} ${styles.revealStat}`} style={{ transitionDelay: `${i * 120}ms` }}>
                  <span className={styles.statNum}>{s.num}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                  <p className={styles.statDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 8 · Key Learnings ────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Key Learnings</h2>
            <div className={styles.learningsGrid}>
              {[
                { num: '01', title: 'Align before you design',              body: 'Based on years of field observations, stakeholder alignment before wireframing saved three weeks of rework. The discovery phase revealed misaligned expectations between IT and facilities teams.' },
                { num: '02', title: 'Dark mode is an ergonomic requirement', body: 'Continuous monitoring environments demand low-luminance UIs. The dark-first design reduced visual fatigue, validated by a 94% preference score in controlled user testing sessions.' },
                { num: '03', title: 'Progressive disclosure over simplification', body: 'Rather than hiding complexity, we layered it. Novices get guided flows with contextual tooltips; experts get direct access and keyboard shortcuts, resolving onboarding vs. power-user tension.' },
              ].map((l, i) => (
                <div key={l.num} className={`${styles.learning} ${styles.reveal}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <span className={styles.learningNum}>{l.num}</span>
                  <h4 className={styles.learningTitle}>{l.title}</h4>
                  <p className={styles.learningBody}>{l.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 9 · Outcomes ─────────────────────────────────────── */}
          <section className={`${styles.closingSection} ${styles.reveal} ${styles.revealSubtle}`}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Outcomes</h2>
            <p className={styles.closingTitle}>
              A legacy of fragmented screens replaced by a single source of truth — and the numbers reflect it.
            </p>
            <div className={styles.closingRule} />
            <div className={styles.nextStepsGrid} style={{ marginTop: '32px' }}>
              {[
                {
                  title: 'Delivered and validated',
                  desc: '89% satisfaction score confirms the unified interface premise. Incident response time dropped 40% across HVAC, alarms, and access control. 150+ facility managers onboarded in 60 days without guided training — a direct result of progressive disclosure reducing initial cognitive load.',
                },
                {
                  title: 'Currently refining',
                  desc: 'A mobile companion app for on-site technicians is in active development, extending the platform to the field. Onboarding flows are being optimised using first-month usage telemetry, and the energy analytics module is expanding to include predictive cost forecasting.',
                },
                {
                  title: 'On the roadmap',
                  desc: 'AI-driven anomaly detection to pre-empt system failures before alarms trigger. Multi-building management from a single dashboard instance. A third-party integration layer targeting BACnet, Modbus, and KNX — covering the majority of legacy building infrastructure in commercial real estate.',
                },
              ].map((ns, i) => (
                <div key={ns.title} className={`${styles.nextStep} ${styles.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <h4 className={styles.nextStepTitle}>{ns.title}</h4>
                  <p className={styles.nextStepDesc}>{ns.desc}</p>
                </div>
              ))}
            </div>
            <p className={styles.closingByline}>Design By Caio Cadete · 2024–2025</p>
          </section>

          {/* ── 10 · Other Projects ──────────────────────────────── */}
          <section className={styles.otherSection}>
            <h2 className={`${styles.otherTitle} ${styles.reveal} ${styles.revealTitle}`}>Other Projects</h2>
            <div className={styles.otherList}>
              {ALL_PROJECTS.filter(p => p.id !== 'omnicontrol').map((p, i) => (
                <button
                  key={p.id}
                  className={`${styles.otherCard} ${styles.reveal}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                  onClick={() => onProjectClick(p.id)}
                >
                  <div className={styles.otherCover}>
                    <img src={p.cover} alt={p.name} className={styles.otherCoverImg} />
                  </div>
                  <div className={styles.otherInfo}>
                    <p className={styles.otherName}>{p.name}</p>
                    <p className={styles.otherDesc}>{p.desc}</p>
                  </div>
                </button>
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
