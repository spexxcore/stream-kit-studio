import { useState, useRef, useEffect } from 'react'
import { Download, RefreshCw, Eye, Code, Layers, Zap, Layout, Image, ArrowLeft, Monitor, Coffee, Clock, MessageSquare, Play, Film, ChevronDown, ChevronUp, BookOpen, Send, X, Bot } from 'lucide-react'
import styles from './KitPage.module.css'

const ASSET_TYPES = [
  { id: 'overlay', label: 'Stream Overlay', icon: Layout, desc: '1920×1080 live overlay' },
  { id: 'alerts', label: 'Alerts', icon: Zap, desc: 'Follow / Sub / Donation' },
  { id: 'panels', label: 'Panels', icon: Layers, desc: '6 channel info panels' },
  { id: 'banner', label: 'Banner', icon: Image, desc: 'Channel header 1200×480' },
]

const SCENE_TYPES = [
  { id: 'starting-soon', label: 'Starting Soon', icon: Clock, desc: 'Pre-stream countdown screen', obsSetup: ['In OBS, click + under Scenes → name it "Starting Soon"', 'Click + under Sources → Browser', 'Check "Local file" → browse to your starting-soon.html', 'Set Width: 1920, Height: 1080 → Click OK', 'Switch to this scene 5–10 mins before you go live'] },
  { id: 'brb', label: 'BRB', icon: Coffee, desc: 'Be right back screen', obsSetup: ['In OBS, click + under Scenes → name it "BRB"', 'Click + under Sources → Browser', 'Check "Local file" → browse to your brb.html', 'Set Width: 1920, Height: 1080 → Click OK', 'Switch to this scene whenever you step away'] },
  { id: 'ending', label: 'Ending', icon: Film, desc: 'Stream outro screen', obsSetup: ['In OBS, click + under Scenes → name it "Ending"', 'Click + under Sources → Browser', 'Check "Local file" → browse to your ending.html', 'Set Width: 1920, Height: 1080 → Click OK', 'Switch to this scene at the end of your stream'] },
  { id: 'just-chatting', label: 'Just Chatting', icon: MessageSquare, desc: 'Facecam + chat overlay', obsSetup: ['In OBS, click + under Scenes → name it "Just Chatting"', 'Click + under Sources → Browser', 'Check "Local file" → browse to your just-chatting.html', 'Set Width: 1920, Height: 1080', 'Add your webcam source on top of the browser source', 'Resize webcam to fit the designated area in the overlay'] },
  { id: 'live-scene', label: 'Live Scene', icon: Play, desc: 'Main gameplay overlay', obsSetup: ['In OBS, click + under Scenes → name it "Live" or your game name', 'Add your game capture source first', 'Click + under Sources → Browser', 'Check "Local file" → browse to your live-scene.html', 'Set Width: 1920, Height: 1080', 'Browser source must be ABOVE game capture in sources list', 'Add webcam source on top of everything'] },
  { id: 'extra-scene', label: 'Extra Scene', icon: Monitor, desc: 'Bonus / custom screen', obsSetup: ['In OBS, click + under Scenes → name it "Intermission" or similar', 'Click + under Sources → Browser', 'Check "Local file" → browse to your extra-scene.html', 'Set Width: 1920, Height: 1080 → Click OK'] },
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
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', text: 'I can make changes to the current asset. Try: "make the webcam frame thicker", "change the accent color to red", "add a pulsing animation to the logo"...' }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const currentActive = activeTab || activeScene
  const currentIsScene = !!activeScene
  const currentAssetDef = activeTab ? ASSET_TYPES.find(a => a.id === activeTab) : SCENE_TYPES.find(s => s.id === activeScene)

  const generateAsset = async (type, isScene = false) => {
    if (generatedAssets[type]) {
      isScene ? setActiveScene(type) : setActiveTab(type)
      return
    }
    setGenerating(type)
    isScene ? setActiveScene(type) : setActiveTab(type)
    if (isScene) setActiveTab(null); else setActiveScene(null)

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

  const regenAsset = (type, isScene) => {
    setGeneratedAssets(prev => { const n = { ...prev }; delete n[type]; return n })
    generateAsset(type, isScene)
  }

  // Fixed download — uses a link with data URI instead of blob URL
  const downloadAsset = (type) => {
    const html = generatedAssets[type]
    if (!html) return
    const filename = `${brief.brandName.toLowerCase().replace(/\s+/g, '-')}-${type}.html`
    const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
    const a = document.createElement('a')
    a.setAttribute('href', dataUri)
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const downloadImage = (url, name) => {
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', name)
    a.setAttribute('target', '_blank')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Chat: send a change request, get back patched HTML
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentActive || !generatedAssets[currentActive]) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/generate-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          assetType: 'patch',
          currentHtml: generatedAssets[currentActive],
          patchRequest: msg
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedAssets(prev => ({ ...prev, [currentActive]: data.html }))
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Done! Applied: "${msg}". Download again to get the updated file.` }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error: ${e.message}. Try again.` }])
    } finally {
      setChatLoading(false)
    }
  }

  // Scale iframe content to fit preview container
  const iframeRef = useRef(null)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const scale = () => {
      const w = iframe.offsetWidth
      iframe.style.height = `${w * (9/16)}px`
    }
    scale()
    window.addEventListener('resize', scale)
    return () => window.removeEventListener('resize', scale)
  }, [currentActive, generatedAssets])
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
        {/* Sidebar */}
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
            <div className={styles.fontRow}><span className={styles.fontLabel}>Headers</span><span className={styles.fontName}>{brief.fontPrimary}</span></div>
            <div className={styles.fontRow}><span className={styles.fontLabel}>Body</span><span className={styles.fontName}>{brief.fontSecondary}</span></div>
          </section>
          {assets.logoUrl && (
            <section className={styles.sideSection}>
              <h3>Logo</h3>
              <div className={styles.imageCard}>
                <img src={assets.logoUrl} alt="Generated logo" className={styles.generatedImg} />
                <button className={styles.dlBtn} onClick={() => downloadImage(assets.logoUrl, `${brief.brandName}-logo.png`)}>
                  <Download size={13} /> Download PNG
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
                  <Download size={13} /> Download PNG
                </button>
              </div>
            </section>
          )}
        </aside>

        {/* Main */}
        <main className={styles.main}>
          <div className={styles.sectionToggle}>
            <button className={`${styles.sectionBtn} ${activeSection === 'assets' ? styles.sectionActive : ''}`} onClick={() => setActiveSection('assets')}>
              <Layout size={14} /> Stream Assets
            </button>
            <button className={`${styles.sectionBtn} ${activeSection === 'scenes' ? styles.sectionActive : ''}`} onClick={() => setActiveSection('scenes')}>
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
                    <button key={id} className={`${styles.assetTab} ${isActive ? styles.tabActive : ''} ${isReady ? styles.tabReady : ''}`} onClick={() => { setActiveScene(null); generateAsset(id, false) }}>
                      <div className={styles.tabTop}>
                        <Icon size={16} /><span>{label}</span>
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
                <p className={styles.assetDesc}>Generate each scene. After generating, click OBS Setup for step-by-step instructions.</p>
              </div>
              <div className={styles.scenesGrid}>
                {SCENE_TYPES.map(({ id, label, icon: Icon, desc, obsSetup }) => {
                  const isActive = activeScene === id
                  const isReady = !!generatedAssets[id]
                  const isLoading = generating === id
                  const setupOpen = expandedSetup === id
                  return (
                    <div key={id} className={`${styles.sceneCard} ${isActive ? styles.sceneActive : ''} ${isReady ? styles.sceneReady : ''}`}>
                      <div className={styles.sceneTop}>
                        <div className={styles.sceneInfo}>
                          <Icon size={15} className={styles.sceneIcon} />
                          <div><div className={styles.sceneLabel}>{label}</div><div className={styles.sceneDesc}>{desc}</div></div>
                        </div>
                        <div className={styles.sceneBtns}>
                          {isReady && (
                            <>
                              <button className={styles.sceneSetupBtn} onClick={() => setExpandedSetup(setupOpen ? null : id)}>
                                <BookOpen size={12} /> OBS Setup {setupOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
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
                          {isLoading && <div className={styles.sceneGenerating}><span className={styles.loadingDot} /> Generating...</div>}
                        </div>
                      </div>
                      {setupOpen && isReady && (
                        <div className={styles.obsSetup}>
                          <p className={styles.obsSetupTitle}>How to add to OBS:</p>
                          <ol className={styles.obsSteps}>
                            {obsSetup.map((step, i) => (
                              <li key={i} className={styles.obsStep}>
                                <span className={styles.obsStepNum}>{i + 1}</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                          <div className={styles.obsNote}>
                            <span>💡</span> Save the HTML file somewhere permanent — OBS reads it from that location every time you switch scenes.
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Preview area */}
          {currentActive && (
            <div className={styles.previewArea}>
              <div className={styles.previewToolbar}>
                <span className={styles.previewLabel}>{currentAssetDef?.label}</span>
                <div className={styles.viewToggle}>
                  <button className={`${styles.viewBtn} ${viewMode === 'preview' ? styles.viewActive : ''}`} onClick={() => setViewMode('preview')}><Eye size={13} /> Preview</button>
                  <button className={`${styles.viewBtn} ${viewMode === 'code' ? styles.viewActive : ''}`} onClick={() => setViewMode('code')}><Code size={13} /> Code</button>
                </div>
                <div style={{ flex: 1 }} />
                {generatedAssets[currentActive] && (
                  <>
                    <button className={styles.chatToggleBtn} onClick={() => setChatOpen(o => !o)}>
                      <Bot size={13} /> {chatOpen ? 'Close Chat' : 'Request Changes'}
                    </button>
                    <button className={styles.regenBtn} onClick={() => regenAsset(currentActive, currentIsScene)}><RefreshCw size={13} /> Regenerate</button>
                    <button className={styles.downloadBtn} onClick={() => downloadAsset(currentActive)}><Download size={13} /> Download HTML</button>
                  </>
                )}
              </div>

              <div className={styles.previewWithChat}>
                <div className={styles.previewFrame}>
                  {generating === currentActive ? (
                    <div className={styles.generating}>
                      <div className={styles.genRing} />
                      <p>Claude is writing your {currentAssetDef?.label.toLowerCase()}...</p>
                      <p className={styles.genNote}>Building production-ready HTML/CSS with your brand colors</p>
                    </div>
                  ) : generatedAssets[currentActive] ? (
                    viewMode === 'preview' ? (
                      <iframe
                      ref={iframeRef}
                      srcDoc={generatedAssets[currentActive]}
                      className={styles.iframe}
                      title={`${currentActive} preview`}
                      sandbox="allow-scripts"
                    />
                    ) : (
                      <pre className={styles.codeView}><code>{generatedAssets[currentActive]}</code></pre>
                    )
                  ) : (
                    <div className={styles.emptyPreview}><p>Generating...</p></div>
                  )}
                </div>

                {/* Chat panel */}
                {chatOpen && (
                  <div className={styles.chatPanel}>
                    <div className={styles.chatHeader}>
                      <Bot size={14} className={styles.chatIcon} />
                      <span>Request Changes</span>
                      <button className={styles.chatClose} onClick={() => setChatOpen(false)}><X size={14} /></button>
                    </div>
                    <div className={styles.chatMessages}>
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`${styles.chatMsg} ${m.role === 'user' ? styles.chatUser : styles.chatBot}`}>
                          {m.text}
                        </div>
                      ))}
                      {chatLoading && (
                        <div className={`${styles.chatMsg} ${styles.chatBot}`}>
                          <span className={styles.chatTyping}><span /><span /><span /></span>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>
                    <div className={styles.chatInputRow}>
                      <input
                        className={styles.chatInput}
                        placeholder="e.g. make the border thicker, change green to red..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                        disabled={chatLoading}
                      />
                      <button className={styles.chatSendBtn} onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
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
