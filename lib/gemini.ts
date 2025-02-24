import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
export const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-pro-exp-02-05',
  generationConfig: {
    maxOutputTokens: 8192,
  },
})
