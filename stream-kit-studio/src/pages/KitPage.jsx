import { useState } from 'react'
import { Download, RefreshCw, Eye, Code, Layers, Zap, Layout, Image, ArrowLeft } from 'lucide-react'
import styles from './KitPage.module.css'

const ASSET_TYPES = [
  { id: 'overlay', label: 'Stream Overlay', icon: Layout, desc: '1920×1080 OBS browser source' },
  { id: 'alerts', label: 'Alerts', icon: Zap, desc: 'Follow / Sub / Donation' },
  { id: 'panels', label: 'Panels', icon: Layers, desc: '6 channel info panels' },
  { id: 'banner', label: 'Banner', icon: Image, desc: 'Channel header 1200×480' },
]

export default function KitPage({ kitData, onReset }) {
  const { brief, assets } = kitData
  const [activeTab, setActiveTab] = useState(null)
  const [generatedAssets, setGeneratedAssets] = useState({})
  const [generating, setGenerating] = useState(null)
  const [viewMode, setViewMode] = useState('preview') // preview | code

  const generateAsset = async (type) => {
    if (generatedAssets[type]) {
      setActiveTab(type)
      return
    }
    setGenerating(type)
    setActiveTab(type)
    try {
      const res = await fetch('/.netlify/functions/generate-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, assetType: type })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedAssets(prev => ({ ...prev, [type]: data.html }))
    } catch (e) {
      setGeneratedAssets(prev => ({ ...prev, [type]: `<p style="color:red;padding:20px;">Error: ${e.message}</p>` }))
    } finally {
      setGenerating(null)
    }
  }

  const downloadAsset = (type) => {
    const html = generatedAssets[type]
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${brief.brandName.toLowerCase().replace(/\s+/g, '-')}-${type}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadImage = (url, name) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.target = '_blank'
    a.click()
  }

  const colors = [
    { label: 'Primary', hex: brief.primaryColor },
    { label: 'Secondary', hex: brief.secondaryColor },
    { label: 'Accent', hex: brief.accentColor },
    { label: 'Background', hex: brief.backgroundColor },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onReset}>
          <ArrowLeft size={15} /> New Kit
        </button>
        <div className={styles.headerBrand}>
          <span className={styles.brandName}>{brief.brandName}</span>
          <span className={styles.brandTag}>Kit ready</span>
        </div>
        <div style={{ width: 80 }} />
      </header>

      <div className={styles.layout}>
        {/* Left sidebar - brand brief */}
        <aside className={styles.sidebar}>
          <section className={styles.sideSection}>
            <h3>Brand Identity</h3>
            <p className={styles.brandSummary}>{brief.brandSummary}</p>
          </section>

          <section className={styles.sideSection}>
            <h3>Color Palette</h3>
            <div className={styles.colors}>
              {colors.map(c => (
                <div key={c.label} className={styles.colorRow}>
                  <div className={styles.colorSwatch} style={{ background: c.hex }} />
                  <div>
                    <div className={styles.colorLabel}>{c.label}</div>
                    <div className={styles.colorHex}>{c.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.sideSection}>
            <h3>Typography</h3>
            <div className={styles.fontRow}>
              <span className={styles.fontLabel}>Headers</span>
              <span className={styles.fontName}>{brief.fontPrimary}</span>
            </div>
            <div className={styles.fontRow}>
              <span className={styles.fontLabel}>Body</span>
              <span className={styles.fontName}>{brief.fontSecondary}</span>
            </div>
          </section>

          {/* Images */}
          {assets.logoUrl && (
            <section className={styles.sideSection}>
              <h3>Logo</h3>
              <div className={styles.imageCard}>
                <img src={assets.logoUrl} alt="Generated logo" className={styles.generatedImg} />
                <button className={styles.dlBtn} onClick={() => downloadImage(assets.logoUrl, `${brief.brandName}-logo.png`)}>
                  <Download size={13} /> Download
                </button>
              </div>
            </section>
          )}

          {assets.mascotUrl && (
            <section className={styles.sideSection}>
              <h3>Mascot</h3>
              <div className={styles.imageCard}>
                <img src={assets.mascotUrl} alt="Generated mascot" className={styles.generatedImg} />
                <button className={styles.dlBtn} onClick={() => downloadImage(assets.mascotUrl, `${brief.brandName}-mascot.png`)}>
                  <Download size={13} /> Download
                </button>
              </div>
            </section>
          )}
        </aside>

        {/* Main content - overlay builder */}
        <main className={styles.main}>
          <div className={styles.assetHeader}>
            <h2>Stream Assets</h2>
            <p className={styles.assetDesc}>Click any asset to generate it. Each is a fully coded HTML file ready for OBS or download.</p>
          </div>

          <div className={styles.assetTabs}>
            {ASSET_TYPES.map(({ id, label, icon: Icon, desc }) => {
              const isActive = activeTab === id
              const isReady = !!generatedAssets[id]
              const isLoading = generating === id
              return (
                <button
                  key={id}
                  className={`${styles.assetTab} ${isActive ? styles.tabActive : ''} ${isReady ? styles.tabReady : ''}`}
                  onClick={() => generateAsset(id)}
                >
                  <div className={styles.tabTop}>
                    <Icon size={16} />
                    <span>{label}</span>
                    {isReady && <span className={styles.readyBadge}>✓</span>}
                    {isLoading && <span className={styles.loadingDot} />}
                  </div>
                  <span className={styles.tabDesc}>{desc}</span>
                </button>
              )
            })}
          </div>

          {/* Asset preview area */}
          {activeTab && (
            <div className={styles.previewArea}>
              <div className={styles.previewToolbar}>
                <span className={styles.previewLabel}>{ASSET_TYPES.find(a => a.id === activeTab)?.label}</span>
                <div className={styles.viewToggle}>
                  <button className={`${styles.viewBtn} ${viewMode === 'preview' ? styles.viewActive : ''}`} onClick={() => setViewMode('preview')}>
                    <Eye size={13} /> Preview
                  </button>
                  <button className={`${styles.viewBtn} ${viewMode === 'code' ? styles.viewActive : ''}`} onClick={() => setViewMode('code')}>
                    <Code size={13} /> Code
                  </button>
                </div>
                <div style={{ flex: 1 }} />
                {generatedAssets[activeTab] && (
                  <>
                    <button className={styles.regenBtn} onClick={() => {
                      setGeneratedAssets(prev => { const n = {...prev}; delete n[activeTab]; return n })
                      generateAsset(activeTab)
                    }}>
                      <RefreshCw size={13} /> Regenerate
                    </button>
                    <button className={styles.downloadBtn} onClick={() => downloadAsset(activeTab)}>
                      <Download size={13} /> Download HTML
                    </button>
                  </>
                )}
              </div>

              <div className={styles.previewFrame}>
                {generating === activeTab ? (
                  <div className={styles.generating}>
                    <div className={styles.genRing} />
                    <p>Claude is writing your {ASSET_TYPES.find(a=>a.id===activeTab)?.label.toLowerCase()}...</p>
                    <p className={styles.genNote}>Building production-ready HTML/CSS with your brand colors</p>
                  </div>
                ) : generatedAssets[activeTab] ? (
                  viewMode === 'preview' ? (
                    <iframe
                      srcDoc={generatedAssets[activeTab]}
                      className={styles.iframe}
                      title={`${activeTab} preview`}
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <pre className={styles.codeView}>
                      <code>{generatedAssets[activeTab]}</code>
                    </pre>
                  )
                ) : (
                  <div className={styles.emptyPreview}>
                    <p>Click Generate to build this asset</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!activeTab && (
            <div className={styles.assetPrompt}>
              <Layers size={32} className={styles.promptIcon} />
              <p>Select an asset type above to generate it</p>
              <p className={styles.promptSub}>Each asset is individually generated — click one to start</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
