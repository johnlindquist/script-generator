export interface Suggestion {
  title: string
  description: string
  keyFeatures: string[]
}

export const SUGGESTIONS: Suggestion[] = [
  {
    title: 'Clipboard Summarizer',
    description:
      'Use `clipboard.readText()` and `chat()` to automatically summarize whatever text is on the clipboard. Optionally call a generative API (e.g. OpenAI, Gemini) to produce the summary. Display the final text in `div()` or via `notify()`.',
    keyFeatures: [
      'Clipboard text capture',
      'Chat-based summarization',
      'Optional API integration (OpenAI, Gemini)',
      'Display summary in `div()` or `notify()`',
    ],
  },
  {
    title: 'Image-Based Chat Classifier',
    description:
      'Allow the user to drop an image with `await drop()`, then call an AI classification API (Hugging Face, Google Vision, etc.). Present the label or classification results in a `div()`, and optionally store them in a local `db()`.',
    keyFeatures: [
      'drop() for images',
      'AI or ML classification API',
      'Results in `div()`',
      'Optional local `db()` storage',
    ],
  },
  {
    title: 'Audio Diary via mic()',
    description:
      'Record audio with `mic.start()` and `mic.stop()`, saving as `.webm` files named by date. For transcription, integrate an npm library or external speech-to-text API (e.g. `node-wav`, Whisper, or Google Speech).',
    keyFeatures: [
      'Use mic() to record audio',
      'Store files with timestamps',
      'Optional speech-to-text for transcriptions',
      'Simple logging or note-taking',
    ],
  },
  {
    title: 'Auto-Generate a README',
    description:
      'Use `template()` with placeholders for Project Name, Description, Installation, etc. Then open in `editor()` for final user customization. Optionally run `prettier` (npm) on save for formatting.',
    keyFeatures: [
      'template() with placeholders',
      'editor() for customization',
      'Prettier formatting',
      'Automated README creation',
    ],
  },
  {
    title: 'Snippet Collector',
    description:
      'Copy code from the clipboard, then store it in a local `db()` or external storage. Use `arg()` to retrieve or search saved snippets. Optionally integrate a small search UI with `micro()` or `select()`.',
    keyFeatures: [
      'Clipboard detection',
      'Store code snippets in `db()`',
      'Search via arg(), micro(), or select()',
      'Code snippet management',
    ],
  },
  {
    title: 'Drop-to-Translate',
    description:
      'Drop multiple text files using `await drop()`. Use a translation API (e.g. DeepL, google-translate-api) to translate each line. Show progress in `term()`, `chat()`, or a `div()` with a progress bar.',
    keyFeatures: [
      'drop() for text files',
      'Batch translation via external API',
      'Progress display in term() or chat()',
      'Optional local logging of translations',
    ],
  },
  {
    title: 'Micro Quick Note',
    description:
      'Use `micro()` to quickly capture short notes, then append them to a log file (a daily .txt or .md) with timestamps. Alternatively, store them in a local `db()` for easy retrieval.',
    keyFeatures: [
      'micro() minimal prompt',
      'Append to daily .md or .txt',
      'Timestamped logs',
      'Optional `db()` storage',
    ],
  },
  {
    title: 'Git Branch Switcher with select()',
    description:
      'Run `exec("git branch")` or `$\`git branch\`` to list branches. Display them in `select()` for multi-choice. On selection, run `exec("git checkout <branch>")`. Optionally parse remote branches with `simple-git` for deeper integration.',
    keyFeatures: [
      'exec() or $ for Git commands',
      'select() for branch listing',
      'Switch branches interactively',
      'Simple multi-repo management',
    ],
  },
  {
    title: 'Terminal Commands Runner',
    description:
      'Provide a short list of favorite commands in a `micro()` or `arg()` prompt. Upon selection, run them in `term()` for interactive display. For advanced usage, integrate `execa` or `shelljs`.',
    keyFeatures: [
      'term() for interactive CLI',
      'Preset commands in micro() or arg()',
      'execa/shelljs for robust command handling',
      'User-friendly command runner',
    ],
  },
  {
    title: 'Custom Cron Scheduler',
    description:
      'Demonstrate Script Kit’s scheduling with `// Schedule: "0 * * * *"`. The script could fetch data hourly, run an npm command, or do other repetitive tasks. Use `notify()` or `db()` to log results.',
    keyFeatures: [
      'Script Kit cron scheduling',
      'Hourly or daily tasks',
      'notify() on success/failure',
      'Periodic logs in db()',
    ],
  },
  {
    title: 'Markdown Blog Editor',
    description:
      'Open an `editor()` with an MD template. Preview changes in a side `div()` using `setPanel()` or `setPreview()`. For advanced markdown processing, use `marked` or `remark` npm libraries.',
    keyFeatures: [
      'editor() for markdown',
      'Live preview with setPanel() / setPreview()',
      'Optionally use `marked` or `remark`',
      'Blog publishing workflow',
    ],
  },
  {
    title: 'Multi-step Form',
    description:
      'Use `fields(["Name", "Age"])` for personal details, then collect job role with `arg()`. Build a multi-step data collection flow. Validate with npm libraries like `yup` or `zod` if needed.',
    keyFeatures: [
      'fields() for rapid form generation',
      'arg() for follow-up steps',
      'Multi-step user data collection',
      'Optional data validation',
    ],
  },
  {
    title: 'Drag & Drop Video Converter',
    description:
      'Drop a video file via `await drop()`, then run `exec("ffmpeg")` to convert it to .mp4. Display progress or finalize with `notify()`. Use `fluent-ffmpeg` for better progress parsing.',
    keyFeatures: [
      'drop() for video',
      'ffmpeg-based conversion',
      'notify() on completion',
      'Optional fluent-ffmpeg integration',
    ],
  },
  {
    title: 'AI Chat to Translate Phrases',
    description:
      'Combine Script Kit’s `chat()` with a translation API (google-translate-api or DeepL). As the user types, show immediate translations. Display results in a `div()` or `notify()`.',
    keyFeatures: [
      'chat() user interface',
      'External translation service',
      'Real-time phrase translation',
      'Optional local caching',
    ],
  },
  {
    title: 'System Stats Widget',
    description:
      'Use a `widget()` to show CPU or RAM usage. Update every few seconds by reading Node’s `os` module or `systeminformation` npm. Provide a minimal floating window with real-time data.',
    keyFeatures: [
      'widget() for a floating window',
      'Real-time system stats (CPU/RAM)',
      'Auto-refresh updates',
      'os/systeminformation integration',
    ],
  },
  {
    title: 'Automate GitHub Issue Filing',
    description:
      'Use `fields()` to gather a title/description, then create an issue in a GitHub repo with `post()`. Optionally store the newly created issue link in `db()` for tracking.',
    keyFeatures: [
      'GitHub REST API with post()',
      'fields() for user input',
      'Optional db() storage',
      'Automate or script-based issue creation',
    ],
  },
  {
    title: 'Bulk SSH Command',
    description:
      'Provide multiple servers in `fields()` or `arg()`. Run `exec("ssh user@host \'cmd\'")` on each. Summarize the outputs in a `div()` or store them in `db()`. For structured logs, consider `node-ssh`.',
    keyFeatures: [
      'fields() or arg() for server list',
      'exec() for SSH commands',
      'Summarize results in div()',
      'node-ssh integration',
    ],
  },
  {
    title: 'Micro CLI Cheat Sheet',
    description:
      'Use `micro()` to quickly search known CLI commands (Docker, kubectl, etc.) stored in a local `db()`. Show usage examples or help text. Optionally provide direct execution from the cheat sheet.',
    keyFeatures: [
      'micro() minimal UI',
      'CLI commands stored in db()',
      'Quick reference or direct run',
      'Easy CLI knowledge base',
    ],
  },
  {
    title: 'Multi-file JSON Merge',
    description:
      'Drop multiple JSON files via `await drop()`. Merge them with `lodash.merge` or native Object.assign. Open the merged result in `editor()` for inspection or final edits.',
    keyFeatures: [
      'drop() for JSON files',
      'lodash.merge or native merge',
      'editor() to show merged result',
      'Combine structured data easily',
    ],
  },
  {
    title: 'Clipboard-to-Markdown',
    description:
      'Monitor `clipboard.readText()` and convert the captured text to Markdown using a library like `marked` or `showdown`. Display the formatted text in a `div()` or store in a `.md` file.',
    keyFeatures: [
      'clipboard.readText()',
      'Markdown conversion',
      'md() or div() preview',
      'Log or store results',
    ],
  },
  {
    title: 'Audio Key Trigger',
    description:
      'Record audio with `mic()`. When audio volume passes a certain threshold, run a function or `notify()` the user. For advanced detection, integrate DSP libraries or custom thresholds.',
    keyFeatures: [
      'mic() for audio input',
      'Volume threshold detection',
      'Trigger events or notify()',
      'Optional advanced DSP analysis',
    ],
  },
  {
    title: 'TS Playground',
    description:
      'Open an `editor()` for writing TypeScript code. Then compile and run it with `exec("ts-node")` or `$\`ts-node code.ts\``. Display results in a `div()` or a terminal session.',
    keyFeatures: [
      'editor() for TS code',
      'Compile via ts-node',
      'Output results in div() or term()',
      'Interactive coding environment',
    ],
  },
  {
    title: 'Local Weather select()',
    description:
      'Use `select()` or `arg()` to pick a city. Fetch the weather from a service like OpenWeatherMap with `get()`. Display the forecast in a styled `div()` table or `md()`.',
    keyFeatures: [
      'select() for city pick',
      'Weather API with get()',
      'Display forecast in div()',
      'Optional caching in db()',
    ],
  },
  {
    title: 'Clipboard Image Preview',
    description:
      'Use `await clipboard.readImage()` to retrieve an image from the system clipboard, displaying it in `div()`. Optionally store images in a local `db()` for quick “clipboard history.”',
    keyFeatures: [
      'readImage() from clipboard',
      'Image display in div()',
      'Optional db() to store history',
      'Image-based tool',
    ],
  },
  {
    title: 'File Diff in editor()',
    description:
      'Select two files with `selectFile()` or `arg()`. Run `exec("diff file1 file2")`. Display the diff output in `editor()` or a small `div()`. Optionally integrate `diff3` for merges.',
    keyFeatures: [
      'selectFile() for picking files',
      'exec("diff") for comparing',
      'editor() to show results',
      'Optional merging functionality',
    ],
  },
  {
    title: 'Automatic Meeting Notes',
    description:
      'Record audio with `mic()`, transcribe it via an external speech-to-text API (Whisper, Google Speech). Open the transcript in `editor()` for final touches. Then store or share the notes.',
    keyFeatures: [
      'mic() for recording',
      'Speech-to-text service',
      'editor() for editing notes',
      'Saved meeting logs',
    ],
  },
  {
    title: 'Code Linter Helper',
    description:
      'Run `exec("eslint .")` across a codebase, parse results, and present them in `micro()`. Check items to fix or ignore. Possibly use ESLint\'s JSON output for structured data.',
    keyFeatures: [
      'exec("eslint")',
      'JSON/text output parsing',
      'micro() interactive fixes',
      'Streamlined code lint workflow',
    ],
  },
  {
    title: 'Term-based File Explorer',
    description:
      'Display a small embedded terminal via `term("ls -la")`, letting users navigate with commands. Then pick a file or folder from the output to open or act upon. Integrate with Node’s `fs` for deeper actions.',
    keyFeatures: [
      'term() for console access',
      'Interactive file browsing',
      "Combine Node's fs for actions",
      'Minimal overhead file manager',
    ],
  },
  {
    title: 'SSH Key Generator',
    description:
      'Run `exec("ssh-keygen -t rsa ...")`, prompt passphrase in `arg()`. Store or display the resulting key in `db()` or show in `editor()`. Optional encryption or backups for safekeeping.',
    keyFeatures: [
      'exec("ssh-keygen")',
      'arg() for passphrase',
      'db() or editor() for saving',
      'Simple key management',
    ],
  },
  {
    title: 'Recurring Journal Prompt',
    description:
      'A scheduled script (`// Schedule: daily`) that opens `editor()` with a “Today’s reflection” template. Save to a daily `.md` file or local `db()`. Optionally TTS readout with `say()`.',
    keyFeatures: [
      'Daily schedule',
      'editor() for journaling',
      'Store entries by date',
      'Optional TTS via say()',
    ],
  },
  {
    title: 'Audio Speed Changer',
    description:
      'Drop an audio file with `drop()`, prompt for playback speed in `arg()`, then run `exec("ffmpeg -i input -filter:a atempo=... -vn output.mp3")`. `notify()` on completion.',
    keyFeatures: [
      'drop() for audio',
      'exec("ffmpeg") with atempo filter',
      'arg() for speed input',
      'notify() result',
    ],
  },
  {
    title: 'Transcribe Videos',
    description:
      'Drop multiple video files. Call a speech-to-text API or local library to transcribe. Show transcripts in `div()` or store them in a local `db()` for future searches.',
    keyFeatures: [
      'drop() multiple videos',
      'Speech-to-text integration',
      'Display transcripts in div()',
      'Optional local `db()` index',
    ],
  },
  {
    title: 'PDF Watermark Tool',
    description:
      'Drop PDFs, then run `exec("pdftk ...")` or a Node PDF library to watermark them. Display progress in `micro()` or `term()`. Let the user preview or finalize output.',
    keyFeatures: [
      'drop() for PDF',
      'exec("pdftk") or pdf-lib',
      'micro() for progress',
      'Optional final preview',
    ],
  },
  {
    title: 'Startup Scripts Manager',
    description:
      'Use `menu([{...}])` to show a list of scripts that run on startup. Let the user enable or disable them. Possibly use `shelljs` for cross-platform startup management.',
    keyFeatures: [
      'menu() listing scripts',
      'Toggle on/off startup',
      'Optionally store config in db()',
      'Cross-platform with shelljs',
    ],
  },
  {
    title: 'Markdown to Slideshow',
    description:
      'Take a `.md` file in `editor()`, parse sections with `remark` or `marked`, then open a `widget()` for arrow-key slideshow presentation. Optionally add transitions or speaker notes.',
    keyFeatures: [
      'editor() for MD input',
      'Parse slides with remark/marked',
      'widget() for slideshow UI',
      'Interactive arrow-key navigation',
    ],
  },
  {
    title: 'Playlist Organizer',
    description:
      'Drop multiple audio files, reorder them in a `select()` multi-choice, then rename or create an M3U playlist. Use `music-metadata` for ID3 info or track details.',
    keyFeatures: [
      'drop() for audio',
      'select() to reorder',
      'M3U playlist creation',
      'Optional ID3 reading',
    ],
  },
  {
    title: 'Daily Affirmation Prompt',
    description:
      '`// Schedule: 9am` to open a `div()` or `chat()` with a random uplifting quote. Let the user mark it read. Optionally use `say()` for an audible prompt.',
    keyFeatures: [
      'Daily schedule',
      'Random quote/affirmation',
      'div() or chat() for display',
      'Optionally TTS with say()',
    ],
  },
  {
    title: 'Task Timer',
    description:
      'Start a countdown in a `div()`. When time’s up, `beep()` or `notify()`. Provide an onClick() button to reset or add 5 minutes. Optionally track tasks in `db()`.',
    keyFeatures: [
      'Countdown logic in div()',
      'beep() or notify() on complete',
      'onClick() to adjust time',
      'Simple task/time tracking',
    ],
  },
  {
    title: 'Multi-file Rename with Progress',
    description:
      'Use `drop()` to pick multiple files, rename each with `arg()` or an auto scheme. Show progress in `micro()` or `term()`. Node’s `fs` or `fs-extra` handles the file ops.',
    keyFeatures: [
      'drop() multiple files',
      'arg() or auto rename logic',
      'micro()/term() for progress',
      'fs or fs-extra for renaming',
    ],
  },
  {
    title: 'GitHub Gist Search',
    description:
      'Take a gist keyword from `fields()`. Use `get("https://api.github.com/...")` to find matches, then display in `micro()` or `select()`. Optionally open them in `editor()` or auto copy code.',
    keyFeatures: [
      'fields() for keyword input',
      'GitHub Gist API calls with get()',
      'micro() or select() results',
      'Optional open in editor()',
    ],
  },
  {
    title: 'Chat-based Shell',
    description:
      'Use a `chat()` interface where each user message runs `exec()` as a command. Show the output as the AI’s “reply.” A fun alternate UI for system commands.',
    keyFeatures: [
      'chat() as CLI UI',
      'exec() for shell commands',
      'Real-time interactive responses',
      'Novel chat-like environment',
    ],
  },
  {
    title: 'Resume Generator',
    description:
      'Collect personal info in `fields()`, fill a `template()` for a fancy resume. Open in `editor()` for final touches, then `exec("pandoc resume.md -o resume.pdf")` for PDF output.',
    keyFeatures: [
      'fields() for user data',
      'template() for formatting',
      'editor() for final edits',
      'pandoc for PDF conversion',
    ],
  },
  {
    title: 'Scoring Tool for CSV',
    description:
      'Drop a CSV with `drop()`, parse data (using `papaparse`), then open `editor()` for manipulation. Display or update a scoreboard in `md()`. Helpful for small data sets or quick analysis.',
    keyFeatures: [
      'drop() CSV',
      'papaparse for parsing',
      'editor() or md() for presentation',
      'Lightweight data analysis',
    ],
  },
  {
    title: 'Social Media Cross-Poster',
    description:
      'Use `fields()` for tweet/LinkedIn text, then post to each platform with `post()` or respective APIs (e.g. Twitter v2, LinkedIn). Track success or store logs in `db()`.',
    keyFeatures: [
      'fields() for message input',
      'post() to multiple APIs',
      'db() for logs',
      'Simplify cross-platform posting',
    ],
  },
  {
    title: 'Clipboard Watcher for Emails',
    description:
      'Continuously watch the clipboard for new text. Parse out email addresses with `validator` or regex. If found, store in `db()` and optionally `notify()` the user.',
    keyFeatures: [
      'Loop or watch clipboard',
      'Regex or validator to parse emails',
      'db() for storage',
      'notify() on detection',
    ],
  },
  {
    title: 'Mic or Webcam Activation Shortcut',
    description:
      'Register a global hotkey with `registerShortcut("cmd shift m", ...)` to quickly record audio or snap a webcam photo. Possibly store results in `db()` or show in a `widget()`.',
    keyFeatures: [
      'registerShortcut() for global hotkey',
      'mic()/webcam() usage',
      'Store or display captures',
      'Fast audio/photo capturing',
    ],
  },
  {
    title: 'Chat GPT Code Reformatter',
    description:
      'Paste code in a `chat()` UI, call an external LLM (OpenAI/Gemini) to reformat or add comments. Return updated code in a `div()` or copy it to the clipboard automatically.',
    keyFeatures: [
      'chat() interface',
      'External LLM for code formatting',
      'div() or clipboard output',
      'Code improvement assistance',
    ],
  },
  {
    title: 'Interactive Disk Cleanup',
    description:
      'Show large files or directories in `select()` with multi-choice. Remove them via `remove()` or move them with Node’s `fs`. Display a progress bar or summary in `micro()` or `term()`.',
    keyFeatures: [
      'select() multi-choice',
      'Identify large files (exec("du"))',
      'remove()/move() to clean up',
      'Interactive user-driven cleanup',
    ],
  },
  {
    title: 'DNS Checker',
    description:
      'Use `fields()` for a domain list, run `exec("nslookup")` or call a DNS API. Show results in `div()` or a table. Could also parse additional DNS records with libraries like `dns` from Node.',
    keyFeatures: [
      'fields() domain input',
      'exec("nslookup") or DNS library',
      'div() or table output',
      'DNS record analysis',
    ],
  },
  {
    title: 'Website Uptime Monitor',
    description:
      '`// Schedule: "*/5 * * * *"` calls `get(url)` and writes status to `db()`. `notify()` if the site is down. For repeated checks, consider `axios-retry` or advanced scheduling.',
    keyFeatures: [
      'Cron scheduling every 5 min',
      'get() for HTTP status',
      'db() for logs',
      'notify() on downtime',
    ],
  },
  {
    title: 'Batch Download',
    description:
      'Open an `editor()` with a list of URLs. Parse them, then `download()` each file to a folder, showing progress in `micro()`. For robust handling, use `axios` or `node-fetch` with concurrency control.',
    keyFeatures: [
      'editor() for URL input',
      'download() or axios for files',
      'micro() for progress updates',
      'Bulk file fetch',
    ],
  },
  {
    title: 'Image Classification Chat',
    description:
      'Drop an image with `await drop()`. Call an AI classification model (Hugging Face, custom model). Present results as a short `chat()` conversation. Optionally store them in `db()`.',
    keyFeatures: [
      'drop() for images',
      'AI classification model',
      'chat() for conversation style',
      'db() for result archiving',
    ],
  },
  {
    title: 'JS Code Snippets to Gist',
    description:
      'Open an `editor()` to capture a snippet. Post it to a GitHub Gist with `post()`. Return the Gist URL via `notify()`. Optionally parse the snippet for metadata with a library like Babel.',
    keyFeatures: [
      'editor() for snippet input',
      'GitHub Gist API with post()',
      'notify() with gist URL',
      'Code snippet archiving',
    ],
  },
  {
    title: 'Environment Setup',
    description:
      'Use `fields()` to pick Node/Python versions. Then run `exec("nvm use ...")` or `pyenv local ...`. For advanced package toggles, integrate `npm-check` or `pnpm` commands.',
    keyFeatures: [
      'fields() for environment details',
      'exec() calls to nvm/pyenv',
      'Optional advanced configs',
      'Automate dev environment',
    ],
  },
  {
    title: 'Clipboard to JSON',
    description:
      'Run `await clipboard.readText()`, parse lines into JSON in `editor()`. Then `writeFile()` to save. Integrate a library like `strip-json-comments` if needed for raw input cleanup.',
    keyFeatures: [
      'Clipboard text extraction',
      'Line-by-line to JSON',
      'editor() for final review',
      'writeFile() for saving',
    ],
  },
  {
    title: 'Thumbnail Extractor from Video',
    description:
      'Drop an `.mp4`, run `exec("ffmpeg -i file -ss 00:00:01.000 -vframes 1 out.jpg")`. `notify()` or `revealFile()` to see the snapshot. Optionally parse multiple timestamps for multiple thumbs.',
    keyFeatures: [
      'drop() for video',
      'exec(ffmpeg) to extract frame',
      'notify() or revealFile()',
      'Automate thumbnail creation',
    ],
  },
  {
    title: 'Audio Soundboard',
    description:
      'Use `widget()` with multiple buttons, each calling `playAudioFile()` for quick SFX. Optionally store user-created clips in `db()` and build a dynamic soundboard interface.',
    keyFeatures: [
      'widget() for UI',
      'playAudioFile() for SFX',
      'db() for storing user clips',
      'Interactive soundboard',
    ],
  },
  {
    title: 'HTML to PDF',
    description:
      'Drop a .html or fetch from a URL, convert with `exec("wkhtmltopdf ...")`. Then show a `div()` link to open or reveal the PDF. For more advanced usage, consider `puppeteer`.',
    keyFeatures: [
      'drop() or URL fetch',
      'exec("wkhtmltopdf")',
      'div() for final link',
      'PDF rendering pipeline',
    ],
  },
  {
    title: 'AI Chat Markdown',
    description:
      'Type a question in `chat()`. Receive a markdown-coded response from an AI (OpenAI, Gemini). Show it in a `div()` with syntax highlighting, or open in `editor()` for further editing.',
    keyFeatures: [
      'chat() UI',
      'Markdown-coded responses',
      'Syntax highlighting with highlight()',
      'Optional editor() for final touches',
    ],
  },
  {
    title: 'Image Rotator with select()',
    description:
      'Use `selectFile()` to pick multiple images. Choose a rotation angle in `arg()`. Run `exec("convert")` with ImageMagick or use Sharp npm. Show progress in `micro()`.',
    keyFeatures: [
      'selectFile() for images',
      'arg() for angle',
      'exec("convert") or Sharp',
      'micro() for progress',
    ],
  },
  {
    title: 'Focus Timer Widget',
    description:
      'A `widget()` countdown with a “Take a Break” button. `beep()` on time’s up. Possibly embed a progress ring with a chart library or `setPanel()` for visual feedback.',
    keyFeatures: [
      'widget() floating window',
      'Countdown + beep()',
      'Take a break button',
      'Minimal Pomodoro style',
    ],
  },
  {
    title: 'Local Package Inspector',
    description:
      'Run `exec("npm ls --json")` to parse local dependencies. Display them in `select()` for deeper info. Optionally integrate `read-package-tree` for advanced usage.',
    keyFeatures: [
      'exec("npm ls --json")',
      'Dependency tree parsing',
      'select() to explore packages',
      'Identify outdated or large deps',
    ],
  },
  {
    title: 'Clipboard OTP Reader',
    description:
      'Monitor new clipboard entries for short numeric strings (2FA codes). Store them in a mini log `db()`. `notify()` the user each time a fresh OTP is copied.',
    keyFeatures: [
      'Clipboard listener',
      'Regex for numeric OTP',
      'db() for logs',
      'notify() on new code',
    ],
  },
  {
    title: 'Logbook for Git Commits',
    description:
      'Run `exec("git log --pretty=format:\'%h|%s\'")`, parse each commit. Store in `db()`, then open a `div()` or `micro()` that lists them with quick filtering for searching commits.',
    keyFeatures: [
      'exec("git log") parsing',
      'db() for commit store',
      'div() or micro() listing',
      'Fast commit search tool',
    ],
  },
  {
    title: 'File-based Spell Checker',
    description:
      'Drop `.md` or `.txt` files. Run `exec("aspell check file.txt")` or use a Node library like `spellchecker`. Show potential corrections in `micro()` to fix or skip.',
    keyFeatures: [
      'drop() for text files',
      'aspell or spellchecker library',
      'micro() to apply fixes',
      'Quick text correction',
    ],
  },
  {
    title: 'Screenshots to Cloud',
    description:
      'Use a global hotkey to capture screenshots (system-dependent), then upload to a cloud service (S3, Cloudinary, etc.) with `post()`. Return a shareable link in `notify()`.',
    keyFeatures: [
      'Global hotkey triggers screenshot',
      'Cloud upload with post()',
      'Shareable link in notify()',
      'Optional local backups',
    ],
  },
  {
    title: 'Website Speed Tester',
    description:
      'Enter a URL in `arg()`, run `exec("curl --write-out ...")` or an npm library like `speedtest-net`. Show metrics (TTFB, total time) in `div()`. Possibly chart over time.',
    keyFeatures: [
      'arg() for URL',
      'curl or speedtest-net library',
      'Parse stats in div()',
      'Performance checks',
    ],
  },
  {
    title: 'Comment Out Unused Imports',
    description:
      'Select code files via `selectFile()`. Use Babel/Recast to parse. For each unused import, ask user in `micro()` to remove or comment it out. Write changes to disk.',
    keyFeatures: [
      'selectFile() for code files',
      'AST parsing with Babel/Recast',
      'micro() user decisions',
      'Write updated files',
    ],
  },
  {
    title: 'Clip Audio',
    description:
      'Drop an audio file, prompt start/end times with `fields()`. Run `exec("ffmpeg -ss start -to end -i input -c copy output")`. Show final file path in `notify()` or `open()`.',
    keyFeatures: [
      'drop() for audio',
      'fields() for times',
      'ffmpeg clipping',
      'notify() or open() result',
    ],
  },
  {
    title: 'Window Title Monitor',
    description:
      'Use AppleScript (`exec("osascript")`) on macOS or a Windows alternative to get the active window title. Log usage stats in CSV or local `db()`. Possibly schedule with `// System: wake` or `sleep` events.',
    keyFeatures: [
      'System-specific exec() calls',
      'Log window titles periodically',
      'CSV or db() for stats',
      'Optionally handle system events',
    ],
  },
  {
    title: 'Live Chat with a Robot',
    description:
      'A `chat()` that uses a custom AI backend (OpenAI, Gemini). Keep conversation history in a local `db()` for persistent context. Let users continue where they left off.',
    keyFeatures: [
      'chat() user interface',
      'Custom AI backend',
      'db() for conversation history',
      'Persistent, ongoing dialogue',
    ],
  },
  {
    title: 'Date-based Sorting',
    description:
      'Drop a folder, list files sorted by creation/mod date in a `div()`. Let user delete or move older ones via `remove()` or `move()`. Great for cleaning up large directories.',
    keyFeatures: [
      'drop() folder path',
      'Sort files by date',
      'div() listing + user action',
      'Cleanup automation',
    ],
  },
  {
    title: 'Script Snippet Marketplace',
    description:
      'Use `menu([{...}])` to browse user-submitted script snippets from a gist or an API. Click to auto-save a snippet to local scripts. Keep metadata in `db()` if needed.',
    keyFeatures: [
      'menu() for snippet browsing',
      'Fetch from gist or custom API',
      'Auto-save scripts locally',
      'Metadata in db()',
    ],
  },
  {
    title: 'Cron-based Git Pull',
    description:
      '`// Schedule: "0 2 * * *"` to nightly run `exec("git pull")` in a project folder. Optionally `notify()` changes or store logs in `db()` for version tracking.',
    keyFeatures: [
      'Nightly schedule',
      'exec("git pull")',
      'Notify() or db() logs',
      'Automated code updates',
    ],
  },
  {
    title: 'Database Migration Wizard',
    description:
      'Use `fields()` for old/new DB credentials. Connect, read data, then write to the new DB. Show progress in `micro()`. Libraries like `pg` or `mysql2` can handle connections.',
    keyFeatures: [
      'fields() for DB credentials',
      'Data transfer logic (pg/mysql2)',
      'micro() for progress updates',
      'Automated migration flow',
    ],
  },
  {
    title: 'Automated PDF Splitting',
    description:
      'Drop a PDF, prompt page ranges in `arg()`, run `exec("pdftk input.pdf cat 1-5 output part1.pdf")`. Optionally beep() or open the result. A quick PDF segmenter.',
    keyFeatures: [
      'drop() for PDF',
      'arg() for page ranges',
      'exec("pdftk") splitting',
      'notify() or beep() on done',
    ],
  },
  {
    title: 'Clipboard Calculator',
    description:
      'Watch the clipboard for math expressions (like `10+3*2`). Automatically evaluate and `notify()` the result. For safety, consider `mathjs` or another library instead of raw eval.',
    keyFeatures: [
      'Clipboard monitoring',
      'Expression parsing (mathjs)',
      'notify() for results',
      'Seamless inline calculations',
    ],
  },
  {
    title: 'Process Killer with micro()',
    description:
      'Display a list of processes via `exec("ps -aux")` or `ps-list` npm. Select multiple with `micro()` or `select()` multi. Kill them with `exec("kill -9 PID")`. Show results in `div()`.',
    keyFeatures: [
      'ps-list or exec("ps") for processes',
      'micro() multi-choice selection',
      'kill them with exec()',
      'Simple process manager',
    ],
  },
  {
    title: 'File Compare & Merge in editor()',
    description:
      'Drop two text files, open side-by-side in `editor()` with placeholders for merging lines. For deeper merges, integrate `diff3`. Let the user finalize the combined file.',
    keyFeatures: [
      'drop() two files',
      'Side-by-side editor()',
      'Optional diff3 merging',
      'Manual or partial merges',
    ],
  },
  {
    title: 'Network Speed Graph',
    description:
      'Use `speedtest-net` or similar npm. Continuously run tests, visualize the results in a `widget()` with a chart library (e.g., Chart.js, uPlot). Real-time speed graphs.',
    keyFeatures: [
      'speedtest-net or similar',
      'Recurring checks',
      'widget() with chart',
      'Real-time performance data',
    ],
  },
  {
    title: 'AI Chat Code Lint',
    description:
      'Copy code to the clipboard, open `chat()`. Send the code to an AI (OpenAI, Gemini) to lint or fix. Return updated code in the chat or place it back on the clipboard automatically.',
    keyFeatures: [
      'Clipboard code capture',
      'chat() with external LLM',
      'AI-based lint/fixes',
      'Clipboard output replacement',
    ],
  },
  {
    title: 'Interactive Branch Commits',
    description:
      'Pick a Git branch in `select()`, then show commits in `micro()`. Choose one to see details or do a rebase/merge. Run relevant Git commands with `exec("git ...")`.',
    keyFeatures: [
      'select() for branches',
      'micro() for commits',
      'exec("git") for merges/rebase',
      'Detailed Git workflow',
    ],
  },
  {
    title: 'Voice-controlled Prompt',
    description:
      'Use `mic()` to transcribe voice commands (via external STT). Interpret phrases like “Open Chrome” or “Start Slack” to run `exec("open /Applications/...")`. Basic voice-based automation.',
    keyFeatures: [
      'mic() + STT integration',
      'Voice command mapping',
      'exec() for app launching',
      'Hands-free usage',
    ],
  },
  {
    title: 'Calendar Poll',
    description:
      'Use `fields()` or `arg()` for times/dates. Show them in a `select()` so a group can vote the best meeting time. Store final results in `db()`. Possibly integrate `ical-generator` for ICS file creation.',
    keyFeatures: [
      'fields() to collect times',
      'select() for user votes',
      'db() store poll results',
      'Optional ICS file creation',
    ],
  },
  {
    title: 'Bulk Password Hasher',
    description:
      'Paste plaintexts in `editor()`, run them through `crypto.createHash("sha256")` or `bcrypt`. Display hashed output in `div()` or store in `db()`. Possibly mask them for security.',
    keyFeatures: [
      'editor() for input lines',
      'Hash with crypto or bcrypt',
      'div() or db() output',
      'Bulk password/secret hashing',
    ],
  },
  {
    title: 'Terminal-based Chat',
    description:
      'Create a local chat server (Node + Socket.io) and connect with `term()`. Multiple users on the same network can chat in real-time. Great for quick local collaboration.',
    keyFeatures: [
      'term() as chat UI',
      'Local Socket.io server',
      'Real-time communication',
      'Simple LAN-based messaging',
    ],
  },
  {
    title: 'Wallpaper Rotator',
    description:
      'Drop a folder of images, schedule a script to change wallpaper every hour. Use macOS `osascript` or Windows registry edits. For cross-platform, see the `wallpaper` npm package.',
    keyFeatures: [
      'drop() image folder',
      'Hourly schedule script',
      'Set wallpaper with system calls',
      'Random or sequential rotation',
    ],
  },
  {
    title: 'Time Series Data Plot',
    description:
      'Drop a CSV of time series data (via `drop()`), parse with `papaparse`. Generate a quick chart in `widget()` with Chart.js or uPlot. Provide interactive zoom or hover details.',
    keyFeatures: [
      'drop() CSV input',
      'papaparse for data',
      'widget() + chart library',
      'Quick data visualization',
    ],
  },
  {
    title: 'Auto-commit & Push',
    description:
      'Use `fields()` for a commit message, then `exec("git add -A && git commit && git push")`. Provide a success `notify()` or beep(). Keep a local `db()` log of commits if you like.',
    keyFeatures: [
      'fields() commit message',
      'exec("git add/commit/push")',
      'notify() on done',
      'Optional commit logging',
    ],
  },
  {
    title: 'Custom Audio Alarms',
    description:
      '`// Schedule: "30 8 * * 1-5"` to play a custom alarm via `playAudioFile()` on weekdays at 8:30 AM. Let the user snooze or disable from a prompt or `notify()`.',
    keyFeatures: [
      'Scheduled script on weekdays',
      'playAudioFile() for alarm',
      'Snooze/disable UI',
      'Personalized notifications',
    ],
  },
  {
    title: 'Local BBS Terminal',
    description:
      'Use `term()` to connect to a local or old-school BBS. Experience that retro text-based interface. Possibly incorporate Telnet or SSH commands with `exec()` or `node-ssh`.',
    keyFeatures: [
      'term() terminal UI',
      'Telnet/SSH for BBS',
      'Nostalgic command-line experience',
      'Quick bridging to BBS content',
    ],
  },
  {
    title: 'Screenshot to Markdown',
    description:
      'Hotkey triggers a screenshot (system-dependent). Upload it to S3 or Cloudinary with `post()`. Automatically insert a markdown `![Alt Text](URL)` snippet into the clipboard or an `editor()`.',
    keyFeatures: [
      'Global hotkey to screenshot',
      'Cloud upload with post()',
      'Markdown image snippet insertion',
      'Clipboard or editor() integration',
    ],
  },
  {
    title: 'Distributed Log Aggregator',
    description:
      'Specify multiple servers in `fields()`. `exec("ssh user@host \'tail -f /var/log/syslog\'")` in parallel, combine logs in `db()` or show them in `term()`. Basic real-time monitoring.',
    keyFeatures: [
      'SSH tailing logs',
      'Multiple servers from fields()',
      'Parallel streams in term() or db()',
      'Simple multi-server aggregator',
    ],
  },
  {
    title: 'Docker Management',
    description:
      'Show Docker containers in a `select()` by running `exec("docker ps")`. Pick containers to stop or restart. Integrate Docker’s JSON output with advanced features or hooking into Docker SDK.',
    keyFeatures: [
      'exec("docker ps")',
      'select() for container selection',
      'Stop/restart commands',
      'Docker CLI or Node Docker API',
    ],
  },
  {
    title: 'Clipboard Word Translator',
    description:
      'Monitor the clipboard for a single word. Auto-translate it to multiple languages using `google-translate-api`. Display results in a quick `notify()` or mini `div()`.',
    keyFeatures: [
      'Clipboard watch',
      'Single-word translation',
      'google-translate-api or similar',
      'notify() or div() for results',
    ],
  },
  {
    title: 'Backup .env Files',
    description:
      'Search multiple repos for `.env` with `readdir` or `glob`. Copy them to a secure location, optionally encrypting with `exec("gpg")`. Show progress in `micro()`.',
    keyFeatures: [
      'File search with readdir/glob',
      'Copy .env files',
      'Optionally exec("gpg") for encryption',
      'Progress display in micro()',
    ],
  },
  {
    title: 'Browser Tab Reader',
    description:
      'Use AppleScript (`exec("osascript")`) on macOS or a Windows-specific approach to list open browser tabs. Show them in `select()` to close or reorder. A fun cross-platform challenge.',
    keyFeatures: [
      'System commands for browser tabs',
      'select() to manage tabs',
      'Close or reorder via exec()',
      'Platform-specific logic',
    ],
  },
  {
    title: 'Script-Kit Package Maker',
    description:
      'Gather user input for name/version/desc with `fields()`. Generate a new script kit package via `template()`. Optionally install devDependencies (`exec("pnpm install -D <pkg>")`) and open in `editor()`.',
    keyFeatures: [
      'fields() for package metadata',
      'template() for project skeleton',
      'pnpm install for devDependencies',
      'editor() for final review',
    ],
  },
  {
    title: 'Audio Joiner',
    description:
      'Drop multiple audio files, reorder them in `select()`, then run `exec("sox file1 file2 file3 output.wav")` or `ffmpeg` to concatenate. Provide a final combined file and `notify()` on completion.',
    keyFeatures: [
      'drop() multiple files',
      'select() to reorder',
      'sox/ffmpeg for join',
      'notify() end result',
    ],
  },
  {
    title: 'One-liner TTS',
    description:
      'Prompt a phrase with `arg()`. Then run `say(text)` to speak it immediately. Optionally store these phrases in a local `db()` for quick replays or logs.',
    keyFeatures: [
      'arg() for text input',
      'say() TTS output',
      'Optional db() logging',
      'Instant speech generator',
    ],
  },
]

let suggestionsPromise: Promise<Suggestion[]> | null = null

export function getRandomSuggestions(): Promise<Suggestion[]> {
  if (!suggestionsPromise) {
    suggestionsPromise = new Promise(resolve => {
      // Simulate network delay in development
      const delay = process.env.NODE_ENV === 'development' ? 1000 : 0
      setTimeout(() => {
        const suggestions = [...SUGGESTIONS]
        for (let i = suggestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]]
        }
        resolve(suggestions.slice(0, 7))
      }, delay)
    })
  }
  return suggestionsPromise
}

export function resetSuggestionsCache() {
  suggestionsPromise = null
}
