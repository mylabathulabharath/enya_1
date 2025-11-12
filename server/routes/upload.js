import express from 'express'
import multer from 'multer'
import { nodeManager } from '../services/nodeManager.js'
import { RemoteAPIClient } from '../services/remoteAPIClient.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'), false)
    }
  },
})

// Upload file to node
router.post('/:nodeId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const node = nodeManager.getNodeWithPassword(req.params.nodeId)
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }

    // Check if node supports HTTP API
    if (node.connectionType !== 'http' && node.connectionType !== undefined) {
      return res.status(400).json({ error: 'File upload only supported for HTTP API nodes' })
    }

    // Create API client
    const apiClient = new RemoteAPIClient(node)

    // Upload directly using the API client
    const result = await apiClient.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      (progress) => {
        console.log(`Upload progress to ${node.name}: ${progress}%`)
      }
    )

    res.json(result)
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

