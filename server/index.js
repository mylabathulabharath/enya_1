import express from 'express'
import cors from 'cors'
import jobsRouter from './routes/jobs.js'
import nodesRouter from './routes/nodes.js'
import uploadRouter from './routes/upload.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration - allow requests from frontend
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // Alternative dev port
  "https://enya-1.vercel.app/", // Vercel deployment URL
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    // Allow requests from allowed origins
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin && origin.startsWith(allowed))) {
      callback(null, true)
    } else {
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === 'development') {
        callback(null, true)
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/jobs', jobsRouter)
app.use('/api/nodes', nodesRouter)
app.use('/api/upload', uploadRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware (must be AFTER routes)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err)
  console.error(`[${new Date().toISOString()}] Error stack:`, err.stack)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

export default app

