import { useEffect, useState } from 'react'
import type React from 'react'
import styles from './Nav.module.css'

interface Props {
  visible: boolean
}

export default function Nav({ visible }: Props) {
  const [workActive,    setWorkActive]    = useState(false)
  const [contactActive, setContactActive] = useState(false)

  // Watch works-section classList for worksShow
  useEffect(() => {
    function check() {
      const el = document.getElementById('works-section')
      if (!el) return
      setWorkActive(Array.from(el.classList).some(c => c.includes('worksShow')))
    }

    const observer = new MutationObserver(check)

    function tryObserve() {
      const el = document.getElementById('works-section')
      if (el) {
        observer.observe(el, { attributes: true, attributeFilter: ['class'] })
      } else {
        requestAnimationFrame(tryObserve)
      }
    }
    tryObserve()

    return () => observer.disconnect()
  }, [])

  // Watch scroll position to detect when footer is visible
  useEffect(() => {
    function onScroll() {
      const footer = document.getElementById('site-footer')
      if (!footer) return
      const rect = footer.getBoundingClientRect()
      setContactActive(rect.top < window.innerHeight * 0.5)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleHomeClick(e: React.MouseEvent) {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleWorkClick(e: React.MouseEvent) {
    e.preventDefault()
    const wrap = document.getElementById('scroll-wrap')
    if (!wrap) return
    const maxY = wrap.offsetHeight - window.innerHeight
    window.scrollTo({ top: maxY * 0.95, behavior: 'smooth' })
  }

  function handleContactClick(e: React.MouseEvent) {
    e.preventDefault()
    const footer = document.getElementById('site-footer')
    if (!footer) return
    footer.scrollIntoView({ behavior: 'smooth' })
  }

  const homeActive = !workActive && !contactActive

  return (
    <nav className={`${styles.nav} ${visible ? styles.navVisible : ''}`}>
      <a
        href="#home"
        className={`${styles.link} ${homeActive ? styles.linkActive : ''}`}
        onClick={handleHomeClick}
      >
        Home
      </a>
      <a
        href="#work"
        className={`${styles.link} ${workActive && !contactActive ? styles.linkActive : ''}`}
        onClick={handleWorkClick}
      >
        Work
      </a>
      <a href="#about" className={styles.link}>About</a>
      <a href="#contact" className={`${styles.link} ${contactActive ? styles.linkActive : ''}`} onClick={handleContactClick}>Contact</a>
    </nav>
  )
}
