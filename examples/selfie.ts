/*
# Take a Selfie

- Opens the webcam
- Saves the selfie to your selfies folder
- Reveals the selfie on your desktop
*/

// Name: Take a Selfie
// Description: Quickly Take a Selfie

import "@johnlindquist/kit";

const selfiePath = createPathResolver(kenvPath("selfies"));
await ensureDir(selfiePath());
const buffer = await webcam();
const outputFile = selfiePath(`${Date.now()}.png`);
await writeFile(outputFile, buffer);
await div({
  className: "flex flex-col items-center justify-center h-full",
  html: `<img src="file://${outputFile}" class="max-h-full" />`,
  onInit: async () => {
    toast(`Heya cutie! 😘`);
  },
});
