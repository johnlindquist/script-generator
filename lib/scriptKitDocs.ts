'use server'

import fs from 'fs'
import path from 'path'

export interface ScriptKitCategory {
  category: string
  functions: string[]
}

export interface ScriptKitDocs {
  categories: ScriptKitCategory[]
  snippets: Record<string, string>
}

export async function getScriptKitDocs(): Promise<ScriptKitDocs> {
  const bestPracticesPath = path.join(process.cwd(), 'prompts', 'BEST_PRACTICES.md')
  // Use condensed version for faster suggestions generation with gpt-5-nano
  const docsMiniPath = path.join(process.cwd(), 'prompts', 'docs-mini-condensed.md')
  const bestPractices = fs.readFileSync(bestPracticesPath, 'utf-8').split('\n')
  const categories: ScriptKitCategory[] = []
  for (const line of bestPractices) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- **') && trimmed.includes(':')) {
      const colon = trimmed.indexOf(':')
      const category = trimmed.slice(4, colon)
      let itemsStr = trimmed.slice(colon + 3)
      itemsStr = itemsStr.replace(/`/g, '').replace(/\.$/, '')
      const items = itemsStr
        .split(/,\s*/)
        .map(i => i.trim())
        .filter(Boolean)
      categories.push({ category, functions: items })
      if (categories.length >= 7) break
    }
  }

  const lines = fs.readFileSync(docsMiniPath, 'utf-8').split('\n')
  const snippets: Record<string, string> = {}
  let current: string | null = null
  let collecting = false
  let code: string[] = []
  for (const line of lines) {
    const heading = line.match(/^## \d+\. \*\*(.+?)\*\*/)
    if (heading) {
      if (current && code.length) {
        snippets[current] = code.join('\n')
      }
      current = heading[1]
      collecting = false
      code = []
    } else if (line.startsWith('```')) {
      if (collecting) {
        if (current) snippets[current] = code.join('\n')
        collecting = false
        code = []
      } else {
        collecting = true
        code = []
      }
    } else if (collecting) {
      code.push(line)
    }
  }
  if (current && code.length) snippets[current] = code.join('\n')

  return { categories, snippets }
}
