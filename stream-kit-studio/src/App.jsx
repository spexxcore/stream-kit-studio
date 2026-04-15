import { useState } from 'react'
import BuilderPage from './pages/BuilderPage.jsx'
import KitPage from './pages/KitPage.jsx'

export default function App() {
  const [kitData, setKitData] = useState(null)
  const [page, setPage] = useState('builder')

  const handleKitGenerated = (data) => {
    setKitData(data)
    setPage('kit')
  }

  const handleReset = () => {
    setKitData(null)
    setPage('builder')
  }

  return page === 'builder'
    ? <BuilderPage onKitGenerated={handleKitGenerated} />
    : <KitPage kitData={kitData} onReset={handleReset} />
}
