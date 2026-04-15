export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const FAL_KEY = process.env.FAL_API_KEY
  if (!FAL_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing FAL_API_KEY' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { prompt, imageBase64, strength = 0.75, mode = 'img2img' } = body

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) }
  }

  try {
    const fullPrompt = `${prompt}, esports logo, game badge, professional branding, ultra detailed, sharp, 4k, centered composition, black background`

    let falBody
    let endpoint

    if (mode === 'img2img' && imageBase64) {
      // Image to image — evolve from uploaded logo
      endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image'
      falBody = {
        prompt: fullPrompt,
        image_url: `data:image/png;base64,${imageBase64}`,
        strength: parseFloat(strength),
        num_inference_steps: 28,
        num_images: 4,
        guidance_scale: 3.5
      }
    } else {
      // Text to image — generate from scratch
      endpoint = 'https://fal.run/fal-ai/flux/dev'
      falBody = {
        prompt: fullPrompt,
        image_size: 'square_hd',
        num_inference_steps: 28,
        num_images: 4,
        guidance_scale: 3.5
      }
    }

    const falRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_KEY}`
      },
      body: JSON.stringify(falBody)
    })

    const falData = await falRes.json()

    if (!falRes.ok) {
      console.error('fal.ai error:', falData)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: falData.detail || falData.message || 'fal.ai generation failed' })
      }
    }

    const images = falData.images?.map(img => img.url) || []

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
