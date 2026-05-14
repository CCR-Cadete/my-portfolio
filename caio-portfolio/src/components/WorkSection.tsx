import { useEffect, useRef } from 'react'
import styles from './WorkSection.module.css'

const projects = [
  { id: 'omnicontrol', title: 'OmniControl', subtitle: 'Building Management System · UX/UI', image: 'https://ik.imagekit.io/n2zwd2oc9/Covers/Cover_-_Omnicontrol_awz7k7.png' },
  { id: 'nexus',       title: 'Nexus',       subtitle: 'B2B Financial Dashboard · UX/UI',    image: 'https://ik.imagekit.io/n2zwd2oc9/Covers/Cover_-_Nexus_duuzjo.png' },
  { id: 'depth',       title: 'Depth',       subtitle: 'Global eSIM & Data App · UX/UI',     image: 'https://ik.imagekit.io/n2zwd2oc9/Covers/Cover_-_depth_wanegl.png' },
  { id: 'kinesis',     title: 'Kinesis',     subtitle: 'Drone Control Interface · UI',        image: 'https://ik.imagekit.io/n2zwd2oc9/Covers/Cover_-_Kinesis_hjmokj.png' },
]

interface Props {
  onProjectClick?: (id: string) => void
}

export default function WorkSection({ onProjectClick }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRefs   = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let revealed = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !revealed) {
          revealed = true
          cardRefs.current.forEach((el, i) => {
            if (el) setTimeout(() => el.classList.add(styles.cardShow), i * 120)
          })
        }
      },
      { threshold: 0.05 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="works-section" ref={sectionRef} className={styles.section}>
      <div className={styles.grid}>
        {projects.map((p, i) => (
          <div
            key={p.id}
            ref={el => { cardRefs.current[i] = el }}
            className={styles.card}
            onClick={() => onProjectClick?.(p.id)}
          >
            <div className={styles.imageWrap}>
              <img src={p.image} alt={p.title} className={styles.cardImg} />
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.cardTitle}>{p.title}</span>
              <span className={styles.cardSub}>{p.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
