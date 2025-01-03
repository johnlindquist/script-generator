import { test, expect, type Page } from '@playwright/test'

test.describe('Script Generation Flow - Unauthenticated', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto('/')
  })

  test('should show sign in button when not authenticated', async ({ page }: { page: Page }) => {
    const signInButton = page.getByRole('button', { name: 'Sign in to Generate' })
    await expect(signInButton).toBeVisible()
  })

  test('should show disabled prompt input when not authenticated', async ({
    page,
  }: {
    page: Page
  }) => {
    const promptInput = page.getByRole('textbox')
    await expect(promptInput).toBeDisabled()
    await expect(promptInput).toHaveAttribute('placeholder', 'Sign in to start generating scripts!')
  })

  test('should show disabled generate button when not authenticated', async ({
    page,
  }: {
    page: Page
  }) => {
    const generateButton = page.getByRole('button', { name: 'Generate', exact: true })
    await expect(generateButton).toBeDisabled()
  })
})
