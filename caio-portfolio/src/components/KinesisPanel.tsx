import { useEffect, useRef, useState } from 'react'
import styles from './KinesisPanel.module.css'
import Footer from './Footer'

// ── Gallery screens ───────────────────────────────────────────────
// Export each screen from Figma, upload to Cloudinary, then replace these URLs.
// Screen references (Figma section 05 — Key Screens):
//   Homepage Hero        → product render, spec chips, dual CTA
//   Product Detail Page  → spec table, module cards, buy block
//   Features Deep-Dive   → 6-stat horizontal feature grid
//   Footer               → 4-column typographic grid
const GALLERY = [
  { num: '01', label: 'Homepage',   src: 'https://res.cloudinary.com/dfiyxjf5t/video/upload/v1776719450/Homepage_hcrulu.mp4' },
  { num: '02', label: 'Products',  src: 'https://res.cloudinary.com/dfiyxjf5t/video/upload/v1776719460/Product_List_jzufpw.mp4' },
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

export default function KinesisPanel({ open, onClose, onProjectClick }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const mouseRef     = useRef({ x: -9999, y: -9999 })
  const rafRef       = useRef(0)
  const aliveRef     = useRef(false)
  const stopRef      = useRef<() => void>(() => {})
  const scrollRef    = useRef<HTMLDivElement>(null)
  const revealObsRef = useRef<IntersectionObserver | null>(null)
  const [activeScreen, setActiveScreen] = useState(0)

  useEffect(() => {
    if (open) {
      setActiveScreen(0)
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
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

  useEffect(() => {
    revealObsRef.current?.disconnect()
    if (!open) return
    const timer = setTimeout(() => {
      const root = scrollRef.current
      if (!root) return
      revealObsRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add(styles.revealed)
            else entry.target.classList.remove(styles.revealed)
          })
        },
        { root, threshold: 0.1 }
      )
      const sel = [styles.reveal, styles.revealTitle, styles.revealStat, styles.revealSubtle]
        .map(c => `.${c}`).join(', ')
      root.querySelectorAll(sel).forEach(el => revealObsRef.current!.observe(el))
    }, 200)
    return () => { clearTimeout(timer); revealObsRef.current?.disconnect() }
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
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      if (!canvas) return
      const W = canvas.width, H = canvas.height
      const isMobile = W <= 768
      const TOTAL_P = isMobile ? 60 : 175
      const CON_P   = isMobile ? 0  : 55
      particles = Array.from({ length: TOTAL_P }, (_, i) => {
        const isCon = i < CON_P
        const ox = Math.random(), oy = Math.random()
        return {
          ox, oy, x: ox * W, y: oy * H,
          dx: (Math.random() - 0.5) * 0.00018,
          dy: (Math.random() - 0.5) * 0.00018,
          vx: 0, vy: 0,
          r: isCon ? 0.8 + Math.random() * 1.8 : 0.3 + Math.random() * 1.1,
          a: isCon ? 0.3  + Math.random() * 0.55 : 0.15 + Math.random() * 0.5,
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
      const mx = mouseRef.current.x, my = mouseRef.current.y
      ctx.fillStyle = '#05070F'
      ctx.fillRect(0, 0, W, H)
      const ATTRACT_R = 200, ATTRACT_F = 0.012, DAMPING = 0.88
      particles.forEach(p => {
        p.ox = Math.max(0.005, Math.min(0.995, p.ox + p.dx))
        p.oy = Math.max(0.005, Math.min(0.995, p.oy + p.dy))
        if (mx > -100) {
          const tdx = mx - p.x, tdy = my - p.y
          const dist = Math.sqrt(tdx * tdx + tdy * tdy)
          if (dist < ATTRACT_R) {
            const f = (1 - dist / ATTRACT_R) * ATTRACT_F * (p.isCon ? 1.4 : 0.7)
            p.vx += tdx * f; p.vy += tdy * f
          }
        }
        p.vx *= DAMPING; p.vy *= DAMPING
        p.x = p.ox * W + p.vx; p.y = p.oy * H + p.vy
        const twinkle = 0.4 + 0.6 * Math.sin(t * p.sp + p.ph)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${(p.a * twinkle).toFixed(3)})`
        ctx.fill()
      })
      if (cps.length > 0) {
        const maxDist = W * 0.16, maxDist2 = maxDist * maxDist
        for (let i = 0; i < cps.length; i++) {
          for (let j = i + 1; j < cps.length; j++) {
            const dx = cps[i].x - cps[j].x, dy = cps[i].y - cps[j].y
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

    function onMouseMove(e: MouseEvent) { mouseRef.current = { x: e.clientX, y: e.clientY } }

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

      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line x1="1" y1="1" x2="17" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="17" y1="1" x2="1" y2="17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      <div ref={scrollRef} className={styles.scroll}>
        <div className={`${styles.page} ${open ? styles.pageIn : ''}`}>

          {/* ── 1 · Hero ──────────────────────────────────────────── */}
          <section className={styles.heroSection}>
            <img
              src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776639222/Kinesis_xkz44c.png"
              alt="Kinesis — Drone Brand Website"
              className={styles.heroImg}
            />
          </section>

          {/* ── 2 · Overview ─────────────────────────────────────── */}
          <section className={styles.overviewSection}>
            <h1 className={styles.projectTitle}>Kinesis</h1>
            <p className={styles.projectSub}>Drone Brand Website · UI Design</p>
            <div className={styles.tag}>UI Design · Branding · 2026</div>
            <div className={styles.rule} />
            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ROLE</span>
                <span className={styles.metaValue}>UI Designer</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>SCOPE</span>
                <span className={styles.metaValue}>Visual Identity · Web UI</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>PRODUCT LINE</span>
                <span className={styles.metaValue}>Mavic X1 · Orbix V1 · Nexar N1 · Gravon G2 · Aeron Guard</span>
              </div>
            </div>
            <p className={`${styles.overviewBody} ${styles.reveal} ${styles.revealSubtle}`}>
              Kinesis is a high-end drone brand concept built around a single design goal: make premium tech feel premium visually. The project covers the full design system, from typography and color tokens to screen-level UI for a product-focused website.
            </p>
          </section>

          {/* ── 3 · Screens ──────────────────────────────────────── */}
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

          {/* ── 4 · Typography ───────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Design System</h2>
            <h3 className={`${styles.dsHeadline} ${styles.reveal} ${styles.revealSubtle}`}>Typography</h3>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '40ms' }}>
              Satoshi, chosen for its technical precision and editorial warmth.
            </p>
            <div className={`${styles.typeSampleBlock} ${styles.reveal}`} style={{ transitionDelay: '80ms' }}>
              <span className={styles.typeBig}>Satoshi</span>
              <span className={styles.typeAlphabet}>Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp</span>
            </div>
            <div className={`${styles.typeTable} ${styles.reveal}`} style={{ transitionDelay: '120ms' }}>
              {[
                { name: 'Heading H1',  spec: 'Black · 72px · 0% tracking',   use: 'Hero titles' },
                { name: 'Heading H2',  spec: 'Bold · 48px · 0% tracking',    use: 'Product names' },
                { name: 'Body Large',  spec: 'Regular · 24px · 0% tracking', use: 'Card titles' },
                { name: 'Body Small',  spec: 'Regular · 16px · 10% tracking', use: 'Feature text' },
                { name: 'Button',      spec: 'Bold · 16–24px · 10% tracking', use: 'CTAs and prices' },
                { name: 'Caption',     spec: 'Regular · 12px · 10% tracking', use: 'Secondary labels' },
              ].map(row => (
                <div key={row.name} className={styles.typeRow}>
                  <span className={styles.typeName}>{row.name}</span>
                  <span className={styles.typeSpec}>{row.spec}</span>
                  <span className={styles.typeUse}>{row.use}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5 · Color Palette ────────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={`${styles.dsHeadline} ${styles.reveal} ${styles.revealSubtle}`}>Color Palette</h3>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '40ms' }}>
              Two backgrounds + a three-stop purple accent system.
            </p>
            <div className={`${styles.colorGroups} ${styles.reveal}`} style={{ transitionDelay: '80ms' }}>
              <div className={styles.colorGroup}>
                <span className={styles.colorGroupLabel}>Background</span>
                <div className={styles.swatchRow}>
                  {[
                    { label: 'Main',    hex: '#030405', bg: '#030405', border: true },
                    { label: 'Surface', hex: '#161B22', bg: '#161B22', border: false },
                  ].map(s => (
                    <div key={s.label} className={styles.swatch}>
                      <div className={styles.swatchColor} style={{ background: s.bg, border: s.border ? '1px solid rgba(255,255,255,0.15)' : undefined }} />
                      <span className={styles.swatchLabel}>{s.label}</span>
                      <span className={styles.swatchHex}>{s.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.colorGroup}>
                <span className={styles.colorGroupLabel}>Accent</span>
                <div className={styles.swatchRow}>
                  {[
                    { label: '100', hex: '#A64DF9', bg: '#A64DF9' },
                    { label: '300', hex: '#843FC5', bg: '#843FC5' },
                    { label: '500', hex: '#6F35A5', bg: '#6F35A5' },
                  ].map(s => (
                    <div key={s.label} className={styles.swatch}>
                      <div className={styles.swatchColor} style={{ background: s.bg }} />
                      <span className={styles.swatchLabel}>{s.label}</span>
                      <span className={styles.swatchHex}>{s.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.colorGroup}>
                <span className={styles.colorGroupLabel}>Neutral</span>
                <div className={styles.swatchRow}>
                  {[
                    { label: '100', hex: '#FFFFFF', bg: '#FFFFFF' },
                    { label: '300', hex: '#E6EDF3', bg: '#E6EDF3' },
                    { label: '500', hex: '#8B949E', bg: '#8B949E' },
                  ].map(s => (
                    <div key={s.label} className={styles.swatch}>
                      <div className={styles.swatchColor} style={{ background: s.bg }} />
                      <span className={styles.swatchLabel}>{s.label}</span>
                      <span className={styles.swatchHex}>{s.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── 6 · UI Decisions ─────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>UI Decisions</h2>
            <h3 className={`${styles.dsHeadline} ${styles.reveal} ${styles.revealSubtle}`}>Four choices that shaped the visual language</h3>
            <div className={styles.cardGrid}>
              {[
                {
                  num: '01',
                  title: 'Near-black over pure black',
                  body: 'Background #030405 instead of #000000. Pure black creates harsh contrast that flattens depth. The slight blue tint in the surface color (#161B22) gives the UI a technological, screen-like feel.',
                },
                {
                  num: '02',
                  title: 'Purple as the single accent',
                  body: 'One accent color across the entire system, no secondary palette. The three-stop purple scale (100 / 300 / 500) provides enough range for hover, active and disabled states without introducing noise.',
                },
                {
                  num: '03',
                  title: 'Spec chips in the hero',
                  body: 'Key specs (Range, Speed, Sensors, Battery) displayed as icon + value chips anchored at the bottom of the hero. Users scan the most important numbers before committing to scroll, reducing drop-off.',
                },
                {
                  num: '04',
                  title: 'Product switcher as left-rail nav',
                  body: 'Products listed vertically on the left side of the hero, not in a horizontal carousel. This keeps the main product render unobstructed and uses the natural Z-axis scan pattern for comparison.',
                },
              ].map((d, i) => (
                <div key={d.num} className={`${styles.decisionCard} ${styles.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className={styles.decisionNum}>{d.num}</span>
                  <h4 className={styles.cardTitle}>{d.title}</h4>
                  <p className={styles.cardBody}>{d.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 7 · Component Details ────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.revealTitle}`}>Component Details</h2>
            <h3 className={`${styles.dsHeadline} ${styles.reveal} ${styles.revealSubtle}`}>Spec grid + module cards</h3>
            <p className={`${styles.sectionLead} ${styles.reveal} ${styles.revealSubtle}`} style={{ transitionDelay: '40ms' }}>
              Two recurring patterns that carry most of the product information across the site.
            </p>
            <div className={`${styles.componentRow} ${styles.reveal}`} style={{ transitionDelay: '80ms' }}>

              {/* Details */}
              <div className={styles.componentBlock}>
                <p className={styles.componentBlockTitle}>Details</p>
                <p className={styles.componentBlockSub}>Full-bleed product view with technical specifications and expandable module sections.</p>
                <img
                  src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776711811/Kinesis_-_Detail_aiwl5y.png"
                  alt="Kinesis detail screen"
                  className={styles.componentBlockImg}
                />
              </div>

              {/* Features */}
              <div className={styles.componentBlock}>
                <p className={styles.componentBlockTitle}>Features</p>
                <p className={styles.componentBlockSub}>Structured overview of core capabilities, organized by category with status indicators.</p>
                <img
                  src="https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776711812/Kinesis_-_Features_x77aou.png"
                  alt="Kinesis features screen"
                  className={styles.componentBlockImg}
                />
              </div>

            </div>
          </section>

          {/* ── 8 · Closing CTA ──────────────────────────────────── */}
          <section className={`${styles.closingSection} ${styles.reveal} ${styles.revealSubtle}`}>
            <p className={styles.closingTitle}>
              Capture the Unseen.<br />Define Your Flight.
            </p>
            <p className={styles.closingByline}>Designed by Caio Cadete · 2026</p>
          </section>

          {/* ── 9 · Other Projects ───────────────────────────────── */}
          <section className={styles.otherSection}>
            <h2 className={`${styles.otherTitle} ${styles.reveal} ${styles.revealTitle}`}>Other Projects</h2>
            <div className={styles.otherList}>
              {ALL_PROJECTS.filter(p => p.id !== 'kinesis').map((p, i) => (
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
        <Footer />
      </div>
    </div>
  )
}
