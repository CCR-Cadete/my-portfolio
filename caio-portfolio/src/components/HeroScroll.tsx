import { useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'
import styles from './HeroScroll.module.css'

const TOTAL = 600

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
  return `/Frames/frame-${String(i).padStart(3, '0')}.webp`
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
    let lastDrawn = -1   // último frame efetivamente desenhado
    let wantIdx   = -1   // frame que o scroll quer agora
    let rafPending = false
    const isMobile = window.innerWidth <= 768

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      if (lastDrawn >= 0) paintFrame(lastDrawn)
    }

    function ensureImg(i: number): HTMLImageElement {
      if (!cache[i]) {
        const img = new Image()
        img.src = frameUrl(i)
        cache[i] = img
      }
      return cache[i]
    }

    // Enfileira frames [start, start+n) sem bloquear
    function preload(start: number, n: number) {
      const end = Math.min(start + n, TOTAL)
      for (let i = Math.max(0, start); i < end; i++) ensureImg(i)
    }

    // Desenha apenas — sem callbacks, sem lógica
    function paintFrame(idx: number) {
      const img = cache[idx]
      if (!img?.complete || !img.naturalWidth) return
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
      lastDrawn = idx
    }

    // Tenta desenhar o frame desejado; se não estiver pronto,
    // registra onload para atualizar quando chegar
    function draw(idx: number) {
      wantIdx = idx
      const img = cache[idx]
      if (img?.complete && img.naturalWidth) {
        if (idx !== lastDrawn) paintFrame(idx)
        return
      }
      // Ainda carregando: garante que a imagem existe e agenda redraw
      const loading = ensureImg(idx)
      loading.onload = () => {
        if (wantIdx === idx) paintFrame(idx)
      }
    }

    function handleScroll() {
      const wrap = document.getElementById('scroll-wrap')
      if (!wrap) return
      const maxY = wrap.offsetHeight - window.innerHeight
      const totalMaxY = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        maxY,
      )

      // ── Animação de frames cobre a página inteira (desktop only) ──
      if (!isMobile && totalMaxY > 0) {
        const frameIdx = Math.min(
          Math.floor((window.scrollY / totalMaxY) * TOTAL),
          TOTAL - 1,
        )
        draw(frameIdx)
        // Preload à frente e um pouco atrás (para scroll de volta)
        preload(frameIdx + 1, 60)
        preload(Math.max(0, frameIdx - 15), 15)
      }

      // ── Passou o hero scroll-wrap ──
      if (window.scrollY > maxY && maxY > 0) {
        const footer = document.getElementById('site-footer')
        let fadeOut = 0
        if (footer) {
          const footerTop = footer.getBoundingClientRect().top
          fadeOut = Math.max(0, Math.min(1, (window.innerHeight - footerTop) / 300))
        }
        if (overlay) overlay.style.opacity = (0.30 * (1 - fadeOut)).toFixed(3)
        if (wordsBlockRef.current) wordsBlockRef.current.style.opacity = '0'
        return
      }

      // ── Progresso dentro do hero scroll-wrap (0→1) ──
      const p = maxY > 0 ? Math.min(1, window.scrollY / maxY) : 0

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

      const ot = Math.max(0, Math.min(0.30, (p - 0.70) / 0.25 * 0.30))
      if (overlay) overlay.style.opacity = ot.toFixed(3)
    }

    function onScroll() {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(() => { rafPending = false; handleScroll() })
    }

    function activate() {
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', resize)
    }

    resize()

    if (!isMobile) {
      // Pré-carrega os primeiros 80 frames imediatamente
      preload(0, 80)

      // Background loader: 6 cadeias paralelas cobrindo todos os frames
      // (corresponde ao limite de conexões simultâneas do browser)
      const CHAINS = 6
      for (let c = 0; c < CHAINS; c++) {
        let i = c
        const advance = () => {
          while (i < TOTAL && cache[i]?.complete) i += CHAINS
          if (i >= TOTAL) return
          const img = ensureImg(i)
          if (img.complete) { i += CHAINS; advance(); return }
          img.addEventListener('load',  () => { i += CHAINS; advance() }, { once: true })
          img.addEventListener('error', () => { i += CHAINS; advance() }, { once: true })
        }
        // Aguarda um tick para não competir com o preload inicial
        setTimeout(advance, 100)
      }
    }

    // Ativa quando frame 0 estiver pronto
    const img0 = ensureImg(0)
    if (img0.complete && img0.naturalWidth) {
      paintFrame(0); activate()
    } else {
      img0.onload = () => { paintFrame(0); activate() }
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
