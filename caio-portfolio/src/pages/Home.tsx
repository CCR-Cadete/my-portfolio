import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IntroAnimation from '../components/IntroAnimation'
import HeroScroll from '../components/HeroScroll'
import WorkSection from '../components/WorkSection'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import AboutPanel from '../components/AboutPanel'
import CustomCursor from '../components/CustomCursor'

export default function Home() {
  const planetCanvasRef = useRef<HTMLCanvasElement>(null)
  // useRef so the value is read exactly once per mount, even in React Strict Mode
  // where the component function is invoked twice before committing.
  const skipIntroRef = useRef(sessionStorage.getItem('skipIntro') === 'true')
  const [scrollReady, setScrollReady] = useState(skipIntroRef.current)
  const [aboutOpen, setAboutOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Clear the flag once, on mount (effect always runs exactly once in production).
    sessionStorage.removeItem('skipIntro')

    if (skipIntroRef.current) {
      // Defer one frame so layout is complete before measuring works-section
      requestAnimationFrame(() => {
        const workEl = document.getElementById('works-section')
        if (workEl) window.scrollTo(0, workEl.getBoundingClientRect().top + window.scrollY)
      })
    } else {
      window.scrollTo(0, 0)
    }
  }, [])

  return (
    <>
      {/*
       * Layer 1 — The ONLY planet background canvas.
       * Starts invisible (opacity 0) and scaled up (1.3×).
       * IntroAnimation animates it into view during the contract phase.
       * HeroScroll draws frames on it when scrolling.
       */}
      <canvas
        ref={planetCanvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          opacity: 0,
          transform: 'scale(1.3)',
          transformOrigin: 'center center',
        }}
      />

      {/* Layers 2-5 — intro animation, hero texts, corner name */}
      <IntroAnimation
        planetCanvasRef={planetCanvasRef}
        onScrollReady={() => setScrollReady(true)}
        skip={skipIntroRef.current}
      />

      {/* Scroll engine — draws frames on the shared canvas, renders scroll-wrap spacer */}
      <HeroScroll
        planetCanvasRef={planetCanvasRef}
        enabled={scrollReady}
      />

      {/* Work section — normal flow after the scroll spacer, before footer */}
      <WorkSection onProjectClick={(id) => navigate(`/${id}`)} />

      {/*
       * Top vignette — fades content that scrolls into the nav zone.
       * z-index 11 + positioned after WorkSection in DOM so it renders
       * above WorkSection items but below the logo (z-12) and nav (z-50).
       */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 110,
          background: 'linear-gradient(to bottom, rgba(5,7,15,1) 0%, rgba(5,7,15,0.6) 50%, transparent 100%)',
          zIndex: 11,
          pointerEvents: 'none',
        }}
      />

      {/* Global nav — top right, appears after intro */}
      <Nav visible={scrollReady} onAboutClick={() => setAboutOpen(true)} />

      {/* Footer — final destination */}
      <Footer />

      {/* About panel — slides in on top of everything */}
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* Custom cursor — always on top */}
      <CustomCursor />
    </>
  )
}
