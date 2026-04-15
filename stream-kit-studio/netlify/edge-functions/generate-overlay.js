export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const ANTHROPIC_KEY = Netlify.env.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { brief, assetType } = body

  const getPrompt = (brief, assetType) => {
    const prompts = {
      overlay: `Create a complete single-file HTML stream overlay for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Self-contained HTML file with embedded CSS
- Webcam cutout area (bottom-left, 320x240px, with styled border frame)
- Info bar at bottom showing stream info area
- Animated elements using CSS keyframes only
- Primary color: ${brief.primaryColor}, Secondary: ${brief.secondaryColor}, Accent: ${brief.accentColor}
- Background: transparent (body { background: transparent; })
- Font: import ${brief.fontPrimary} from Google Fonts
- Brand name "${brief.brandName}" displayed with style
Output ONLY the complete HTML file contents, no explanation.`,

      alerts: `Create 3 stream alert animations in ONE HTML file for OBS browser source (600x200px).
Brand: ${JSON.stringify(brief)}
Alerts: Follow Alert, Subscription Alert, Donation Alert
Include preview buttons to test each alert.
Requirements:
- CSS animation entrance/exit effects, transparent background
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
- Bold exciting animations matching vibe: ${brief.brandSummary}
Output ONLY the complete HTML file, no explanation.`,

      panels: `Create 6 Twitch info panels as a single HTML file.
Brand: ${JSON.stringify(brief)}
Panels: About Me, Schedule, Social Links, PC Specs, Commands, Donate/Support
Requirements:
- Each panel 320px wide, grid layout for screenshotting
- Primary: ${brief.primaryColor}, Secondary: ${brief.secondaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} headers, ${brief.fontSecondary} body, placeholder text matching brand
Output ONLY the complete HTML file, no explanation.`,

      banner: `Create a Twitch channel banner as a single HTML file (1200x480px).
Brand: ${JSON.stringify(brief)}
Requirements:
- 1200x480px container, brand name "${brief.brandName}" as hero text
- Tagline: ${brief.brandSummary}, animated CSS background elements
- Primary: ${brief.primaryColor}, Secondary: ${brief.secondaryColor}, Font: ${brief.fontPrimary}
- html2canvas download button from CDN
Output ONLY the complete HTML file, no explanation.`,

      'starting-soon': `Create a full-screen "Starting Soon" OBS scene (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080, solid background ${brief.backgroundColor}
- Large animated "Starting Soon" heading, brand name "${brief.brandName}" prominent
- Pulsing/countdown animated elements — CSS keyframes only
- Brand vibe background animation, social handle area
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
Output ONLY the complete HTML file, no explanation.`,

      brb: `Create a full-screen BRB stream scene (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080, solid background ${brief.backgroundColor}
- Large "BRB" or "Be Right Back" text with animated effects
- Brand name "${brief.brandName}", looping CSS background animation
- Chill but on-brand feel, "Back Soon" supporting text
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
Output ONLY the complete HTML file, no explanation.`,

      ending: `Create a full-screen stream ending/outro scene (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080, solid background ${brief.backgroundColor}
- "Thanks for watching!" hero text with animation
- Brand name "${brief.brandName}", social links section with placeholder handles
- Animated outro elements, warm but on-brand
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
Output ONLY the complete HTML file, no explanation.`,

      'just-chatting': `Create a full-screen Just Chatting stream overlay (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Transparent background (body { background: transparent; })
- Large webcam frame bottom-left (~400x300px) with decorative border
- Subtle animated brand elements, "Just Chatting" label, brand name "${brief.brandName}"
- Relaxed layout, less cluttered than game overlay
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
Output ONLY the complete HTML file, no explanation.`,

      'live-scene': `Create a full-screen live gameplay stream overlay (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Transparent background (body { background: transparent; })
- CENTER must be fully transparent for game to show through
- Webcam frame bottom-left (~280x210px) with styled border
- Top bar: brand name "${brief.brandName}" + animated accent
- Bottom info strip, subtle corner accents not blocking gameplay
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
Output ONLY the complete HTML file, no explanation.`,

      'extra-scene': `Create a full-screen intermission stream scene (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080, solid background ${brief.backgroundColor}
- "Intermission" or "Taking a Break" animated text
- Brand name "${brief.brandName}", interesting looping CSS background animation
- Fun message or placeholder for custom content
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}, Font: ${brief.fontPrimary}
Output ONLY the complete HTML file, no explanation.`,
    }
    return prompts[assetType] || null
  }

  const prompt = getPrompt(brief, assetType)
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Invalid assetType' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Use streaming from Anthropic so we never hit timeout
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      stream: true,
      system: 'You are an expert stream overlay designer and frontend developer. Output only the HTML file. Start with <!DOCTYPE html> — no markdown, no backticks, no commentary before or after.',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!claudeRes.ok) {
    return new Response(JSON.stringify({ error: 'Anthropic API error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Stream the response back, collecting the full HTML then returning it
  const reader = claudeRes.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Stream read error: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Clean up any markdown fences
  let html = fullText.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const doctypeIdx = html.indexOf('<!DOCTYPE')
  if (doctypeIdx > 0) html = html.slice(doctypeIdx)
  const htmlTagIdx = html.indexOf('<html')
  if (htmlTagIdx > 0 && doctypeIdx === -1) html = html.slice(htmlTagIdx)

  return new Response(JSON.stringify({ html, assetType }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/generate-overlay' }
