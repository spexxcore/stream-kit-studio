import { useState } from 'react'
import { Download, RefreshCw, Eye, Code, Layers, Zap, Layout, Image, ArrowLeft, Monitor, Coffee, Clock, MessageSquare, Play, Film, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import styles from './KitPage.module.css'

const ASSET_TYPES = [
  { id: 'overlay', label: 'Stream Overlay', icon: Layout, desc: '1920×1080 live overlay' },
  { id: 'alerts', label: 'Alerts', icon: Zap, desc: 'Follow / Sub / Donation' },
  { id: 'panels', label: 'Panels', icon: Layers, desc: '6 channel info panels' },
  { id: 'banner', label: 'Banner', icon: Image, desc: 'Channel header 1200×480' },
]

const SCENE_TYPES = [
  {
    id: 'starting-soon',
    label: 'Starting Soon',
    icon: Clock,
    desc: 'Pre-stream countdown screen',
    obsSetup: [
      'In OBS, click the + under Scenes and name it "Starting Soon"',
      'Click + under Sources → Browser',
      'Check "Local file" and browse to your starting-soon.html file',
      'Set Width: 1920, Height: 1080',
      'Click OK — you\'re done',
      'Switch to this scene 5–10 mins before you go live',
    ]
  },
  {
    id: 'brb',
    label: 'BRB',
    icon: Coffee,
    desc: 'Be right back screen',
    obsSetup: [
      'In OBS, click the + under Scenes and name it "BRB"',
      'Click + under Sources → Browser',
      'Check "Local file" and browse to your brb.html file',
      'Set Width: 1920, Height: 1080',
      'Click OK',
      'Switch to this scene whenever you step away',
    ]
  },
  {
    id: 'ending',
    label: 'Ending',
    icon: Film,
    desc: 'Stream outro screen',
    obsSetup: [
      'In OBS, click the + under Scenes and name it "Ending"',
      'Click + under Sources → Browser',
      'Check "Local file" and browse to your ending.html file',
      'Set Width: 1920, Height: 1080',
      'Click OK',
      'Switch to this scene at the end of your stream before stopping',
    ]
  },
  {
    id: 'just-chatting',
    label: 'Just Chatting',
    icon: MessageSquare,
    desc: 'Facecam + chat overlay',
    obsSetup: [
      'In OBS, click the + under Scenes and name it "Just Chatting"',
      'Click + under Sources → Browser',
      'Check "Local file" and browse to your just-chatting.html file',
      'Set Width: 1920, Height: 1080',
      'Add your webcam source on top of the browser source',
      'Resize your webcam to fit the designated webcam area in the overlay',
    ]
  },
  {
    id: 'live-scene',
    label: 'Live Scene',
    icon: Play,
    desc: 'Main gameplay overlay',
    obsSetup: [
      'In OBS, click the + under Scenes and name it "Live" or your game name',
      'Add your game capture or window capture source first',
      'Click + under Sources → Browser',
      'Check "Local file" and browse to your live-scene.html file',
      'Set Width: 1920, Height: 1080',
      'Make sure the browser source is ABOVE your game capture in the sources list',
      'Add your webcam source on top of everything',
    ]
  },
  {
    id: 'extra-scene',
    label: 'Extra Scene',
    icon: Monitor,
    desc: 'Bonus / custom screen',
    obsSetup: [
      'In OBS, click the + under Scenes and name it whatever fits (e.g. "Intermission")',
      'Click + under Sources → Browser',
      'Check "Local file" and browse to your extra-scene.html file',
      'Set Width: 1920, Height: 1080',
      'Click OK — use this for intermissions, raids, special events, etc.',
    ]
  },
]

export default function KitPage({ kitData, onReset }) {
  const { brief, assets } = kitData
  const [activeTab, setActiveTab] = useState(null)
  const [activeScene, setActiveScene] = useState(null)
  const [generatedAssets, setGeneratedAssets] = useState({})
  const [generating, setGenerating] = useState(null)
  const [viewMode, setViewMode] = useState('preview')
  const [expandedSetup, setExpandedSetup] = useState(null)
  const [activeSection, setActiveSection] = useState('assets')

  const generateAsset = async (type, isScene = false) => {
    if (generatedAssets[type]) {
      isScene ? setActiveScene(type) : setActiveTab(type)
      return
    }
    setGenerating(type)
    isScene ? setActiveScene(type) : setActiveTab(type)
    if (isScene) setActiveTab(null)
    else setActiveScene(null)

    try {
      const res = await fetch('/api/generate-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, assetType: type })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedAssets(prev => ({ ...prev, [type]: data.html }))
    } catch (e) {
      setGeneratedAssets(prev => ({ ...prev, [type]: `<!DOCTYPE html><html><body style="background:#0d0d0d;color:#f85149;font-family:monospace;padding:20px;"><p>Error: ${e.message}</p><p style="color:#6e7681;font-size:12px;margin-top:8px;">Try clicking Regenerate</p></body></html>` }))
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

  const regenAsset = (type, isScene) => {
    setGeneratedAssets(prev => { const n = {...prev}; delete n[type]; return n })
    generateAsset(type, isScene)
  }

  const currentActive = activeTab || activeScene
  const currentIsScene = !!activeScene
  const currentAssetDef = activeTab
    ? ASSET_TYPES.find(a => a.id === activeTab)
    : SCENE_TYPES.find(s => s.id === activeScene)

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

        <main className={styles.main}>
          {/* Section toggle */}
          <div className={styles.sectionToggle}>
            <button
              className={`${styles.sectionBtn} ${activeSection === 'assets' ? styles.sectionActive : ''}`}
              onClick={() => setActiveSection('assets')}
            >
              <Layout size={14} /> Stream Assets
            </button>
            <button
              className={`${styles.sectionBtn} ${activeSection === 'scenes' ? styles.sectionActive : ''}`}
              onClick={() => setActiveSection('scenes')}
            >
              <Monitor size={14} /> OBS Scenes
            </button>
          </div>

          {/* ASSETS */}
          {activeSection === 'assets' && (
            <>
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
                      onClick={() => { setActiveScene(null); generateAsset(id, false) }}
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
            </>
          )}

          {/* SCENES */}
          {activeSection === 'scenes' && (
            <>
              <div className={styles.assetHeader}>
                <h2>OBS Scenes</h2>
                <p className={styles.assetDesc}>Generate each scene screen. Click OBS Setup after generating to see step-by-step instructions.</p>
              </div>
              <div className={styles.scenesGrid}>
                {SCENE_TYPES.map(({ id, label, icon: Icon, desc }) => {
                  const isActive = activeScene === id
                  const isReady = !!generatedAssets[id]
                  const isLoading = generating === id
                  const setupOpen = expandedSetup === id
                  return (
                    <div key={id} className={`${styles.sceneCard} ${isActive ? styles.sceneActive : ''} ${isReady ? styles.sceneReady : ''}`}>
                      <div className={styles.sceneTop}>
                        <div className={styles.sceneInfo}>
                          <Icon size={15} className={styles.sceneIcon} />
                          <div>
                            <div className={styles.sceneLabel}>{label}</div>
                            <div className={styles.sceneDesc}>{desc}</div>
                          </div>
                        </div>
                        <div className={styles.sceneBtns}>
                          {isReady && (
                            <>
                              <button className={styles.sceneSetupBtn} onClick={() => setExpandedSetup(setupOpen ? null : id)}>
                                <BookOpen size={12} />
                                OBS Setup
                                {setupOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                              <button className={styles.sceneDownloadBtn} onClick={() => downloadAsset(id)}>
                                <Download size={12} /> Download
                              </button>
                              <button className={styles.scenePreviewBtn} onClick={() => { setActiveScene(id); setActiveTab(null) }}>
                                <Eye size={12} /> Preview
                              </button>
                            </>
                          )}
                          {!isReady && !isLoading && (
                            <button className={styles.sceneGenerateBtn} onClick={() => { setActiveTab(null); generateAsset(id, true) }}>
                              <Zap size={12} /> Generate
                            </button>
                          )}
                          {isLoading && (
                            <div className={styles.sceneGenerating}>
                              <span className={styles.loadingDot} /> Generating...
                            </div>
                          )}
                        </div>
                      </div>

                      {setupOpen && isReady && (
                        <div className={styles.obsSetup}>
                          <p className={styles.obsSetupTitle}>How to add to OBS:</p>
                          <ol className={styles.obsSteps}>
                            {SCENE_TYPES.find(s => s.id === id).obsSetup.map((step, i) => (
                              <li key={i} className={styles.obsStep}>
                                <span className={styles.obsStepNum}>{i + 1}</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                          <div className={styles.obsNote}>
                            <span>💡</span>
                            Save the HTML file somewhere permanent — OBS reads it from that location every time you switch scenes.
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Preview — shared */}
          {currentActive && (
            <div className={styles.previewArea}>
              <div className={styles.previewToolbar}>
                <span className={styles.previewLabel}>{currentAssetDef?.label}</span>
                <div className={styles.viewToggle}>
                  <button className={`${styles.viewBtn} ${viewMode === 'preview' ? styles.viewActive : ''}`} onClick={() => setViewMode('preview')}>
                    <Eye size={13} /> Preview
                  </button>
                  <button className={`${styles.viewBtn} ${viewMode === 'code' ? styles.viewActive : ''}`} onClick={() => setViewMode('code')}>
                    <Code size={13} /> Code
                  </button>
                </div>
                <div style={{ flex: 1 }} />
                {generatedAssets[currentActive] && (
                  <>
                    <button className={styles.regenBtn} onClick={() => regenAsset(currentActive, currentIsScene)}>
                      <RefreshCw size={13} /> Regenerate
                    </button>
                    <button className={styles.downloadBtn} onClick={() => downloadAsset(currentActive)}>
                      <Download size={13} /> Download HTML
                    </button>
                  </>
                )}
              </div>
              <div className={styles.previewFrame}>
                {generating === currentActive ? (
                  <div className={styles.generating}>
                    <div className={styles.genRing} />
                    <p>Claude is writing your {currentAssetDef?.label.toLowerCase()}...</p>
                    <p className={styles.genNote}>Building production-ready HTML/CSS with your brand colors</p>
                  </div>
                ) : generatedAssets[currentActive] ? (
                  viewMode === 'preview' ? (
                    <iframe srcDoc={generatedAssets[currentActive]} className={styles.iframe} title={`${currentActive} preview`} sandbox="allow-scripts" />
                  ) : (
                    <pre className={styles.codeView}><code>{generatedAssets[currentActive]}</code></pre>
                  )
                ) : (
                  <div className={styles.emptyPreview}><p>Generating...</p></div>
                )}
              </div>
            </div>
          )}

          {!currentActive && (
            <div className={styles.assetPrompt}>
              <Layers size={32} className={styles.promptIcon} />
              <p>{activeSection === 'scenes' ? 'Click Generate on any scene above' : 'Select an asset type above to generate it'}</p>
              <p className={styles.promptSub}>Each asset is individually generated — click one to start</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
