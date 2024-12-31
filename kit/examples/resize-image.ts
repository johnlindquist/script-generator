/*
# Resize an Image
- Prompts user to install "jimp"
- Uses image path from currently selected file in Finder
- Prompts user for resize dimensions
- Resizes and reveals new file in Finder
*/

// Name: Resize an Image
// Description: Select an Image in Finder to Resize
// Author: John Lindquist
// Twitter: @johnlindquist

import '@johnlindquist/kit'
import Jimp from 'jimp'

let imagePath: string = await getSelectedFile()
if (!imagePath) imagePath = await selectFile(`Choose an image:`)

let extension: string = path.extname(imagePath)
const allowImageExtensions: string[] = ['.png', '.jpg']
while (!allowImageExtensions.includes(extension)) {
  const fileName: string = path.basename(imagePath)

  imagePath = await selectFile(`${fileName} wasn't an image:`)
  if (!imagePath) exit()

  extension = path.extname(imagePath)
}

const width: number = Number(
  await arg('Enter width of resized image:', `<img src="${imagePath}" />`)
)

const image: Jimp = await Jimp.read(imagePath)

const newHeight: number = Math.floor(image.bitmap.height * (width / image.bitmap.width))

const resizedImagePath: string = imagePath.replace(
  new RegExp(`${extension}$`),
  `-${width}${extension}`
)

log({ resizedImagePath })

await image.resize(width, newHeight).writeAsync(resizedImagePath)

await revealFile(resizedImagePath)
