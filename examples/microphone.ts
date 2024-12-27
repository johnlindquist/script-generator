/*
# Record Your Microphone

- Opens the microphone recorder
- Saves the recording to your recordings folder
- Reveals the recording on your desktop
*/

// Name: Record Microphone
// Description: Quickly Record Your Microphone

import "@johnlindquist/kit";

const recordingsPath = createPathResolver(kenvPath("recordings"));
await ensureDir(recordingsPath());

const buffer = await mic();

const outputFile = recordingsPath(`${Date.now()}.webm`);
await writeFile(outputFile, buffer);
await revealFile(outputFile);

await hide();
await playAudioFile(outputFile);

// Or use a div to play the audio
// await div({
//   html: `<audio src="file://${outputFile}" controls/>`,
// });
