// import mongoose from "mongoose"
// import dotenv from "dotenv"

// dotenv.config()
// const MONGODB_URI = process.env.MONGODB_URI || ""

// if (!MONGODB_URI) {
//   throw new Error("Please define the MONGODB_URI environment variable")
// }

// interface MongooseCache {
//   conn: typeof mongoose | null
//   promise: ReturnType<typeof mongoose.connect> | null
// }

// declare global {
//   var mongoose: MongooseCache
// }

// let cached = globalThis.mongoose

// if (!cached) {
//   cached = globalThis.mongoose = { conn: null, promise: null }
// }

// async function connectToDatabase() {
//   if (cached.conn) {
//     return cached.conn
//   }

//   if (!cached.promise) {
//     const opts = {
//       bufferCommands: false,
//       maxPoolSize: 20,
//       minPoolSize: 5,
//       maxIdleTimeMS: 60000,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 20000,
//       retryWrites: true,
//       retryReads: true,
//       heartbeatFrequencyMS: 10000,
//     }

//     cached.promise = mongoose.connect(MONGODB_URI, opts)
//   }

//   cached.conn = await cached.promise
//   return cached.conn
// }

// export default connectToDatabase
// import mongoose from "mongoose"
// import dotenv from "dotenv"

// dotenv.config()
// const MONGODB_URI = process.env.MONGODB_URI || ""

// if (!MONGODB_URI) {
//   throw new Error("Please define the MONGODB_URI environment variable")
// }

// interface MongooseCache {
//   conn: typeof mongoose | null
//   promise: ReturnType<typeof mongoose.connect> | null
// }

// declare global {
//   var mongoose: MongooseCache
//   var keepAliveInterval: NodeJS.Timeout | undefined
// }

// let cached = globalThis.mongoose

// if (!cached) {
//   cached = globalThis.mongoose = { conn: null, promise: null }
// }
// function startKeepAlive() {
//   if (globalThis.keepAliveInterval) {
//     return
//   }
//   globalThis.keepAliveInterval = setInterval(async () => {
//     try {
//       if (mongoose.connection.readyState === 1) {
//         await mongoose.connection.db?.admin().ping()
//         console.log(`[${new Date().toISOString()}]  Keep-alive ping successful`)
//       } else {
//         console.log(`[${new Date().toISOString()}]  DB not connected (state: ${mongoose.connection.readyState}), skipping ping`)
//       }
//     } catch (error: any) {
//       console.error(`[${new Date().toISOString()}]  Keep-alive ping failed:`, error.message)
//     }
//   }, 3 * 60 * 1000) // 3 minutes = 180000ms

//   console.log(`[${new Date().toISOString()}]  Keep-alive started (ping every 3 minutes)`)
// }

// // Stop keep-alive (cleanup)
// function stopKeepAlive() {
//   if (globalThis.keepAliveInterval) {
//     clearInterval(globalThis.keepAliveInterval)
//     globalThis.keepAliveInterval = undefined
//     console.log(`[${new Date().toISOString()}] Keep-alive stopped`)
//   }
// }

// async function connectToDatabase() {
//   const currentState = mongoose.connection.readyState
//   console.log(`[${new Date().toISOString()}] Connection state: ${currentState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`)

//   if (cached.conn && currentState === 1) {
//     console.log(`[${new Date().toISOString()}] Using cached connection`)
//     return cached.conn
//   }

//   if (cached.promise && currentState === 2) {
//     console.log(`[${new Date().toISOString()}] Connection in progress, waiting...`)
//     try {
//       cached.conn = await cached.promise
//       return cached.conn
//     } catch (error) {
//       console.error(`[${new Date().toISOString()}] Waiting for connection failed`)
//       cached.promise = null
//       throw error
//     }
//   }

//   if (!cached.promise) {
//     const opts = {
//       bufferCommands: false,
      
//       maxPoolSize: 5,             
//       minPoolSize: 1,             
      
//       serverSelectionTimeoutMS: 30000,  
//       connectTimeoutMS: 30000,          
//       socketTimeoutMS: 45000,         
      
//       maxIdleTimeMS: 30000,             // 30 seconds
      
//       // Retry settings
//       retryWrites: false,       
//       retryReads: true,
      
//       // Heartbeat - Connection alive check
//       heartbeatFrequencyMS: 10000,  
      
//       // App identification
//       appName: 'NextJsApp'
//     }

//     console.log(`[${new Date().toISOString()}] Creating new connection...`)
//     cached.promise = mongoose.connect(MONGODB_URI, opts)
//   }

//   try {
//     console.log(`[${new Date().toISOString()}] Connecting to database...`)
    
//     cached.conn = await cached.promise
    
//     console.log(`[${new Date().toISOString()}] Connected successfully!`)

//     // Connection event listeners (one-time setup)
//     if (!mongoose.connection.listeners('connected').length) {
//       mongoose.connection.on('connected', () => {
//         console.log(`[${new Date().toISOString()}] Mongoose connected to DB`)
//       })

//       mongoose.connection.on('error', (err) => {
//         console.error(`[${new Date().toISOString()}] Mongoose connection error:`, err)
//         cached.conn = null
//         cached.promise = null
//       })

//       mongoose.connection.on('disconnected', () => {
//         console.log(`[${new Date().toISOString()}] Mongoose disconnected`)
//         cached.conn = null
//         cached.promise = null
//         stopKeepAlive() // Stop ping on disconnect
//       })

//       // Process exit cleanup
//       process.on('SIGINT', async () => {
//         await mongoose.connection.close()
//         stopKeepAlive()
//         process.exit(0)
//       })
//     }

//     // Start keep-alive pinging
//     startKeepAlive()

//     return cached.conn
    
//   } catch (error: any) {
//     console.error(`[${new Date().toISOString()}] Connection failed:`, error.message)
//     cached.promise = null
//     cached.conn = null
//     throw error
//   }
// }

// export default connectToDatabase
import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()
const MONGODB_URI = process.env.MONGODB_URI || ""

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: ReturnType<typeof mongoose.connect> | null
}

declare global {
  var mongoose: MongooseCache
}

let cached = globalThis.mongoose

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
  const currentState = mongoose.connection.readyState
  console.log(`[${new Date().toISOString()}]  Connection state: ${currentState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`)

  // Use cached connection if available and connected
  if (cached.conn && currentState === 1) {
    console.log(`[${new Date().toISOString()}] Using cached connection`)
    return cached.conn
  }

  // If connection is in progress, wait for it
  if (cached.promise && currentState === 2) {
    console.log(`[${new Date().toISOString()}] Connection in progress, waiting...`)
    try {
      cached.conn = await cached.promise
      return cached.conn
    } catch (error) {
      console.error(`[${new Date().toISOString()}]  Waiting for connection failed`)
      cached.promise = null
      throw error
    }
  }

  // Create new connection
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      
      // Pool settings - M30 can handle more connections
      maxPoolSize: 10,              // Increased from 5 (M30 is powerful)
      minPoolSize: 2,               // Increased from 1
      
      // Timeouts - M30 is faster, reduced timeouts
      serverSelectionTimeoutMS: 10000, 
      connectTimeoutMS: 10000,          
      socketTimeoutMS: 45000,           
      
      // Idle timeout
      maxIdleTimeMS: 60000,             
      
      // Retry settings
      retryWrites: false,        
      retryReads: true,
      
      // Heartbeat - Connection health check
      heartbeatFrequencyMS: 10000,  // 10s
      
      // App identification
      appName: 'NextJsApp'
    }

    console.log(`[${new Date().toISOString()}]  Creating new connection to M30 cluster...`)
    cached.promise = mongoose.connect(MONGODB_URI, opts)
  }

  try {
    console.log(`[${new Date().toISOString()}] Connecting to database...`)
    
    cached.conn = await cached.promise
    
    console.log(`[${new Date().toISOString()}] Connected successfully to M30 cluster!`)

    // Setup event listeners (one-time only)
    if (!mongoose.connection.listeners('connected').length) {
      mongoose.connection.on('connected', () => {
        console.log(`[${new Date().toISOString()}] Mongoose connected to DB`)
      })

      mongoose.connection.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] Mongoose connection error:`, err)
        cached.conn = null
        cached.promise = null
      })

      mongoose.connection.on('disconnected', () => {
        console.log(`[${new Date().toISOString()}] Mongoose disconnected`)
        cached.conn = null
        cached.promise = null
      })

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log(`[${new Date().toISOString()}] SIGINT received, closing connection...`)
        await mongoose.connection.close()
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        console.log(`[${new Date().toISOString()}]  SIGTERM received, closing connection...`)
        await mongoose.connection.close()
        process.exit(0)
      })
    }

    return cached.conn
    
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Connection failed:`, error.message)
    cached.promise = null
    cached.conn = null
    throw error
  }
}

export default connectToDatabase