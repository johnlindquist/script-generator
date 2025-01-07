import { NextApiRequest, NextApiResponse } from 'next'
import { v2 as cloudinary } from 'cloudinary'
import qs from 'query-string'
import slugify from 'slugify'

async function fetchImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { user = 'kit', title, folder = 'kit' } = req.query
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'johnlindquist',
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  })

  const public_id = slugify(title as string, {
    lower: true,
  })

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  const protocol = vercelUrl?.includes('localhost') ? 'http' : 'https'
  const source = `${protocol}://${vercelUrl}/api/opengraph?${qs.stringify(req.query)}`

  try {
    // For local development, fetch the image first
    let uploadSource = source
    if (vercelUrl?.includes('localhost')) {
      const imageBuffer = await fetchImage(source)
      uploadSource = `data:image/png;base64,${imageBuffer.toString('base64')}`
    }

    const response = await cloudinary.uploader.upload(uploadSource, {
      folder: `${folder}/${slugify(user as string, {
        lower: true,
      })}`,
      public_id,
      overwrite: false,
    })

    res.writeHead(302, {
      'Content-type': 'image/png',
      Location: response.url,
    })

    res.end()
  } catch (error) {
    console.error('Cloudinary error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
