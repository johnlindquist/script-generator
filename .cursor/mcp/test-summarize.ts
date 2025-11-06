import { summarize } from './cursor.ts'

// Test the summarize function
async function testSummarize() {
  try {
    const result = await summarize()
    console.log('Summarize result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error testing summarize:', error)
  }
}

testSummarize()
