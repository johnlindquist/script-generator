export interface Suggestion {
  title: string
  description: string
  keyFeatures: string[]
}

const suggestions: Suggestion[] = [
  {
    title: 'File Organizer',
    description: 'Automatically organize files by type, date, or custom rules',
    keyFeatures: ['Sort by extension', 'Move to dated folders', 'Handle duplicates'],
  },
  {
    title: 'Image Batch Processor',
    description: 'Process multiple images with custom transformations',
    keyFeatures: ['Resize', 'Convert format', 'Apply watermark'],
  },
  {
    title: 'Git Branch Cleaner',
    description: 'Clean up old and merged git branches automatically',
    keyFeatures: ['Delete merged branches', 'Show branch age', 'Safe mode'],
  },
  {
    title: 'Note Templater',
    description: 'Create notes with predefined templates and current date',
    keyFeatures: ['Multiple templates', 'Auto date', 'Custom fields'],
  },
  {
    title: 'Quick Project Setup',
    description: 'Initialize new projects with your preferred structure and configs',
    keyFeatures: ['Multiple frameworks', 'Git init', 'Install dependencies'],
  },
  {
    title: 'Log File Analyzer',
    description: 'Parse and analyze log files for patterns and issues',
    keyFeatures: ['Error detection', 'Pattern matching', 'Summary report'],
  },
  {
    title: 'Backup Manager',
    description: 'Schedule and manage backups of important directories',
    keyFeatures: ['Incremental backup', 'Compression', 'Cloud upload'],
  },
  {
    title: 'Code Formatter',
    description: 'Format and clean up code files across multiple languages',
    keyFeatures: ['Multiple languages', 'Custom rules', 'Batch processing'],
  },
  {
    title: 'System Health Check',
    description: 'Monitor system resources and performance metrics',
    keyFeatures: ['CPU usage', 'Memory stats', 'Disk space'],
  },
  {
    title: 'URL Opener',
    description: 'Open multiple URLs in your default browser',
    keyFeatures: ['Group links', 'Custom profiles', 'Delay option'],
  },
  {
    title: 'Package Updater',
    description: 'Check and update project dependencies across multiple projects',
    keyFeatures: ['Version check', 'Auto update', 'Changelog summary'],
  },
  {
    title: 'Screenshot Tool',
    description: 'Capture and process screenshots with custom options',
    keyFeatures: ['Area select', 'Auto-save', 'Quick share'],
  },
  {
    title: 'ENV Manager',
    description: 'Manage multiple .env files for different environments',
    keyFeatures: ['Switch profiles', 'Secure storage', 'Template generation'],
  },
  {
    title: 'Database Backup',
    description: 'Create and manage database backups with scheduling',
    keyFeatures: ['Multiple DBs', 'Compression', 'Auto cleanup'],
  },
  {
    title: 'API Tester',
    description: 'Test API endpoints with custom requests and data',
    keyFeatures: ['Multiple methods', 'Headers config', 'Response validation'],
  },
]

export function getRandomSuggestions(count: number = 7): Suggestion[] {
  const shuffled = [...suggestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
