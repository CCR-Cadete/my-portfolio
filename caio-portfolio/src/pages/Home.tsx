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
  const [scrollReady, setScrollReady] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { window.scrollTo(0, 0) }, [])

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
      />

      {/* Scroll engine — draws frames on the shared canvas, renders scroll-wrap spacer */}
      <HeroScroll
        planetCanvasRef={planetCanvasRef}
        enabled={scrollReady}
      />

      {/* Work section — normal flow after the scroll spacer, before footer */}
      <WorkSection onProjectClick={(id) => navigate(`/${id}`)} />

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
