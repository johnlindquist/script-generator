import { chromium } from '@playwright/test'

async function takeScreenshot() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Set viewport to 1200x630
  await page.setViewportSize({ width: 1200, height: 630 })

  // Navigate to localhost
  await page.goto('http://localhost:3000')

  // Wait for any animations/content to load
  await page.waitForLoadState('networkidle')

  // Take the screenshot
  await page.screenshot({
    path: 'public/og-screenshot.png',
    type: 'png',
  })

  await browser.close()
  console.log('Screenshot saved to public/og-screenshot.png')
}

takeScreenshot().catch(console.error)
