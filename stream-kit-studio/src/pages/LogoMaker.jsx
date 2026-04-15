import { useState, useRef } from 'react'
import { Upload, X, Wand2, Download, RefreshCw, Sliders, ImagePlus } from 'lucide-react'
import styles from './LogoMaker.module.css'

const PRESET_PROMPTS = [
  { label: 'Matrix Operative', value: 'gorilla in a black suit and tie wearing dark sunglasses with Matrix green binary code reflected in lenses, silver hexagon badge frame with green glowing edges, dark menacing expression, Matrix code rain background' },
  { label: 'Tactical Badge', value: 'aggressive gorilla mascot, military tactical gear, hexagon emblem frame, dark and gritty, esports badge style, chrome accents' },
  { label: 'Cyber Hacker', value: 'gorilla with cyberpunk aesthetic, neon green circuit patterns, glowing eyes, dark hooded jacket, digital glitch effects, tech emblem' },
  { label: 'From Scratch', value: '' },
]

const STRENGTH_LABELS = {
  0.3: 'Subtle — keeps most of original',
  0.5: 'Balanced — evolves the original',
  0.75: 'Bold — major style change',
  0.95: 'Extreme — only loose reference',
}

export default function LogoMaker() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedBase64, setUploadedBase64] = useState(null)
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].value)
  const [strength, setStrength] = useState(0.75)
  const [mode, setMode] = useState('img2img')
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [selectedPreset, setSelectedPreset] = useState(0)
  const fileInputRef = useRef(null)

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result)
      setUploadedBase64(ev.target.result.split(',')[1])
      setMode('img2img')
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setUploadedImage(null)
    setUploadedBase64(null)
    setMode('txt2img')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const generate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setError(null)
    setResults([])

    try {
      const res = await fetch('/.netlify/functions/logo-maker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBase64: uploadedBase64,
          strength,
          mode: uploadedBase64 ? 'img2img' : 'txt2img'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResults(data.images || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const downloadImage = async (url, index) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `logo-variation-${index + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback — open in new tab
      window.open(url, '_blank')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1>Logo Maker</h1>
          <p>Upload your existing logo and describe changes, or generate from scratch. Gets 4 variations per run.</p>
        </div>

        <div className={styles.layout}>
          {/* Left — controls */}
          <div className={styles.controls}>

            {/* Upload */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Reference Logo <span className={styles.opt}>optional</span></div>
              {uploadedImage ? (
                <div className={styles.uploadedWrap}>
                  <img src={uploadedImage} alt="Reference" className={styles.uploadedImg} />
                  <div className={styles.uploadedMeta}>
                    <span className={styles.uploadedTag}>Using as reference</span>
                    <button className={styles.clearBtn} onClick={clearImage}><X size={13} /> Remove</button>
                  </div>
                </div>
              ) : (
                <div className={styles.dropZone} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} className={styles.dropIcon} />
                  <span>Click to upload your logo</span>
                  <span className={styles.dropSub}>PNG or JPG — AI will evolve it</span>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleUpload} style={{ display: 'none' }} />
                </div>
              )}
            </div>

            {/* Strength slider — only show when image uploaded */}
            {uploadedBase64 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}><Sliders size={13} /> Style Strength</div>
                <input
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  value={strength}
                  onChange={e => setStrength(parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <div className={styles.sliderMeta}>
                  <span className={styles.sliderValue}>{Math.round(strength * 100)}%</span>
                  <span className={styles.sliderLabel}>{STRENGTH_LABELS[Object.keys(STRENGTH_LABELS).reduce((a, b) => Math.abs(b - strength) < Math.abs(a - strength) ? b : a)]}</span>
                </div>
              </div>
            )}

            {/* Preset prompts */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Quick Presets</div>
              <div className={styles.presets}>
                {PRESET_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className={`${styles.presetBtn} ${selectedPreset === i ? styles.presetActive : ''}`}
                    onClick={() => { setSelectedPreset(i); if (p.value) setPrompt(p.value) }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Describe your logo</div>
              <textarea
                className={styles.promptBox}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. gorilla in a black suit wearing sunglasses with Matrix green code reflected in lenses, silver hexagon badge frame, dark background..."
                rows={5}
              />
              <div className={styles.promptTips}>
                <span>Tips:</span> Be specific about character, outfit, colors, frame shape, background, mood
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.generateBtn}
              onClick={generate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <><span className={styles.btnSpinner} /> Generating 4 variations...</>
              ) : (
                <><Wand2 size={16} /> Generate Logos</>
              )}
            </button>

            {results.length > 0 && (
              <button className={styles.regenBtn} onClick={generate} disabled={generating}>
                <RefreshCw size={14} /> Regenerate All
              </button>
            )}
          </div>

          {/* Right — results */}
          <div className={styles.results}>
            {generating ? (
              <div className={styles.generatingState}>
                <div className={styles.genGrid}>
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`${styles.skeleton} ${styles.skeletonImg}`} style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className={styles.genMsg}>Generating 4 logo variations with Flux AI...</p>
                <p className={styles.genSub}>This takes 20–40 seconds</p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className={styles.resultsHeader}>
                  <span>{results.length} variations generated</span>
                  <span className={styles.resultsHint}>Click any image to download</span>
                </div>
                <div className={styles.imgGrid}>
                  {results.map((url, i) => (
                    <div key={i} className={styles.imgCard}>
                      <img src={url} alt={`Variation ${i + 1}`} className={styles.resultImg} />
                      <div className={styles.imgOverlay}>
                        <button className={styles.imgDownloadBtn} onClick={() => downloadImage(url, i)}>
                          <Download size={14} /> Download
                        </button>
                      </div>
                      <div className={styles.imgLabel}>Variation {i + 1}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <ImagePlus size={40} className={styles.emptyIcon} />
                <p>Your logo variations will appear here</p>
                <p className={styles.emptySub}>Upload a reference logo and describe what you want, then hit Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
