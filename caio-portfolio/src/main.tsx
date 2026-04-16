import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

window.history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(<App />)
