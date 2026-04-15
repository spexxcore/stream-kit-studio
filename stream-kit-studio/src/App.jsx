import { useState } from 'react'
import { Layers, Wand2 } from 'lucide-react'
import BuilderPage from './pages/BuilderPage.jsx'
import KitPage from './pages/KitPage.jsx'
import LogoMaker from './pages/LogoMaker.jsx'
import styles from './App.module.css'

export default function App() {
  const [kitData, setKitData] = useState(null)
  const [kitPage, setKitPage] = useState(false)
  const [activeNav, setActiveNav] = useState('kit')

  const handleKitGenerated = (data) => {
    setKitData(data)
    setKitPage(true)
  }

  const handleReset = () => {
    setKitData(null)
    setKitPage(false)
  }

  if (kitPage && kitData) {
    return <KitPage kitData={kitData} onReset={handleReset} />
  }

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <Layers size={18} className={styles.navLogoIcon} />
          <span>Stream Kit Studio</span>
        </div>
        <div className={styles.navTabs}>
          <button
            className={`${styles.navTab} ${activeNav === 'kit' ? styles.navActive : ''}`}
            onClick={() => setActiveNav('kit')}
          >
            <Layers size={14} /> Kit Builder
          </button>
          <button
            className={`${styles.navTab} ${activeNav === 'logo' ? styles.navActive : ''}`}
            onClick={() => setActiveNav('logo')}
          >
            <Wand2 size={14} /> Logo Maker
          </button>
        </div>
        <div className={styles.navRight}>
          <span className={styles.navTagline}>AI-powered stream branding</span>
        </div>
      </nav>

      {activeNav === 'kit' && <BuilderPage onKitGenerated={handleKitGenerated} />}
      {activeNav === 'logo' && <LogoMaker />}
    </div>
  )
}
