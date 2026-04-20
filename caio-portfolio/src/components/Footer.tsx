import styles from './Footer.module.css'

const SOCIAL_LINKS = [
  {
    name: 'WhatsApp',
    href: 'https://wa.me/+5511942067759',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L0 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.345.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/caiocadeteramos',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    name: 'Behance',
    href: 'https://www.behance.net/caiocadete',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.3333 7.91671H14.5V6.25006H20.3333V7.91671ZM21.7716 16.25C21.4032 17.3308 20.0808 18.7499 17.5208 18.7499C14.9591 18.7499 12.8842 17.3091 12.8842 14.0208C12.8842 10.7625 14.8217 9.08753 17.4391 9.08753C20.0074 9.08753 21.5757 10.5725 21.9182 12.7758C21.9832 13.1975 22.0091 13.7658 21.9974 14.5591H15.3083C15.4166 17.2349 18.2108 17.3191 19.1316 16.25H21.7716ZM15.3666 12.9167H19.5041C19.4166 11.6275 18.5574 11.0675 17.44 11.0675C16.2183 11.0675 15.5425 11.7075 15.3666 12.9167ZM7.3884 18.7399H2.00012V6.26756H7.79423C12.3575 6.33506 12.4442 10.8042 10.0609 12.0225C12.945 13.0725 13.0417 18.7399 7.3884 18.7399ZM4.5001 11.25H7.48673C9.57671 11.25 9.90837 8.75003 7.22673 8.75003H4.5001V11.25ZM7.3259 13.75H4.5001V16.2633H7.28423C9.83004 16.2633 9.67421 13.75 7.3259 13.75Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Email',
    href: 'mailto:caiocadeteramos@gmail.com',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 8.18359L14.5605 12.2725C13.0334 13.2419 10.9666 13.2419 9.43945 12.2725L3 8.18457V17C3 17.4558 3.44593 18 4.22266 18H19.7773C20.5541 18 21 17.4558 21 17V8.18359ZM4.22266 6C3.95871 6 3.73277 6.0632 3.5498 6.16406L10.5107 10.584C11.3836 11.1382 12.6164 11.1382 13.4893 10.584L20.4492 6.16406C20.2664 6.06344 20.0409 6 19.7773 6H4.22266ZM23 17C23 18.7534 21.4552 20 19.7773 20H4.22266C2.54478 20 1 18.7534 1 17V7C1 5.24665 2.54478 4 4.22266 4H19.7773C21.4552 4 23 5.24665 23 7V17Z" fill="currentColor"/>
      </svg>
    ),
  },
]

export default function Footer() {
  return (
    <footer id="site-footer" className={styles.footer}>
      {/* Left — intro text + copyright */}
      <div className={styles.left}>
        <div className={styles.introSection}>
          <h2 className={styles.heading}>Let's build something meaningful!</h2>
          <p className={styles.body}>
            I'm always open to a conversation, whether it's about a project,
            ideas, or simply sharing experiences.
            <br /><br />
            Feel free to reach out. I'd love to talk with you!
          </p>
        </div>
        <p className={styles.copyright}>Copyright © 2026 Caio Cadete</p>
      </div>

      {/* Vertical dividing line */}
      <div className={styles.divider} />

      {/* Right — social links */}
      <div className={styles.contactSection}>
        {SOCIAL_LINKS.map(link => (
          <a
            key={link.name}
            href={link.href}
            className={styles.socialLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.socialIcon}>{link.icon}</span>
            <span className={styles.socialName}>{link.name}</span>
          </a>
        ))}
      </div>
    </footer>
  )
}
