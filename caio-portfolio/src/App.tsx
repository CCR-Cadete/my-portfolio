import { useEffect, useRef, useState } from 'react'
import IntroAnimation from './components/IntroAnimation'
import HeroScroll from './components/HeroScroll'
import Footer from './components/Footer'
import Nav from './components/Nav'
import AboutPanel from './components/AboutPanel'
import CustomCursor from './components/CustomCursor'

export default function App() {
  const planetCanvasRef = useRef<HTMLCanvasElement>(null)
  const [scrollReady, setScrollReady] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

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

      {/* Scroll engine — draws frames on the shared canvas */}
      <HeroScroll
        planetCanvasRef={planetCanvasRef}
        enabled={scrollReady}
      />

      {/* Global nav — top right, appears after intro */}
      <Nav visible={scrollReady} onAboutClick={() => setAboutOpen(true)} />

      {/* Footer — normal flow after the scroll animation, final destination */}
      <Footer />

      {/* About panel — slides in on top of everything */}
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* Custom cursor — always on top */}
      <CustomCursor />
    </>
  )
}
