import { useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'
import FRAMES_JSON from '../frames.json'
import styles from './HeroScroll.module.css'

const FRAMES = FRAMES_JSON as string[]
const TOTAL  = FRAMES.length
const BASE   = 'https://res.cloudinary.com/dfiyxjf5t/image/upload/f_webp,q_75/'

interface Props {
  planetCanvasRef: React.RefObject<HTMLCanvasElement | null>
  enabled: boolean
}

const SCROLL_WORDS = [
  { text: 'Where',      color: '#FFFFFF' },
  { text: 'Experience', color: '#4D8EFF' },
  { text: 'Meets',      color: '#FFFFFF' },
  { text: 'Creativity', color: '#4D8EFF' },
]

// p = 0.15 → 0.72: letters revealed one by one, word by word
// p = 0.72 → 0.84: whole block fades out before works appear
const WORD_ZONE_START = 0.15
const WORD_ZONE_END   = 0.72
const WORD_FADE_END   = 0.84
const WORD_SEG        = (WORD_ZONE_END - WORD_ZONE_START) / SCROLL_WORDS.length

// Flat letter offset for each word: [0, 5, 15, 20]
const WORD_LETTER_OFFSETS = SCROLL_WORDS.map((_, i) =>
  SCROLL_WORDS.slice(0, i).reduce((s, w) => s + w.text.length, 0)
)

function frameUrl(i: number) {
  return `${BASE}${FRAMES[i]}.png`
}

export default function HeroScroll({ planetCanvasRef, enabled }: Props) {
  const overlayRef    = useRef<HTMLDivElement>(null)
  const wordsBlockRef = useRef<HTMLDivElement>(null)
  const wordRowRefs   = useRef<(HTMLDivElement | null)[]>([])
  const wordSpanRefs  = useRef<(HTMLSpanElement | null)[]>([])
  const letterRefs    = useRef<(HTMLSpanElement | null)[]>([])
  const cacheRef      = useRef<Record<number, HTMLImageElement>>({})

  // Preload frame 0 on mount
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = frameUrl(0)
    cacheRef.current[0] = img
  }, [])

  // Align rows so "Experience" (word 1) and "Meets" (word 2) are each centered on screen.
  useLayoutEffect(() => {
    function align() {
      const row1    = wordRowRefs.current[0]
      const row2    = wordRowRefs.current[1]
      const expEl   = wordSpanRefs.current[1]
      const meetsEl = wordSpanRefs.current[2]
      if (!row1 || !row2 || !expEl || !meetsEl) return

      row1.style.transform = ''
      row2.style.transform = ''

      const vw        = window.innerWidth
      const expCenter   = expEl.getBoundingClientRect().left + expEl.getBoundingClientRect().width / 2
      const meetsCenter = meetsEl.getBoundingClientRect().left + meetsEl.getBoundingClientRect().width / 2

      row1.style.transform = `translateX(${vw / 2 - expCenter}px)`
      row2.style.transform = `translateX(${vw / 2 - meetsCenter}px)`
    }

    document.fonts.ready.then(align)
    window.addEventListener('resize', align)
    return () => window.removeEventListener('resize', align)
  }, [])

  // Scroll engine
  useEffect(() => {
    if (!enabled) return

    const _canvas = planetCanvasRef.current
    const overlay = overlayRef.current
    if (!_canvas) return
    const canvas: HTMLCanvasElement = _canvas
    const ctx = canvas.getContext('2d')!

    const cache = cacheRef.current
    let lastIdx = -1
    let rafPending = false
    const isMobile = window.innerWidth <= 768
    const MAX_CACHE = 50

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      if (lastIdx >= 0) draw(lastIdx, true)
    }

    function preload(start: number, n: number) {
      for (let i = start; i < Math.min(start + n, TOTAL); i++) {
        if (!cache[i]) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src  = frameUrl(i)
          cache[i] = img
        }
      }
    }

    function evictCache(currentIdx: number) {
      const keys = Object.keys(cache)
      if (keys.length <= MAX_CACHE) return
      for (const key of keys) {
        const k = Number(key)
        if (Math.abs(k - currentIdx) > MAX_CACHE / 2) delete cache[k]
      }
    }

    function draw(idx: number, force = false) {
      if (!force && idx === lastIdx) return
      lastIdx = idx

      const img = cache[idx]
      if (!img) {
        const ni = new Image()
        ni.crossOrigin = 'anonymous'
        ni.onload = () => draw(idx, true)
        ni.src    = frameUrl(idx)
        cache[idx] = ni
        return
      }
      if (!img.complete || !img.naturalWidth) {
        img.onload = () => draw(idx, true)
        return
      }

      const cw = canvas.width, ch = canvas.height
      const s  = Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(
        img,
        (cw - img.naturalWidth  * s) / 2,
        (ch - img.naturalHeight * s) / 2,
        img.naturalWidth  * s,
        img.naturalHeight * s,
      )
    }

    function handleScroll() {
      const wrap = document.getElementById('scroll-wrap')
      if (!wrap) return
      const maxY = wrap.offsetHeight - window.innerHeight

      // When user scrolls past the scroll-wrap and into the Work section / footer,
      // just fade the dark overlay and stop — the Work section handles itself.
      if (window.scrollY > maxY && maxY > 0) {
        const past    = window.scrollY - maxY
        const fadeOut = Math.min(1, past / 300)
        if (overlay) overlay.style.opacity = (0.30 * (1 - fadeOut)).toFixed(3)
        if (wordsBlockRef.current) wordsBlockRef.current.style.opacity = '0'
        return
      }

      const p = maxY > 0 ? Math.min(1, window.scrollY / maxY) : 0

      // Frame animation — desktop only
      if (!isMobile) {
        const frameIdx = Math.min(Math.floor(p * TOTAL), TOTAL - 1)
        draw(frameIdx)
        preload(frameIdx, 8)
        evictCache(frameIdx)
      }

      // Letter-by-letter word reveal
      const block = wordsBlockRef.current
      if (block) {
        let blockOp = 0
        if (p >= WORD_ZONE_START && p <= WORD_ZONE_END) {
          blockOp = 1
        } else if (p > WORD_ZONE_END && p < WORD_FADE_END) {
          blockOp = 1 - (p - WORD_ZONE_END) / (WORD_FADE_END - WORD_ZONE_END)
        }
        block.style.opacity = Math.max(0, blockOp).toFixed(3)

        for (let wi = 0; wi < SCROLL_WORDS.length; wi++) {
          const word     = SCROLL_WORDS[wi]
          const segStart = WORD_ZONE_START + wi * WORD_SEG
          const t        = Math.max(0, Math.min(1, (p - segStart) / WORD_SEG))
          const show     = Math.round(t * word.text.length)
          const offset   = WORD_LETTER_OFFSETS[wi]
          for (let ci = 0; ci < word.text.length; ci++) {
            const el = letterRefs.current[offset + ci]
            if (el) el.style.opacity = ci < show ? '1' : '0'
          }
        }
      }

      // Dark overlay fades in at end of hero scroll
      const ot = Math.max(0, Math.min(0.30, (p - 0.70) / 0.25 * 0.30))
      if (overlay) overlay.style.opacity = ot.toFixed(3)
    }

    function onScroll() {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(() => {
        rafPending = false
        handleScroll()
      })
    }

    resize()

    if (!isMobile) preload(0, 20)

    const frame0 = cache[0]
    if (frame0?.complete && frame0.naturalWidth) {
      draw(0, true)
      activate()
    } else {
      const img0 = cache[0] ?? (() => {
        const i = new Image()
        i.crossOrigin = 'anonymous'
        i.src = frameUrl(0)
        cache[0] = i
        return i
      })()
      img0.onload = () => { draw(0, true); activate() }
    }

    function activate() {
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', resize)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
    }
  }, [enabled])

  return (
    <>
      <div id="scroll-wrap" className={styles.scrollWrap} />

      <div ref={overlayRef} className={styles.darkOverlay} />

      {/* Two-row word block: Where+Experience / Meets+Creativity */}
      <div ref={wordsBlockRef} className={styles.wordsBlock}>
        <div ref={el => { wordRowRefs.current[0] = el }} className={styles.wordsRow}>
          {[0, 1].map(wi => (
            <span
              key={wi}
              ref={el => { wordSpanRefs.current[wi] = el }}
              className={styles.wordSpan}
              style={{ color: SCROLL_WORDS[wi].color }}
            >
              {SCROLL_WORDS[wi].text.split('').map((ch, ci) => (
                <span
                  key={ci}
                  ref={el => { letterRefs.current[WORD_LETTER_OFFSETS[wi] + ci] = el }}
                  className={styles.letterSpan}
                >{ch}</span>
              ))}
            </span>
          ))}
        </div>
        <div ref={el => { wordRowRefs.current[1] = el }} className={styles.wordsRow}>
          {[2, 3].map(wi => (
            <span
              key={wi}
              ref={el => { wordSpanRefs.current[wi] = el }}
              className={styles.wordSpan}
              style={{ color: SCROLL_WORDS[wi].color }}
            >
              {SCROLL_WORDS[wi].text.split('').map((ch, ci) => (
                <span
                  key={ci}
                  ref={el => { letterRefs.current[WORD_LETTER_OFFSETS[wi] + ci] = el }}
                  className={styles.letterSpan}
                >{ch}</span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
