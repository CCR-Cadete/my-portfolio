import { useEffect, useState } from 'react'
import type React from 'react'
import styles from './Nav.module.css'

interface Props {
  visible: boolean
  onAboutClick: () => void
}

export default function Nav({ visible, onAboutClick }: Props) {
  const [workActive,    setWorkActive]    = useState(false)
  const [contactActive, setContactActive] = useState(false)
  const [atTop,         setAtTop]         = useState(true)
  const [menuOpen,      setMenuOpen]      = useState(false)

  // Single scroll listener covers: top-of-page, work section visibility, footer visibility
  useEffect(() => {
    function onScroll() {
      setAtTop(window.scrollY < 20)

      const workEl = document.getElementById('works-section')
      if (workEl) {
        const r = workEl.getBoundingClientRect()
        setWorkActive(r.top < window.innerHeight * 0.8 && r.bottom > 0)
      }

      const footer = document.getElementById('site-footer')
      if (footer) {
        setContactActive(footer.getBoundingClientRect().top < window.innerHeight * 0.5)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Custom eased scroll — browser's 'smooth' races through large distances on mobile
  function smoothScrollTo(target: number, duration = 900) {
    const start = window.scrollY
    const distance = target - start
    if (Math.abs(distance) < 2) return
    const startTime = performance.now()
    function step(now: number) {
      const elapsed = Math.min(now - startTime, duration)
      const t = elapsed / duration
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      window.scrollTo(0, start + distance * eased)
      if (elapsed < duration) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  function handleHomeClick(e: React.MouseEvent) {
    e.preventDefault()
    smoothScrollTo(0)
  }

  function handleWorkClick(e: React.MouseEvent) {
    e.preventDefault()
    const workEl = document.getElementById('works-section')
    if (!workEl) return
    smoothScrollTo(workEl.getBoundingClientRect().top + window.scrollY)
  }

  function handleContactClick(e: React.MouseEvent) {
    e.preventDefault()
    const footer = document.getElementById('site-footer')
    if (!footer) return
    smoothScrollTo(footer.getBoundingClientRect().top + window.scrollY)
  }

  const homeActive = atTop && !workActive && !contactActive

  function closeMenu() { setMenuOpen(false) }

  return (
    <>
      <nav className={`${styles.nav} ${visible ? styles.navVisible : ''} ${menuOpen ? styles.navMenuOpen : ''}`}>
        {/* Desktop links */}
        <a href="#home" className={`${styles.link} ${homeActive ? styles.linkActive : ''}`} onClick={handleHomeClick}>Home</a>
        <a href="#work" className={`${styles.link} ${workActive && !contactActive ? styles.linkActive : ''}`} onClick={handleWorkClick}>Work</a>
        <a href="#about" className={styles.link} onClick={(e) => { e.preventDefault(); onAboutClick() }}>About</a>
        <a href="#contact" className={`${styles.link} ${contactActive ? styles.linkActive : ''}`} onClick={handleContactClick}>Contact</a>

        {/* Hamburger — mobile only, always 3-line icon */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
            <line x1="0" y1="1" x2="22" y2="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="0" y1="7.5" x2="22" y2="7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="0" y1="14" x2="22" y2="14" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </nav>

      {/* Mobile full-screen menu */}
      <div className={`${styles.mobileMenu} ${visible && menuOpen ? styles.mobileMenuOpen : ''}`}>
        {/* Logo — same position and style as the hero nameCorner */}
        <span className={styles.mobileMenuLogo}>
          <span>Caio</span>
          <span>Cadete</span>
        </span>

        {/* X — top-right, matches the closed hamburger position */}
        <button className={styles.mobileMenuClose} onClick={closeMenu} aria-label="Close menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="2" y1="2" x2="18" y2="18" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="18" y1="2" x2="2" y2="18" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Links — left-aligned */}
        <div className={styles.mobileMenuLinks}>
          <a href="#home" className={styles.mobileLink} onClick={(e) => { e.preventDefault(); closeMenu(); window.scrollTo(0, 0) }}>Home</a>
          <a href="#work" className={styles.mobileLink} onClick={(e) => {
            e.preventDefault(); closeMenu()
            const workEl = document.getElementById('works-section')
            if (workEl) window.scrollTo(0, workEl.getBoundingClientRect().top + window.scrollY)
          }}>Work</a>
          <a href="#about" className={styles.mobileLink} onClick={(e) => { e.preventDefault(); closeMenu(); onAboutClick() }}>About</a>
          <a href="#contact" className={styles.mobileLink} onClick={(e) => {
            e.preventDefault(); closeMenu()
            const footer = document.getElementById('site-footer')
            if (footer) window.scrollTo(0, footer.getBoundingClientRect().top + window.scrollY)
          }}>Contact</a>
        </div>
      </div>
    </>
  )
}
