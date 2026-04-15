export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing API key' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { brief, assetType } = body

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

    alerts: `Create 3 separate single-file HTML stream alert animations for OBS browser source (600x200px each).
Brand: ${JSON.stringify(brief)}
Create all 3 alerts in ONE HTML file, with buttons to preview each (for testing), but each alert designed as a standalone 600x200 overlay popup.
Alerts needed: Follow Alert, Subscription Alert, Donation Alert
Requirements:
- CSS animation entrance/exit effects
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary}
- Transparent background
- Bold, exciting animations that fit the brand vibe: ${brief.brandSummary}
Output ONLY the complete HTML file, no explanation.`,

    panels: `Create a set of 6 Twitch/streaming info panels as a single HTML file.
Brand: ${JSON.stringify(brief)}
Panels: About Me, Schedule, Social Links, PC Specs, Commands, Donate/Support
Requirements:
- Each panel: 320px wide, auto height, consistent style
- Download-ready: show all panels in a grid for screenshotting
- Primary: ${brief.primaryColor}, Secondary: ${brief.secondaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} for headers, ${brief.fontSecondary} for body
- Include placeholder text that fits the brand vibe
- Professional esports/streaming aesthetic
Output ONLY the complete HTML file, no explanation.`,

    banner: `Create a Twitch channel banner as a single HTML file (1200x480px div).
Brand: ${JSON.stringify(brief)}
Requirements:
- 1200x480px container (exact, for screenshot)
- Brand name "${brief.brandName}" as hero typography
- Tagline that fits vibe: ${brief.brandSummary}
- Geometric/animated background elements using CSS
- Primary: ${brief.primaryColor}, Secondary: ${brief.secondaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary}
- Download as screenshot button using html2canvas from CDN
Output ONLY the complete HTML file, no explanation.`,

    'starting-soon': `Create a full-screen "Starting Soon" stream scene for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080 scene, NOT transparent — use background color ${brief.backgroundColor}
- Large animated "Starting Soon" or "Stream Starting Soon" heading
- Brand name "${brief.brandName}" prominently displayed
- Animated countdown or pulsing elements — CSS keyframes only
- Matrix/cyber animated background elements matching the brand vibe
- Social media handle or "Follow along" text area
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} from Google Fonts
- Should look like a professional pre-stream screen
Output ONLY the complete HTML file, no explanation.`,

    brb: `Create a full-screen "BRB" (Be Right Back) stream scene for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080 scene, NOT transparent — use background color ${brief.backgroundColor}
- Large "BRB" or "Be Right Back" text with animated effects
- Brand name "${brief.brandName}" displayed
- Looping animated background (CSS keyframes only) matching brand vibe
- Chill/ambient feel but still on-brand
- "Back Soon" or similar supportive text
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} from Google Fonts
Output ONLY the complete HTML file, no explanation.`,

    ending: `Create a full-screen stream ending/outro scene for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080 scene, NOT transparent — use background color ${brief.backgroundColor}
- "Thanks for watching!" or "Stream Over" hero text with animation
- Brand name "${brief.brandName}" prominently displayed
- Social links section (placeholder handles) — follow, subscribe, join Discord etc.
- Animated outro elements — CSS keyframes
- Warm but on-brand feel
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} from Google Fonts
Output ONLY the complete HTML file, no explanation.`,

    'just-chatting': `Create a full-screen "Just Chatting" stream overlay for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080 overlay, transparent background (body { background: transparent; })
- Large webcam frame area (bottom-left, ~400x300px) with decorative border matching brand
- Remaining space can have subtle animated brand elements
- "Just Chatting" scene label somewhere tasteful
- Brand name "${brief.brandName}" displayed
- Chat-friendly, relaxed layout — less cluttered than a game overlay
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} from Google Fonts
Output ONLY the complete HTML file, no explanation.`,

    'live-scene': `Create a full-screen live gameplay stream overlay for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080 overlay, transparent background (body { background: transparent; })
- The CENTER of the screen must be fully transparent (for game to show through)
- Webcam frame bottom-left (~280x210px) with styled border
- Top bar: brand name "${brief.brandName}" + subtle animated accent
- Bottom bar: info strip for game name, viewer count placeholders
- Corner decorative accents — subtle, not blocking gameplay
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} from Google Fonts
Output ONLY the complete HTML file, no explanation.`,

    'extra-scene': `Create a full-screen extra/intermission stream scene for OBS browser source (1920x1080).
Brand: ${JSON.stringify(brief)}
Requirements:
- Full 1920x1080 scene, NOT transparent — use background color ${brief.backgroundColor}
- "Intermission" or "Taking a Break" text with animated styling
- Brand name "${brief.brandName}" displayed
- Interesting animated background — looping CSS animations matching vibe
- Could include a fun message, quote, or placeholder for custom content
- Primary: ${brief.primaryColor}, Accent: ${brief.accentColor}
- Font: ${brief.fontPrimary} from Google Fonts
Output ONLY the complete HTML file, no explanation.`,
  }

  const prompt = prompts[assetType]
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid assetType' }) }
  }

  try {
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
        system: 'You are an expert stream overlay designer and frontend developer. You write clean, production-ready HTML/CSS. Output only the requested file contents. Start your response with <!DOCTYPE html> and nothing else before it. No markdown fences, no backticks, no commentary before or after the HTML.',
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await claudeRes.json()
    let html = data.content[0].text

    // Strip any markdown fences or preamble Claude might have added
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    // If Claude added text before the doctype, strip it
    const doctypeIdx = html.indexOf('<!DOCTYPE')
    if (doctypeIdx > 0) html = html.slice(doctypeIdx)
    const htmlTagIdx = html.indexOf('<html')
    if (htmlTagIdx > 0 && doctypeIdx === -1) html = html.slice(htmlTagIdx)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, assetType })
    }

  } catch (err) {
    console.error('generate-overlay error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Generation failed' })
    }
  }
}
