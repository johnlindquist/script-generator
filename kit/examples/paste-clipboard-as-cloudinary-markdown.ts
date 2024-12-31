/*
# Paste Clipboard Image as Cloudinary Markdown URL

- Checks if there is an image on the clipboard
- If image is present, it uploads to Cloudinary using the `upload_stream` method
- Asks user for the alternative text of the image using `mini` method
- Formats the Cloudinary response to a markdown image syntax with Alt text
- Replaces the selected text with this generated markdown
- If no image is stored in clipboard, it displays a message `No Image in Clipboard`

> Ensure you have your Cloudinary credentials stored in your environment variables for this script to run successfully. 
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
*/

// Name: Paste Clipboard Image as Cloudinary Markdown URL

import '@johnlindquist/kit'
import { infoPane } from '@johnlindquist/kit'
import cloudinary from 'cloudinary'
import { Readable } from 'stream'

interface CloudinaryResponse {
  secure_url: string
  public_id: string
}

div(infoPane('Reading Clipboard', 'Writing to Cloudinary')) // Don't await
const buffer: Buffer = await clipboard.readImage()

// https://console.cloudinary.com/settings/api-keys
if (buffer && buffer.length) {
  cloudinary.v2.config({
    cloud_name: await env('CLOUDINARY_CLOUD_NAME'),
    api_key: await env('CLOUDINARY_API_KEY'),
    api_secret: await env('CLOUDINARY_API_SECRET'),
  })

  const response: CloudinaryResponse = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: 'clipboard',
        resource_type: 'auto',
        secure: true,
      },
      (error: Error | null, result: CloudinaryResponse | null) => {
        if (error) reject(error)
        else if (result) resolve(result)
      }
    )

    new Readable({
      read() {
        this.push(buffer)
        this.push(null)
      },
    }).pipe(uploadStream)
  })

  // format however you want
  const alt = 'Alt Text'
  const markdown: string = `![${alt}](${response.secure_url})`
  await setSelectedText(markdown)
} else {
  await div(md(`# No Image in Clipboard`))
}
