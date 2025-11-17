import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { jobManager } from '../services/jobStore.js'
import { nodeManager } from '../services/nodeManager.js'

const router = express.Router()

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await jobManager.getAllJobs()
    res.json(jobs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }
    res.json(job)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new job
router.post('/', async (req, res) => {
  try {
    const {
      inputMethod,
      youtubeUrl,
      manualPath,
      nodeId,
      unetFlag,
      faceRestoreFlag,
      upscaleFlag,
      upscaleValue,
      claheFlag,
    } = req.body

    // Validate node
    const node = await nodeManager.getNode(nodeId)
    if (!node || node.status !== 'online') {
      return res.status(400).json({ error: 'Node not available' })
    }

    // Create job
    const job = {
      id: uuidv4(),
      inputMethod,
      youtubeUrl: inputMethod === 'youtube' ? youtubeUrl : null,
      manualPath: inputMethod === 'manual' ? manualPath : null,
      nodeId,
      nodeName: node.name,
      unetFlag: unetFlag === true || unetFlag === 'true',
      faceRestoreFlag: faceRestoreFlag === true || faceRestoreFlag === 'true',
      upscaleFlag: upscaleFlag === true || upscaleFlag === 'true',
      upscaleValue: parseFloat(upscaleValue) || 2.0,
      claheFlag: claheFlag === true || claheFlag === 'true',
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: '',
      remoteJobId: null,
      outputPath: null,
    }

    await jobManager.addJob(job)

    // Start job execution (async)
    jobManager.executeJob(job.id).catch((error) => {
      console.error(`Error executing job ${job.id}:`, error)
    })

    res.status(201).json(job)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Cancel job
router.post('/:id/cancel', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return res.status(400).json({ error: 'Job cannot be cancelled' })
    }

    await jobManager.cancelJob(req.params.id)
    res.json({ message: 'Job cancelled' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    await jobManager.deleteJob(req.params.id)
    res.json({ message: 'Job deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Download completed job output
router.get('/:id/download', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job is not completed yet' })
    }

    if (!job.outputPath) {
      return res.status(404).json({ error: 'No output file available for this job' })
    }

    const node = nodeManager.getNodeWithPassword(job.nodeId)
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }

    if (node.connectionType && node.connectionType !== 'http') {
      return res.status(400).json({ error: 'Download is only supported for HTTP nodes' })
    }

    const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
    const apiClient = new RemoteAPIClient(node)
    const downloadResponse = await apiClient.downloadFile(job.outputPath)

    const filename = job.outputPath.split('/').pop() || `${job.id}.mp4`
    const contentType =
      downloadResponse.headers['content-type'] || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    downloadResponse.data.pipe(res)
    downloadResponse.data.on('error', (error) => {
      console.error(`[API] Error streaming download for job ${job.id}:`, error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' })
      } else {
        res.destroy(error)
      }
    })
  } catch (error) {
    console.error(`[API] Error downloading job ${req.params.id}:`, error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

export default router

