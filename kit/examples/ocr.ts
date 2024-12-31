/*
# OCR Clipboard Image

- This script analyzes the clipboard to see if there is an image present
- If an image is found, it uses the Tesseract OCR library to convert the content of the image into text and copies to the clipboard
*/

// Name: Optical Character Recognition
// Description: Extract text from images
// Author: Kent C. Dodds
// Twitter: @kentcdodds

import '@johnlindquist/kit'
import Tesseract from 'tesseract.js'

interface TesseractResult {
  data: {
    text: string
  }
}

const clipboardImage: Buffer = await clipboard.readImage()

if (clipboardImage.byteLength) {
  const tmpImagePath = tmpPath('ocr.png')
  await writeFile(tmpImagePath, clipboardImage)

  const text = await div({
    html: md(`
## Analyzing image...    

<img src="file://${tmpImagePath}" />`),
    onInit: async () => {
      const { data }: TesseractResult = await Tesseract.recognize(clipboardImage, 'eng', {
        logger: (m: any) => console.log(m),
      })
      submit(data.text)
    },
  })

  console.clear()
  await editor(text)
} else {
  let selectedFiles: string | undefined = await getSelectedFile()
  let filePaths: string[]

  if (selectedFiles) {
    filePaths = selectedFiles.split('\n')
  } else {
    let droppedFiles = await drop({ placeholder: 'Drop images to compress' })
    filePaths = droppedFiles.map(file => file.path)
  }
  for (const filePath of filePaths) {
    const { data }: TesseractResult = await Tesseract.recognize(filePath, 'eng', {
      logger: (m: any) => console.log(m),
    })
    console.clear()
    await editor(data.text)
  }
}
