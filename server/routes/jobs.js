import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { JobManager } from '../services/jobManager.js'
import { nodeManager } from '../services/nodeManager.js'

const router = express.Router()
const jobManager = new JobManager()

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await jobManager.getAllJobs()
    res.json(jobs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// List output files for a job (must come before /:id route)
router.get('/:id/outputs', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // If job is completed and has a nodeId, get outputs from remote node
    if (job.status === 'completed' && job.nodeId) {
      const node = await nodeManager.getNode(job.nodeId)
      if (node && (node.connectionType === 'http' || !node.connectionType)) {
        try {
          const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
          const apiClient = new RemoteAPIClient(node)
          
          // Use remote job ID if available, otherwise use local job ID
          const remoteJobId = job.remoteJobId || job.id
          const outputs = await apiClient.listJobOutputs(remoteJobId)
          
          return res.json(outputs)
        } catch (error) {
          console.error(`Error fetching outputs from remote node: ${error.message}`)
          // Fall through to return empty outputs
        }
      }
    }

    // Return empty outputs or job's stored output files
    return res.json({
      job_id: job.id,
      output_files: job.outputFiles || [],
      count: (job.outputFiles || []).length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Download output file from a job (without filename - downloads first available file)
router.get('/:id/download', async (req, res) => {
  try {
    console.log(`[Jobs API] Download requested for job ${req.params.id} (no filename)`)
    
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed' })
    }

    const node = await nodeManager.getNode(job.nodeId)
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }

    // If node uses HTTP API, proxy the download
    if (node.connectionType === 'http' || !node.connectionType) {
      try {
        const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
        const apiClient = new RemoteAPIClient(node)
        
        // Use remote job ID if available, otherwise use local job ID
        const remoteJobId = job.remoteJobId || job.id
        
        // Get output files to find the filename
        console.log(`[Jobs API] Getting output files for job ${remoteJobId}`)
        const outputs = await apiClient.listJobOutputs(remoteJobId)
        const outputFiles = outputs?.output_files || []
        
        if (outputFiles.length === 0) {
          return res.status(404).json({ error: 'No output files found for this job' })
        }
        
        // Use the first (and only) file
        const fileToDownload = outputFiles[0]
        const filename = fileToDownload.name
        
        console.log(`[Jobs API] Downloading file: ${filename} (size: ${fileToDownload.size} bytes)`)
        
        // Download the file from remote server
        // Use empty string or 'download' as filename to trigger "use first file" logic
        const stream = await apiClient.downloadJobOutput(remoteJobId, filename)
        
        // Determine content type based on file extension
        let contentType = 'video/mp4' // default
        const filenameLower = filename.toLowerCase()
        if (filenameLower.endsWith('.avi')) {
          contentType = 'video/x-msvideo'
        } else if (filenameLower.endsWith('.mov')) {
          contentType = 'video/quicktime'
        } else if (filenameLower.endsWith('.mkv')) {
          contentType = 'video/x-matroska'
        } else if (filenameLower.endsWith('.webm')) {
          contentType = 'video/webm'
        }
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Length', fileToDownload.size || '')
        
        // Pipe stream to response
        stream.pipe(res)
        
        stream.on('error', (error) => {
          console.error(`[Jobs API] Stream error: ${error.message}`)
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' })
          }
        })
      } catch (error) {
        console.error(`[Jobs API] Error downloading from remote node: ${error.message}`)
        return res.status(500).json({ error: `Download failed: ${error.message}` })
      }
    } else {
      return res.status(400).json({ error: 'Download not supported for this node type' })
    }
  } catch (error) {
    console.error(`[Jobs API] Error in download endpoint: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Download output file from a job (with filename - for backward compatibility)
router.get('/:id/download/:filename', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed' })
    }

    const filename = req.params.filename
    const node = await nodeManager.getNode(job.nodeId)
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }

    // If node uses HTTP API, proxy the download
    if (node.connectionType === 'http' || !node.connectionType) {
      try {
        const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
        const apiClient = new RemoteAPIClient(node)
        
        // Use remote job ID if available, otherwise use local job ID
        const remoteJobId = job.remoteJobId || job.id
        const stream = await apiClient.downloadJobOutput(remoteJobId, filename)
        
        // Determine content type based on file extension
        let contentType = 'video/mp4' // default
        const filenameLower = filename.toLowerCase()
        if (filenameLower.endsWith('.avi')) {
          contentType = 'video/x-msvideo'
        } else if (filenameLower.endsWith('.mov')) {
          contentType = 'video/quicktime'
        } else if (filenameLower.endsWith('.mkv')) {
          contentType = 'video/x-matroska'
        } else if (filenameLower.endsWith('.webm')) {
          contentType = 'video/webm'
        }
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', contentType)
        
        // Pipe stream to response
        stream.pipe(res)
        
        stream.on('error', (error) => {
          console.error(`[Jobs API] Stream error: ${error.message}`)
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' })
          }
        })
      } catch (error) {
        console.error(`[Jobs API] Error downloading from remote node: ${error.message}`)
        return res.status(500).json({ error: `Download failed: ${error.message}` })
      }
    } else {
      return res.status(400).json({ error: 'Download not supported for this node type' })
    }
  } catch (error) {
    console.error(`[Jobs API] Error in download endpoint: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Refresh job status from remote node
router.post('/:id/refresh', async (req, res) => {
  try {
    console.log(`[Jobs API] Refresh requested for job ${req.params.id}`)
    
    const job = await jobManager.getJob(req.params.id)
    if (!job) {
      console.error(`[Jobs API] Job ${req.params.id} not found`)
      return res.status(404).json({ error: 'Job not found' })
    }

    console.log(`[Jobs API] Job found: ${job.id}, remoteJobId: ${job.remoteJobId}, nodeId: ${job.nodeId}, status: ${job.status}`)

    // If job has a remote job ID and node, refresh from remote
    if (job.remoteJobId && job.nodeId) {
      const node = await nodeManager.getNode(job.nodeId)
      console.log(`[Jobs API] Node found: ${node ? node.name : 'null'}, connectionType: ${node?.connectionType}`)
      
      if (!node) {
        return res.status(404).json({ 
          error: `Node ${job.nodeId} not found`,
          job: job,
        })
      }
      
      if (node.connectionType === 'http' || !node.connectionType) {
        try {
          const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
          const apiClient = new RemoteAPIClient(node)
          
          console.log(`[Jobs API] Attempting to fetch job ${job.remoteJobId} from ${node.host}:${node.apiPort || 9090}`)
          
          // Test connection first
          const isConnected = await apiClient.testConnection()
          if (!isConnected) {
            return res.status(503).json({
              error: `Cannot connect to remote node ${node.host}:${node.apiPort || 9090}. Please check if the remote API server is running.`,
              job: job,
            })
          }
          
          const remoteJob = await apiClient.getJob(job.remoteJobId, 30000)
          console.log(`[Jobs API] Remote job status: ${remoteJob.status}, progress: ${remoteJob.progress}%`)
          
          // Update local job with remote status
          const updateData = {
            progress: remoteJob.progress || 0,
            status: remoteJob.status,
            error: remoteJob.error || null,
          }
          
          // If job is completed, fetch output files
          if (remoteJob.status === 'completed') {
            try {
              console.log(`[Jobs API] Job completed, fetching output files`)
              const outputs = await apiClient.listJobOutputs(job.remoteJobId)
              if (outputs && outputs.output_files) {
                updateData.outputFiles = outputs.output_files
                console.log(`[Jobs API] Found ${outputs.output_files.length} output files`)
              }
            } catch (error) {
              console.error(`[Jobs API] Error fetching output files during refresh: ${error.message}`)
              // Don't fail the refresh if we can't get output files
            }
          }
          
          await jobManager.updateJob(job.id, updateData)
          
          const updatedJob = await jobManager.getJob(job.id)
          console.log(`[Jobs API] Job ${job.id} refreshed successfully. New status: ${updatedJob.status}`)
          
          return res.json({
            message: 'Job status refreshed successfully',
            job: updatedJob,
          })
        } catch (error) {
          console.error(`[Jobs API] Error refreshing job from remote node:`, {
            message: error.message,
            stack: error.stack,
            jobId: job.id,
            remoteJobId: job.remoteJobId,
            nodeId: job.nodeId,
          })
          
          return res.status(500).json({ 
            error: `Failed to refresh job: ${error.message}`,
            details: {
              remoteJobId: job.remoteJobId,
              nodeId: job.nodeId,
              nodeHost: node?.host,
            },
            job: job, // Return current job status
          })
        }
      } else {
        return res.status(400).json({
          error: `Job uses SSH connection type, cannot refresh via HTTP API`,
          job: job,
        })
      }
    } else {
      console.log(`[Jobs API] Job ${job.id} has no remoteJobId or nodeId. remoteJobId: ${job.remoteJobId}, nodeId: ${job.nodeId}`)
      
      // If no remote job, try to recover from remote node
      if (job.nodeId) {
        const node = await nodeManager.getNode(job.nodeId)
        if (node && (node.connectionType === 'http' || !node.connectionType)) {
          try {
            console.log(`[Jobs API] Attempting to recover job from remote node by listing all jobs`)
            const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
            const apiClient = new RemoteAPIClient(node)
            
            const remoteJobs = await apiClient.listJobs()
            console.log(`[Jobs API] Found ${remoteJobs.length} jobs on remote node`)
            
            // Try to find matching job by input parameters
            const matchingJob = remoteJobs.find(rj => {
              // Match by input method and path/url
              if (rj.input_method === job.inputMethod) {
                if (job.inputMethod === 'youtube') {
                  return rj.youtube_url === job.youtubeUrl
                } else {
                  return rj.manual_path === job.manualPath
                }
              }
              return false
            })
            
            if (matchingJob) {
              console.log(`[Jobs API] Found matching remote job: ${matchingJob.id}`)
              // Update local job with remote job ID
              await jobManager.updateJob(job.id, { remoteJobId: matchingJob.id })
              
              // Now fetch the job status with the new remote job ID
              const apiClient = new RemoteAPIClient(node)
              const remoteJob = await apiClient.getJob(matchingJob.id, 30000)
              
              const updateData = {
                progress: remoteJob.progress || 0,
                status: remoteJob.status,
                error: remoteJob.error || null,
              }
              
              if (remoteJob.status === 'completed') {
                try {
                  const outputs = await apiClient.listJobOutputs(matchingJob.id)
                  if (outputs && outputs.output_files) {
                    updateData.outputFiles = outputs.output_files
                  }
                } catch (error) {
                  console.error(`[Jobs API] Error fetching output files: ${error.message}`)
                }
              }
              
              await jobManager.updateJob(job.id, updateData)
              
              return res.json({
                message: 'Job recovered and refreshed successfully',
                job: await jobManager.getJob(job.id),
              })
            }
          } catch (error) {
            console.error(`[Jobs API] Error recovering job: ${error.message}`)
          }
        }
      }
      
      return res.json({
        message: 'Job has no remote node to refresh from. Job may have been created locally or remote job ID is missing.',
        job: job,
      })
    }
  } catch (error) {
    console.error(`[Jobs API] Unexpected error in refresh:`, error)
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

export default router

