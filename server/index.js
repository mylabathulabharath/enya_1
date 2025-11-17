import express from 'express'
import cors from 'cors'
import jobsRouter from './routes/jobs.js'
import nodesRouter from './routes/nodes.js'
import uploadRouter from './routes/upload.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
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

