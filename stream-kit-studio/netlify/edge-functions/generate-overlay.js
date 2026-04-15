const streamClaude = async (ANTHROPIC_KEY, model, system, userContent, maxTokens = 8000) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: 'user', content: userContent }]
    })
  })

  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6).trim())
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            text += parsed.delta.text
          }
        } catch {}
      }
    }
  }
  return text
}

const cleanHtml = (raw) => {
  let html = raw.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const di = html.indexOf('<!DOCTYPE')
  if (di > 0) html = html.slice(di)
  else {
    const hi = html.indexOf('<html')
    if (hi > 0) html = html.slice(hi)
  }
  return html
}

const SYSTEM = `You are a world-class stream overlay designer and frontend developer. You create stunning, professional, production-ready stream overlays used by top streamers. Your HTML files are self-contained, visually impressive, and technically perfect. Always start with <!DOCTYPE html>. No markdown, no backticks, no commentary — ONLY the HTML file.`

const buildPrompt = (brief, assetType) => {
  const b = brief
  const font = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(b.fontPrimary)}:wght@400;600;700;900&family=${encodeURIComponent(b.fontSecondary)}&display=swap`
  const colors = `Primary: ${b.primaryColor} | Secondary: ${b.secondaryColor} | Accent: ${b.accentColor} | Background: ${b.backgroundColor}`
  const brand = `Brand: "${b.brandName}" | Vibe: ${b.brandSummary} | Overlay style: ${b.overlayStyle}`

  const shared = `
BRAND: ${brand}
COLORS: ${colors}
FONTS: Import from ${font} — use ${b.fontPrimary} for headings, ${b.fontSecondary} for body
QUALITY REQUIREMENTS:
- Pixel-perfect, professional esports quality
- Rich CSS animations using @keyframes (no JS animation libraries)
- Sharp typography with letter-spacing and proper hierarchy  
- Glowing effects using box-shadow and text-shadow with the accent color
- Subtle scanline or noise texture using CSS gradients
- All colors must match the brand exactly — no generic colors`

  const prompts = {
    overlay: `Create a STUNNING 1920x1080 stream overlay HTML file for OBS browser source.
${shared}

LAYOUT (precise pixel positions):
- body { background: transparent; margin: 0; width: 1920px; height: 1080px; overflow: hidden; position: relative; }
- TOP BAR: Full width strip, 60px tall at top. Brand name "${b.brandName}" left-aligned, animated accent right side
- BOTTOM BAR: Full width strip, 80px tall at bottom. Contains: game info placeholder left, viewer/follower count placeholders center, social handle right
- WEBCAM FRAME: Bottom-left corner, 340px × 255px box. Decorative border with corner accents and brand color glow. Inner area completely transparent (cutout for webcam)
- CORNER ACCENTS: Decorative L-shaped brackets at all 4 screen corners, 40px each side
- CENTER: Completely empty/transparent for game capture

VISUAL DETAILS:
- Animated scanline effect sweeping across bars
- Pulsing glow on webcam frame border
- Small animated logo/brand mark in top-right
- "LIVE" indicator badge with pulse animation
- Matrix-style binary/code rain effect subtly in background of bars only`,

    alerts: `Create a stream alerts HTML file with 3 professional alert animations.
${shared}

Create ONE file with all 3 alerts. Include a preview panel with 3 trigger buttons at the top.

ALERT 1 — FOLLOW ALERT (600×150px popup):
- Slides in from right with bounce
- Icon + "NEW FOLLOWER" text + follower name placeholder
- Glitch/scan effect on entry, fade out after 4 seconds

ALERT 2 — SUBSCRIPTION ALERT (600×180px popup):  
- Dramatic entrance from top with shake
- "NEW SUBSCRIBER" + name + tier badge
- Particle burst effect using CSS, hold 5 seconds

ALERT 3 — DONATION/BITS ALERT (600×200px popup):
- Explosive entrance with scale pulse
- Amount displayed large, message text below
- Gold/accent color highlight, 6 second display

TECHNICAL:
- Each alert: position fixed, transparent background, centered
- Use CSS @keyframes for ALL animations
- Preview buttons trigger the animation cycle
- Alerts auto-reset after display duration`,

    panels: `Create 6 Twitch channel panels as a single HTML file.
${shared}

LAYOUT: 3-column grid, each panel exactly 320px wide. Page has dark background for screenshot.

PANEL 1 — ABOUT ME: Brand bio, "TheRealLowlife is..." placeholder text, mascot area
PANEL 2 — SCHEDULE: Weekly stream schedule table, days/times, styled rows  
PANEL 3 — SOCIAL LINKS: Discord, Twitter/X, YouTube, TikTok — each with icon (Unicode or CSS) and handle placeholder
PANEL 4 — PC SPECS: CPU, GPU, RAM, Monitor — two-column list with labels
PANEL 5 — COMMANDS: !commands list in monospace font — !discord, !socials, !clip etc
PANEL 6 — SUPPORT: Donate/Sub/Follow CTA — big button-style layout

VISUAL:
- Each panel has header bar with accent color glow
- Consistent border, corner radius, background
- Add "Download All as ZIP" button using JSZip from CDN`,

    banner: `Create a Twitch/YouTube channel banner HTML file.
${shared}

CANVAS: Exactly 1200px × 480px div, centered on page with screenshot button.

DESIGN:
- Full bleed background with animated CSS pattern (grid, matrix rain, or geometric)  
- Brand name "${b.brandName}" as massive hero text, centered or left-third
- Tagline from brand summary, smaller below name
- Right third: stream schedule placeholder ("LIVE MON WED FRI" etc)
- Social handles row at bottom
- Subtle animated particles or code rain

TECHNICAL:
- Screenshot/download button using html2canvas from cdnjs CDN
- Button triggers download of the 1200×480 banner as PNG`,

    'starting-soon': `Create a full-screen 1920×1080 "Starting Soon" stream scene.
${shared}

BACKGROUND: Solid ${b.backgroundColor}. Animated matrix code rain columns using CSS (green characters falling). Add subtle grid overlay.

LAYOUT:
- Center: Large "STARTING SOON" text with glow animation, font: ${b.fontPrimary}
- Brand name "${b.brandName}" above it, smaller but bold  
- Animated horizontal line under the heading
- Countdown timer area (static "STREAM STARTING SOON" text with pulsing dots)
- Bottom: Social handles row — "Follow @${b.brandName} for notifications"
- Corner decorative brackets

ANIMATIONS:
- Code rain continuously falling in background
- Heading text has subtle glitch flicker every few seconds
- Pulsing glow on main title
- Scanline sweep effect`,

    brb: `Create a full-screen 1920×1080 BRB (Be Right Back) stream scene.
${shared}

BACKGROUND: Solid ${b.backgroundColor}. Slow animated geometric pattern or pulse rings.

LAYOUT:
- Center: Large "BRB" with huge bold styling and glow
- Subtitle: "BE RIGHT BACK" smaller below
- Brand name "${b.brandName}" in top-left corner with small accent
- Ambient message: "Grabbing a snack / smoke break / bathroom" rotating with CSS animation
- Progress bar or pulsing element to show "still here"
- Bottom: "Follow so you don't miss the stream" 

ANIMATIONS:
- BRB text has idle breathing/pulse animation
- Background has slow moving geometric shapes
- Rotating subtitle messages`,

    ending: `Create a full-screen 1920×1080 stream ending/outro scene.
${shared}

BACKGROUND: Solid ${b.backgroundColor}. Elegant fading particle effect.

LAYOUT:
- Center top: "THANKS FOR WATCHING" with large styled text
- Brand name "${b.brandName}" below it prominently  
- Social grid: 4 boxes for Discord / Twitter / YouTube / TikTok — each with platform name and "@handle" placeholder
- "See you next time" tagline
- Stream stats placeholders: "X hours streamed" "X viewers" etc
- Animated underline/accent elements

ANIMATIONS:
- Text fade-in sequence on load
- Social boxes staggered entrance
- Subtle particle or sparkle effect`,

    'just-chatting': `Create a full-screen 1920×1080 Just Chatting stream overlay.
${shared}

body { background: transparent; margin: 0; width: 1920px; height: 1080px; overflow: hidden; position: relative; }

LAYOUT:
- WEBCAM FRAME: Bottom-left, 420px × 315px. Heavy decorative border with glow. Corner L-brackets. Label "CAM" or brand mark above it. Inner area transparent.
- TOP-RIGHT: Brand name "${b.brandName}" + "JUST CHATTING" badge
- RIGHT SIDE (narrow strip): Optional animated accent element
- BOTTOM: Slim info bar — social handle + "follow" CTA
- Rest of screen: Transparent

VISUAL:
- Webcam frame has animated corner glow
- "JUST CHATTING" badge has pulse animation
- Subtle floating particles in non-gameplay areas`,

    'live-scene': `Create a full-screen 1920×1080 live gameplay stream overlay.
${shared}

body { background: transparent; margin: 0; width: 1920px; height: 1080px; overflow: hidden; position: relative; }
THE ENTIRE CENTER must be transparent — game capture shows through.

LAYOUT:
- TOP BAR: 55px strip. Left: brand name "${b.brandName}" + animated dot. Right: "LIVE" badge + subtle info
- BOTTOM BAR: 70px strip. Left: current game placeholder. Center: viewer count. Right: social handle
- BOTTOM-LEFT WEBCAM FRAME: 300px × 225px. Decorative branded border, transparent inner area
- CORNER BRACKETS: All 4 corners, L-shaped, 35px, accent color with glow
- Thin border lines connecting corners along screen edges (very subtle)

VISUAL:
- LIVE badge pulses red/accent
- Bars have slight dark semi-transparent background (rgba)
- Corner brackets glow softly`,

    'extra-scene': `Create a full-screen 1920×1080 intermission/extra stream scene.
${shared}

BACKGROUND: Solid ${b.backgroundColor}. Animated geometric pattern.

LAYOUT:  
- Center: "INTERMISSION" large styled heading
- Brand name "${b.brandName}" prominently above
- Fun rotating messages: "Bathroom break" / "Getting snacks" / "Tech issues (lol)" — CSS animation cycling
- Animated loading bar or hourglass using CSS
- Bottom: "Back soon — follow @${b.brandName}"

ANIMATIONS:
- Rotating messages with fade in/out
- Loading bar loops
- Background pattern slowly shifts`
  }

  return prompts[assetType] || null
}

export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const ANTHROPIC_KEY = Netlify.env.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { brief, assetType, currentHtml, patchRequest } = body

  try {
    // PATCH — apply chat change request to existing HTML
    if (assetType === 'patch') {
      if (!currentHtml || !patchRequest) {
        return new Response(JSON.stringify({ error: 'Missing currentHtml or patchRequest' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        })
      }
      const patched = await streamClaude(
        ANTHROPIC_KEY,
        'claude-haiku-4-5-20251001',
        `You are an expert frontend developer. You will receive an HTML stream overlay file and a change request. Make ONLY the requested change and return the COMPLETE updated HTML file. Do not add commentary. Start with <!DOCTYPE html>.`,
        `CHANGE REQUEST: ${patchRequest}\n\nHTML FILE:\n${currentHtml}`,
        16000
      )
      const patchedHtml = cleanHtml(patched)
      return new Response(JSON.stringify({ html: patchedHtml, assetType: 'patch' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      })
    }

    // GENERATE — create a new asset
    if (!brief || !assetType) {
      return new Response(JSON.stringify({ error: 'Missing brief or assetType' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    const prompt = buildPrompt(brief, assetType)
    if (!prompt) {
      return new Response(JSON.stringify({ error: `Unknown assetType: ${assetType}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    const raw = await streamClaude(ANTHROPIC_KEY, 'claude-sonnet-4-6', SYSTEM, prompt, 16000)
    const html = cleanHtml(raw)

    if (!html || html.length < 100) {
      return new Response(JSON.stringify({ error: 'Generated HTML was empty or too short. Try regenerating.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    let responseBody
    try {
      responseBody = JSON.stringify({ html, assetType })
    } catch (jsonErr) {
      // If JSON.stringify fails (rare), return as escaped string
      const escaped = html.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
      responseBody = `{"html":"${escaped}","assetType":"${assetType}"}`
    }

    return new Response(responseBody, {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Generation failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const config = { path: '/api/generate-overlay' }
