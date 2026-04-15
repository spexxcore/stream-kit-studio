export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const TOGETHER_KEY = process.env.TOGETHER_API_KEY
  if (!TOGETHER_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing TOGETHER_API_KEY' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { prompt, imageBase64, strength = 0.75, mode = 'txt2img' } = body

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) }
  }

  try {
    const fullPrompt = `${prompt}, esports logo, game badge, professional branding, ultra detailed, sharp, 4k, centered composition, black background`

    // Together AI supports FLUX.1-schnell and FLUX.1-dev for text-to-image
    // For img2img we use the same endpoint with an image_url
    const isImg2Img = mode === 'img2img' && imageBase64

    const togetherBody = {
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt: fullPrompt,
      width: 1024,
      height: 1024,
      steps: isImg2Img ? 28 : 4,
      n: 4,
      response_format: 'url'
    }

    // If img2img, add the image reference
    if (isImg2Img) {
      togetherBody.image_url = `data:image/png;base64,${imageBase64}`
      togetherBody.image_strength = 1 - parseFloat(strength)
      togetherBody.model = 'black-forest-labs/FLUX.1-dev'
    }

    const res = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOGETHER_KEY}`
      },
      body: JSON.stringify(togetherBody)
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Together AI error:', data)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error?.message || data.message || 'Together AI generation failed' })
      }
    }

    const images = data.data?.map(img => img.url || `data:image/png;base64,${img.b64_json}`).filter(Boolean) || []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })
    }

  } catch (err) {
    console.error('logo-maker error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Generation failed' })
    }
  }
}

