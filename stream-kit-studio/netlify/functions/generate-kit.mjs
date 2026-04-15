export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  const FAL_KEY = process.env.FAL_API_KEY

  if (!ANTHROPIC_KEY || !FAL_KEY) {
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
    // Step 1: Claude builds brand brief
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
        system: `You are a professional esports and streaming brand designer. Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation.`,
        messages: [{
          role: 'user',
          content: logoBase64 ? [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: logoBase64 } },
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
Incorporate the existing logo's style, shape, and feel. Evolve it, don't ignore it.
Return this exact JSON structure:
{
  "brandSummary": "2-3 sentence brand identity description",
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "accentColor": "#hexcode",
  "backgroundColor": "#hexcode",
  "fontPrimary": "Google Font name for headers",
  "fontSecondary": "Google Font name for body",
  "logoPrompt": "Detailed Flux image generation prompt for logo (square, no text, high detail, evolved from uploaded reference)",
  "mascotPrompt": "Detailed Flux prompt for mascot/character art (no background, game art style)",
  "overlayStyle": "Description of overlay visual language",
  "kitAssets": {
    "logo": { "description": "What the logo looks like", "style": "badge/emblem/minimal/etc" },
    "overlay": { "description": "Main stream overlay description", "elements": ["webcam frame", "info bar"] },
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
  "logoPrompt": "Detailed Flux image generation prompt for logo (square, no text, high detail)",
  "mascotPrompt": "Detailed Flux prompt for mascot/character art (no background, game art style)",
  "overlayStyle": "Description of overlay visual language",
  "kitAssets": {
    "logo": { "description": "What the logo looks like", "style": "badge/emblem/minimal/etc" },
    "overlay": { "description": "Main stream overlay description", "elements": ["webcam frame", "info bar"] },
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

    // Helper: generate image via fal.ai, return { url, base64 }
    const generateFalImage = async (prompt, refBase64 = null) => {
      let endpoint, falBody
      const fullPrompt = `${prompt}, esports logo, game badge, centered composition, black background, ultra detailed, professional, 4k`

      if (refBase64) {
        endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image'
        falBody = {
          prompt: fullPrompt,
          image_url: `data:image/png;base64,${refBase64}`,
          strength: 0.75,
          num_inference_steps: 28,
          num_images: 1
        }
      } else {
        endpoint = 'https://fal.run/fal-ai/flux/schnell'
        falBody = {
          prompt: fullPrompt,
          image_size: 'square_hd',
          num_inference_steps: 4,
          num_images: 1
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${FAL_KEY}` },
        body: JSON.stringify(falBody)
      })
      const data = await res.json()
      const url = data.images?.[0]?.url || null

      // Fetch image and convert to base64 so overlays can embed it without CORS issues
      let base64 = null
      if (url) {
        try {
          const imgRes = await fetch(url)
          const arrBuf = await imgRes.arrayBuffer()
          const bytes = new Uint8Array(arrBuf)
          let binary = ''
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
          base64 = `data:image/png;base64,${btoa(binary)}`
        } catch (e) {
          console.error('Failed to fetch image as base64:', e)
        }
      }

      return { url, base64 }
    }

    // Step 2: Generate logo
    const logoResult = await generateFalImage(brief.logoPrompt, logoBase64 || null)

    // Step 3: Generate mascot if specified
    let mascotResult = { url: null, base64: null }
    if (mascot) {
      mascotResult = await generateFalImage(
        `${brief.mascotPrompt}, game character art, esports mascot, full color, dramatic lighting, no background, ultra detailed`
      )
    }

    // Also convert the uploaded reference logo to base64 data URI for overlay use
    const uploadedLogoDataUri = logoBase64 ? `data:image/png;base64,${logoBase64}` : null

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief,
        assets: {
          logoUrl: logoResult.url,
          logoBase64: logoResult.base64,         // embedded data URI for overlays
          mascotUrl: mascotResult.url,
          mascotBase64: mascotResult.base64,
          uploadedLogoDataUri                    // original uploaded logo as data URI
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
