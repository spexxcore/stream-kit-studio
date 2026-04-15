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

  const { brandName, mascot, colors, vibe, style, streamPlatform } = body

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
          content: `Create a complete streaming brand kit brief for:
- Brand Name: ${brandName}
- Mascot/Character: ${mascot || 'none specified'}
- Color Preferences: ${colors || 'choose based on vibe'}
- Vibe/Theme: ${vibe}
- Art Style: ${style || 'modern esports'}
- Platform: ${streamPlatform || 'Twitch/general'}

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
      })
    })

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content[0].text.replace(/```json|```/g, '').trim()
    const brief = JSON.parse(rawText)

    // Step 2: Generate logo image via fal.ai Flux
    const falLogoRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_KEY}`
      },
      body: JSON.stringify({
        prompt: `${brief.logoPrompt}, esports logo, game badge, centered composition, black background, ultra detailed, professional, 4k`,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1
      })
    })

    const falLogoData = await falLogoRes.json()
    const logoImageUrl = falLogoData.images?.[0]?.url || null

    // Step 3: Generate mascot if applicable
    let mascotImageUrl = null
    if (mascot) {
      const falMascotRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${FAL_KEY}`
        },
        body: JSON.stringify({
          prompt: `${brief.mascotPrompt}, game character art, esports mascot, full color, dramatic lighting, no background, ultra detailed`,
          image_size: 'square_hd',
          num_inference_steps: 4,
          num_images: 1
        })
      })
      const falMascotData = await falMascotRes.json()
      mascotImageUrl = falMascotData.images?.[0]?.url || null
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
