import { useEffect, useRef, useState } from 'react'
import styles from './WorkSection.module.css'

const projects = [
  { id: 'omnicontrol', title: 'OmniControl', subtitle: 'Building Management System · UX/UI', image: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_Omnicontrol_awz7k7.png' },
  { id: 'nexus',       title: 'Nexus',       subtitle: 'B2B Financial Dashboard · UX/UI',    image: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_Nexus_duuzjo.png' },
  { id: 'depth',       title: 'Depth',       subtitle: 'Global eSIM & Data App · UX/UI',     image: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290931/Cover_-_depth_wanegl.png' },
  { id: 'kinesis',     title: 'Kinesis',     subtitle: 'Drone Control Interface · UI',        image: 'https://res.cloudinary.com/dfiyxjf5t/image/upload/v1776290932/Cover_-_Kinesis_hjmokj.png' },
]

interface Props {
  onProjectClick?: (id: string) => void
}

export default function WorkSection({ onProjectClick }: Props) {
  const [activeProject, setActiveProject] = useState('omnicontrol')
  const sectionRef  = useRef<HTMLElement>(null)
  const rowRefs     = useRef<(HTMLDivElement | null)[]>([])
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([])

  const activeImage = projects.find(p => p.id === activeProject)?.image ?? projects[0].image

  // Reveal items when the section enters the viewport
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let revealed = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !revealed) {
          revealed = true
          rowRefs.current.forEach((el, i) => {
            if (el) setTimeout(() => el.classList.add(styles.rowShow), i * 100)
          })
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
      {/* Desktop: left project list + right sticky cover */}
      <div className={styles.leftCol}>
        {projects.map((p, i) => {
          const active = activeProject === p.id
          return (
            <div
              key={p.id}
              ref={el => { rowRefs.current[i] = el }}
              className={styles.row}
              onMouseEnter={() => setActiveProject(p.id)}
              onClick={() => onProjectClick?.(p.id)}
            >
              <span className={styles.title} style={{ color: active ? '#FFFFFF' : '#6B7280' }}>
                {p.title}
              </span>
              <span className={styles.sub} style={{ color: active ? '#9CA3AF' : '#374151' }}>
                {p.subtitle}
              </span>
            </div>
          )
        })}
      </div>

      <div className={styles.rightCol}>
        <img
          key={activeProject}
          src={activeImage}
          alt={activeProject}
          className={styles.cover}
        />
      </div>

      {/* Mobile: vertical card stack */}
      <div className={styles.mobileCards}>
        {projects.map((p, i) => (
          <div
            key={p.id}
            ref={el => { cardRefs.current[i] = el }}
            className={styles.card}
            onClick={() => onProjectClick?.(p.id)}
          >
            <img src={p.image} alt={p.title} className={styles.cardImg} />
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
