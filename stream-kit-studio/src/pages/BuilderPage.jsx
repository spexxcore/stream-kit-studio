import { useState, useRef } from 'react'
import { Sparkles, Zap, Layers, ChevronRight, Upload, X } from 'lucide-react'
import styles from './BuilderPage.module.css'

const VIBES = [
  { id: 'matrix', label: 'Matrix / Cyber', emoji: '🟢', desc: 'Green code rain, dark terminal' },
  { id: 'neon-noir', label: 'Neon Noir', emoji: '🟣', desc: 'Purple & pink, synthwave city' },
  { id: 'military', label: 'Military / Tactical', emoji: '🪖', desc: 'Gritty, dark camo, combat' },
  { id: 'fire', label: 'Fire & Rage', emoji: '🔥', desc: 'Red/orange flames, aggressive' },
  { id: 'ice', label: 'Ice / Cryo', emoji: '🧊', desc: 'Cold blue, frozen shards' },
  { id: 'galaxy', label: 'Galaxy / Space', emoji: '🌌', desc: 'Deep space, nebula colors' },
  { id: 'nature', label: 'Nature / Forest', emoji: '🌿', desc: 'Earthy greens, organic' },
  { id: 'gold', label: 'Gold / Luxury', emoji: '👑', desc: 'Black & gold, premium feel' },
  { id: 'custom', label: 'Custom / Describe', emoji: '✏️', desc: 'Tell us your vision' },
]

const STYLES = [
  { id: 'esports', label: 'Esports Pro' },
  { id: 'anime', label: 'Anime / Manga' },
  { id: 'retro', label: 'Retro / Pixel' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'cartoon', label: 'Cartoon / Bold' },
  { id: 'realistic', label: 'Realistic / Dark' },
]

export default function BuilderPage({ onKitGenerated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    brandName: '', mascot: '', colors: '', vibe: '', vibeCustom: '', style: 'esports', streamPlatform: 'Twitch',
    extraDetails: '', logoBase64: '', logoPreview: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingMsg, setLoadingMsg] = useState('')
  const fileInputRef = useRef(null)

  const loadingMsgs = [
    'Asking Claude to build your brand brief...',
    'Crafting your visual identity...',
    'Generating logo with Flux AI...',
    'Painting your mascot...',
    'Finalizing your kit...',
  ]

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1]
      setForm(f => ({ ...f, logoBase64: base64, logoPreview: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const clearLogo = () => {
    setForm(f => ({ ...f, logoBase64: '', logoPreview: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canNext = () => {
    if (step === 1) return form.brandName.trim().length > 1
    if (step === 2) return !!form.vibe
    if (step === 3) return !!form.style
    return true
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    let msgIdx = 0
    setLoadingMsg(loadingMsgs[0])
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMsgs.length
      setLoadingMsg(loadingMsgs[msgIdx])
    }, 3500)

    try {
      const res = await fetch('/.netlify/functions/generate-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vibe: form.vibe === 'custom' ? form.vibeCustom : form.vibe
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      onKitGenerated(data)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingInner}>
          <div className={styles.loadingRing}>
            <div className={styles.loadingRingInner} />
          </div>
          <p className={styles.loadingMsg}>{loadingMsg}</p>
          <p className={styles.loadingNote}>This takes 20–40 seconds — we're building your full kit</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Layers size={20} className={styles.logoIcon} />
          <span>Stream Kit Studio</span>
        </div>
        <div className={styles.tagline}>AI-powered stream branding in minutes</div>
      </header>

      <main className={styles.main}>
        {/* Progress */}
        <div className={styles.progress}>
          {[1,2,3,4].map(n => (
            <div key={n} className={`${styles.progressStep} ${step >= n ? styles.active : ''} ${step > n ? styles.done : ''}`}>
              <div className={styles.progressDot}>{step > n ? '✓' : n}</div>
              <span>{['Brand', 'Vibe', 'Style', 'Launch'][n-1]}</span>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          {/* Step 1: Brand basics */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2>What's your brand?</h2>
              <p className={styles.stepDesc}>Tell us the basics about your stream identity</p>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>Brand / Channel Name <span className={styles.req}>*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. TheRealLowlife, DownBad, NightOwl..."
                    value={form.brandName}
                    onChange={e => set('brandName', e.target.value)}
                    className={styles.input}
                    autoFocus
                  />
                </div>
                <div className={styles.field}>
                  <label>Mascot / Character <span className={styles.opt}>optional</span></label>
                  <input
                    type="text"
                    placeholder="e.g. gorilla, skeleton, wolf, demon..."
                    value={form.mascot}
                    onChange={e => set('mascot', e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label>Color Preferences <span className={styles.opt}>optional</span></label>
                  <input
                    type="text"
                    placeholder="e.g. dark green + white, all black, blood red..."
                    value={form.colors}
                    onChange={e => set('colors', e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label>Platform</label>
                  <select value={form.streamPlatform} onChange={e => set('streamPlatform', e.target.value)} className={styles.input}>
                    <option>Twitch</option>
                    <option>YouTube</option>
                    <option>Kick</option>
                    <option>TikTok Live</option>
                    <option>Multi-platform</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Existing Logo <span className={styles.opt}>optional — upload to use as reference</span></label>
                  {form.logoPreview ? (
                    <div className={styles.logoPreviewWrap}>
                      <img src={form.logoPreview} alt="Uploaded logo" className={styles.logoPreview} />
                      <button className={styles.clearLogo} onClick={clearLogo}><X size={14} /> Remove</button>
                    </div>
                  ) : (
                    <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                      <Upload size={18} className={styles.uploadIcon} />
                      <span>Click to upload your logo</span>
                      <span className={styles.uploadSub}>PNG, JPG — AI will use it as style reference</span>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Additional Details <span className={styles.opt}>optional</span></label>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    placeholder="e.g. Keep the hexagon frame from my old logo, add Matrix green code rain, gorilla in a suit with shades, reflect code in the lenses..."
                    value={form.extraDetails}
                    onChange={e => set('extraDetails', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Vibe */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2>Pick your vibe</h2>
              <p className={styles.stepDesc}>This sets the entire visual direction of your kit</p>
              <div className={styles.vibeGrid}>
                {VIBES.map(v => (
                  <button
                    key={v.id}
                    className={`${styles.vibeCard} ${form.vibe === v.id ? styles.vibeSelected : ''}`}
                    onClick={() => set('vibe', v.id)}
                  >
                    <span className={styles.vibeEmoji}>{v.emoji}</span>
                    <span className={styles.vibeLabel}>{v.label}</span>
                    <span className={styles.vibeDesc}>{v.desc}</span>
                  </button>
                ))}
              </div>
              {form.vibe === 'custom' && (
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Describe your vibe in detail... e.g. 'Matrix-style with green code rain, dark background, gorilla in a suit with shades'"
                  value={form.vibeCustom}
                  onChange={e => set('vibeCustom', e.target.value)}
                  rows={3}
                />
              )}
            </div>
          )}

          {/* Step 3: Art style */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <h2>Art style</h2>
              <p className={styles.stepDesc}>How should your logo and mascot be illustrated?</p>
              <div className={styles.styleGrid}>
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    className={`${styles.styleBtn} ${form.style === s.id ? styles.styleSelected : ''}`}
                    onClick={() => set('style', s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review + launch */}
          {step === 4 && (
            <div className={styles.stepContent}>
              <h2>Ready to generate</h2>
              <p className={styles.stepDesc}>Here's what we're building for <strong>{form.brandName}</strong></p>
              <div className={styles.summary}>
                <div className={styles.summaryRow}><span>Vibe</span><span>{form.vibe === 'custom' ? form.vibeCustom : VIBES.find(v=>v.id===form.vibe)?.label}</span></div>
                {form.mascot && <div className={styles.summaryRow}><span>Mascot</span><span>{form.mascot}</span></div>}
                {form.colors && <div className={styles.summaryRow}><span>Colors</span><span>{form.colors}</span></div>}
                <div className={styles.summaryRow}><span>Style</span><span>{STYLES.find(s=>s.id===form.style)?.label}</span></div>
                <div className={styles.summaryRow}><span>Platform</span><span>{form.streamPlatform}</span></div>
                {form.extraDetails && <div className={styles.summaryRow}><span>Notes</span><span className={styles.summaryNote}>{form.extraDetails}</span></div>}
                {form.logoPreview && <div className={styles.summaryRow}><span>Logo ref</span><img src={form.logoPreview} alt="logo" className={styles.summaryLogo} /></div>}
              </div>
              <div className={styles.kitList}>
                <p className={styles.kitListTitle}>Your kit will include:</p>
                {['Logo (AI generated)', 'Mascot art (if specified)', 'Main stream overlay (HTML)', 'Alert animations (HTML)', 'Channel panels (HTML)', 'Banner (HTML)'].map(item => (
                  <div key={item} className={styles.kitListItem}>
                    <span className={styles.checkDot} />
                    {item}
                  </div>
                ))}
              </div>
              {error && <div className={styles.error}>{error}</div>}
            </div>
          )}

          {/* Nav buttons */}
          <div className={styles.nav}>
            {step > 1 && (
              <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 4 ? (
              <button
                className={styles.nextBtn}
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button className={styles.generateBtn} onClick={handleGenerate}>
                <Sparkles size={16} />
                Generate My Kit
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
