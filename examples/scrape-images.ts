/*
# Scrape Images Script

- You will be prompted to input an "Image search" query.
- The script autonomously performs an image search on Google for your input.
- The script extracts the image source links (`.src`) from the search results and filters to base64
- An array of these images is then mapped to be displayed as an HTML string.
- The HTML string is then displayed in a `div` prompt
*/

// Name: Scrape Images
// Description: Scrape Images from Google

import "@johnlindquist/kit";

const query = await arg({
  placeholder: "Image query",
  enter: "Scrape Google for Images",
});

const srcs: string[] = await scrapeSelector(
  `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
  "img",
  (el) => el.src
);

const base64s: string[] = [];
for (const src of srcs) {
  if (src.startsWith("data:image/") && !src.includes("image/gif")) {
    base64s.push(src);
  }
}

if (base64s.length === 0) {
  console.error("No base64 images found.");
  process.exit(1);
}

const choices = [];
for (let i = 0; i < base64s.length; i++) {
  const src = base64s[i];
  choices.push({
    name: `Image ${i + 1}`,
    value: i,
    html: `<img class="w-24 h-24 object-cover" src="${src.trim()}" crossorigin="anonymous" />`,
  });
}

const index = await grid<number>("Pick an image", choices);

if (index === undefined) {
  console.error("No image selected.");
  process.exit(1);
}

const selectedSrc = base64s[index];
console.log(`Selected image index: ${index}`);

// Extract base64 data from data URL
const base64Data = selectedSrc.split(",")[1];
if (!base64Data) {
  console.error("Invalid base64 data.");
  process.exit(1);
}

// Convert base64 to image buffer
const imageBuffer = Buffer.from(base64Data, "base64");

// Determine image extension
const extension = getImageExtension(imageBuffer);
if (!extension) {
  await div(md(`No extension found for image... Exiting`));
  process.exit(1);
}

const imagesPath = createPathResolver(kenvPath("images"));
await ensureDir(imagesPath());

const outputPath = imagesPath(`${query}.${extension}`);
await writeFile(outputPath, imageBuffer);
await revealFile(outputPath);

function getImageExtension(buffer: Buffer): string | null {
  const hex = buffer.toString("hex").toUpperCase();
  if (hex.startsWith("89504E47")) {
    return "png";
  } else if (hex.startsWith("FFD8FF")) {
    return "jpg";
  } else if (hex.startsWith("474946")) {
    return "gif";
  } else if (hex.startsWith("424D")) {
    return "bmp";
  } else if (hex.startsWith("52494646")) {
    // Further check for WebP
    const webpHeader = buffer.toString("ascii", 8, 12);
    if (webpHeader === "WEBP") {
      return "webp";
    }
    return null;
  } else {
    return null; // Unknown type
  }
}
