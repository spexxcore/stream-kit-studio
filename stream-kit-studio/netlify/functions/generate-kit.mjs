export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  const TOGETHER_KEY = process.env.TOGETHER_API_KEY

  if (!ANTHROPIC_KEY || !TOGETHER_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing API keys' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { brandName, mascot, colors, vibe, style, streamPlatform, extraDetails, logoBase64 } = body

  if (!brandName || !vibe) {
    return { statusCode: 400, body: JSON.stringify({ error: 'brandName and vibe are required' }) }
  }

  try {
    // Step 1: Ask Claude to build a full creative brief + image prompts
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        system: `You are a professional esports and streaming brand designer. 
You create complete visual identity systems for streamers, gaming communities, and content creators.
Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation.`,
        messages: [{
          role: 'user',
          content: logoBase64 ? [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: logoBase64 }
            },
            {
              type: 'text',
              text: `The image above is the client's existing logo — use it as a style reference and build upon it.

Create a complete streaming brand kit brief for:
- Brand Name: ${brandName}
- Mascot/Character: ${mascot || 'none specified'}
- Color Preferences: ${colors || 'choose based on vibe'}
- Vibe/Theme: ${vibe}
- Art Style: ${style || 'modern esports'}
- Platform: ${streamPlatform || 'Twitch/general'}
- Additional client notes: ${extraDetails || 'none'}

Incorporate the existing logo's style, shape, and feel into the new kit. Evolve it, don't ignore it.

Return this exact JSON structure:
{
  "brandSummary": "2-3 sentence brand identity description",
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "accentColor": "#hexcode",
  "backgroundColor": "#hexcode",
  "fontPrimary": "Google Font name for headers",
  "fontSecondary": "Google Font name for body",
  "logoPrompt": "Detailed Flux image generation prompt for logo (square, no text, transparent-friendly, high detail, evolved from the uploaded reference)",
  "mascotPrompt": "Detailed Flux prompt for mascot/character art (no background, game art style)",
  "overlayStyle": "Description of overlay visual language",
  "kitAssets": {
    "logo": { "description": "What the logo looks like", "style": "badge/emblem/minimal/etc" },
    "overlay": { "description": "Main stream overlay description", "elements": ["webcam frame", "info bar", "etc"] },
    "alerts": { "description": "Alert animation style", "types": ["follow", "sub", "donation"] },
    "panels": { "description": "Panel style", "count": 6 },
    "banner": { "description": "Channel banner description" }
  }
}`
            }
          ] : [{
            type: 'text',
            text: `Create a complete streaming brand kit brief for:
- Brand Name: ${brandName}
- Mascot/Character: ${mascot || 'none specified'}
- Color Preferences: ${colors || 'choose based on vibe'}
- Vibe/Theme: ${vibe}
- Art Style: ${style || 'modern esports'}
- Platform: ${streamPlatform || 'Twitch/general'}
- Additional client notes: ${extraDetails || 'none'}

Return this exact JSON structure:
{
  "brandSummary": "2-3 sentence brand identity description",
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "accentColor": "#hexcode",
  "backgroundColor": "#hexcode",
  "fontPrimary": "Google Font name for headers",
  "fontSecondary": "Google Font name for body",
  "logoPrompt": "Detailed Flux image generation prompt for logo (square, no text, transparent-friendly, high detail)",
  "mascotPrompt": "Detailed Flux prompt for mascot/character art (no background, game art style)",
  "overlayStyle": "Description of overlay visual language",
  "kitAssets": {
    "logo": { "description": "What the logo looks like", "style": "badge/emblem/minimal/etc" },
    "overlay": { "description": "Main stream overlay description", "elements": ["webcam frame", "info bar", "etc"] },
    "alerts": { "description": "Alert animation style", "types": ["follow", "sub", "donation"] },
    "panels": { "description": "Panel style", "count": 6 },
    "banner": { "description": "Channel banner description" }
  }
}`
          }]
        }]
      })
    })

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content[0].text.replace(/```json|```/g, '').trim()
    const brief = JSON.parse(rawText)

    // Step 2: Generate logo image via Together AI Flux
    const generateImage = async (prompt, imageBase64 = null, strength = 0.75) => {
      const isImg2Img = imageBase64 !== null
      const body = {
        model: isImg2Img ? 'black-forest-labs/FLUX.1-dev' : 'black-forest-labs/FLUX.1-schnell-Free',
        prompt: `${prompt}, esports logo, game badge, centered composition, black background, ultra detailed, professional, 4k`,
        width: 1024,
        height: 1024,
        steps: isImg2Img ? 28 : 4,
        n: 1,
        response_format: 'url'
      }
      if (isImg2Img) {
        body.image_url = `data:image/png;base64,${imageBase64}`
        body.image_strength = 1 - strength
      }
      const res = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOGETHER_KEY}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      return data.data?.[0]?.url || null
    }

    const logoImageUrl = await generateImage(brief.logoPrompt, logoBase64 || null, 0.75)

    // Step 3: Generate mascot if applicable
    let mascotImageUrl = null
    if (mascot) {
      mascotImageUrl = await generateImage(
        `${brief.mascotPrompt}, game character art, esports mascot, full color, dramatic lighting, no background, ultra detailed`
      )
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief,
        assets: {
          logoUrl: logoImageUrl,
          mascotUrl: mascotImageUrl
        }
      })
    }

  } catch (err) {
    console.error('generate-kit error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Generation failed' })
    }
  }
}
