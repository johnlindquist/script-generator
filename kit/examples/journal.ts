/*
# Markdown Journal
- Creates a new markdown file based on the day (or opens existing file)
- Opens the file in the built-in editor
- Adds a timestamp
- Auto-saves as you type
- On first run, will prompt the user to select where to store files
*/

// Name: Journal

import '@johnlindquist/kit'
const journalDir: string = await env('JOURNAL_DIR', async () => {
  return await path({
    hint: 'Select a directory to store journal.md files',
  })
})

const journalPath = createPathResolver(journalDir)
await ensureDir(journalPath())

const dashedDate: string = formatDate(new Date(), 'yyyy-MM-dd')

const filePath: string = journalPath(dashedDate + '.md')
setDescription(filePath)
let value = await ensureReadFile(filePath, `# ${dashedDate}`)

const dashedTime: string = formatDate(new Date(), 'hh:mma')

if (!value.includes(dashedTime)) {
  value = `${value}

## ${dashedTime}

`
}

let changed = false

const autoSave = debounce(async (input: string) => {
  await writeFile(filePath, input.trim())
}, 3000)

const content: string = await editor({
  value,
  scrollTo: 'bottom',
  shortcuts: [
    {
      name: 'Save',
      key: `${cmd}+s`,
      onPress: (input: string) => {
        submit(input)
      },
      bar: 'right',
    },
    {
      name: 'Open',
      key: `${cmd}+o`,
      onPress: async () => {
        open(filePath)
      },
      bar: 'right',
    },
  ],
  onEscape: async (input: string) => {
    submit(input)
  },
  onAbandon: async (input: string) => {
    submit(input)
  },
  onInput: async (input: string) => {
    changed = true
    autoSave(input)
  },
})
await hide()

const trimmed: string = content.trim()
if (!changed) {
  exit()
}

await writeFile(filePath, trimmed)

await copy(content.split(/##.*/).pop()?.trim() || '')

// Push changes if the path is a git repo
const isGit: boolean = await isDir(journalPath('.git'))
if (isGit) {
  try {
    const { stdout } = await exec(
      `git add . && git commit -m "${dashedDate}-${dashedTime}" && git push`,
      {
        cwd: journalPath(),
      }
    )
    log({ stdout })
  } catch (error) {
    log(error)
  }
}
