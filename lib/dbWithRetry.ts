import connectToDatabase from './mongodb'

export async function connectWithRetry(maxRetries = 3, initialDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${new Date().toISOString()}] Connection attempt ${attempt}/${maxRetries}`)
      
      await connectToDatabase()
      
      console.log(`[${new Date().toISOString()}] Connected successfully on attempt ${attempt}`)
      return
      
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}]  Attempt ${attempt}/${maxRetries} failed:`, error.message)
      
      if (attempt === maxRetries) {
        console.error(`[${new Date().toISOString()}]  All ${maxRetries} connection attempts failed`)
        throw new Error(`Database connection failed after ${maxRetries} attempts: ${error.message}`)
      }
      
      // Exponential backoff: 2s, 4s, 8s, 16s...
      const delay = initialDelay * Math.pow(2, attempt - 1)
      console.log(`[${new Date().toISOString()}]  Waiting ${delay}ms before retry...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}