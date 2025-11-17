import { nodeManager } from './nodeManager.js'
import { SSHExecutor } from './sshExecutor.js'
import { ensureDataDir, readJsonFile, writeJsonFile, storagePaths } from './storage.js'

export class JobManager {
  constructor() {
    this.jobs = new Map()
    this.nodeManager = nodeManager
    this.sshExecutor = new SSHExecutor()
    ensureDataDir()
    this.loadJobsFromDisk()
  }

  async getAllJobs() {
    return Array.from(this.jobs.values()).map((job) => this.withDerivedFields(job))
  }

  async getJob(id) {
    const job = this.jobs.get(id) || null
    return this.withDerivedFields(job)
  }

  async addJob(job) {
    const initializedJob = {
      ...job,
      logs: job.logs || '',
      outputPath: job.outputPath || null,
    }
    this.jobs.set(initializedJob.id, initializedJob)
    this.persistJobs()
    return this.withDerivedFields(initializedJob)
  }

  async updateJob(id, updates) {
    const job = this.jobs.get(id)
    if (!job) {
      throw new Error('Job not found')
    }
    const updated = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.jobs.set(id, updated)
    this.persistJobs()
    return this.withDerivedFields(updated)
  }

  async cancelJob(id) {
    const job = this.jobs.get(id)
    if (!job) {
      throw new Error('Job not found')
    }

    // TODO: Actually cancel the running process on the node
    await this.updateJob(id, {
      status: 'cancelled',
      progress: 0,
    })
  }

  async deleteJob(id) {
    if (!this.jobs.has(id)) {
      throw new Error('Job not found')
    }
    this.jobs.delete(id)
    this.persistJobs()
  }

  withDerivedFields(job) {
    if (!job) return null
    if (!job.outputPath && job.logs) {
      const outputPath = this.extractFinalOutputPath(job.logs)
      if (outputPath) {
        const updated = { ...job, outputPath }
        this.jobs.set(job.id, updated)
        this.persistJobs()
        return updated
      }
    }
    return job
  }

  async executeJob(jobId) {
    const job = await this.getJob(jobId)
    if (!job) {
      throw new Error('Job not found')
    }

    try {
      // Update job status to running
      await this.updateJob(jobId, { status: 'running', progress: 0 })

      // Get node for execution
      const node = this.nodeManager.getNodeWithPassword(job.nodeId)
      if (!node) {
        throw new Error('Node not found')
      }

      // Use HTTP API if connection type is HTTP, otherwise use SSH
      if (node.connectionType === 'http' || !node.connectionType) {
        // Use HTTP API client
        const { RemoteAPIClient } = await import('./remoteAPIClient.js')
        const apiClient = new RemoteAPIClient(node)
        
        // Create job on remote node
        const remoteJob = await apiClient.createJob({
          inputMethod: job.inputMethod,
          youtubeUrl: job.youtubeUrl,
          manualPath: job.manualPath,
          unetFlag: job.unetFlag,
          faceRestoreFlag: job.faceRestoreFlag,
          upscaleFlag: job.upscaleFlag,
          upscaleValue: job.upscaleValue,
          claheFlag: job.claheFlag,
        })

        await this.updateJob(jobId, { remoteJobId: remoteJob.id })
        
        // Poll for job status
        await this.pollRemoteJobStatus(jobId, node, remoteJob.id)
      } else {
        // Use SSH executor
        const command = this.buildPipelineCommand(job)
        const result = await this.sshExecutor.executeCommand(node, command, (progress) => {
          this.updateJob(jobId, { progress }).catch(console.error)
        })
        
        // Update job status to completed
        const logText = result?.stdout || ''
        const updates = {
          status: 'completed',
          progress: 100,
          logs: logText,
        }
        const outputPath = this.extractFinalOutputPath(logText)
        if (outputPath) {
          updates.outputPath = outputPath
        }
        await this.updateJob(jobId, updates)
      }
    } catch (error) {
      console.error(`[JobManager] Job ${jobId} failed:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
      })
      await this.updateJob(jobId, {
        status: 'failed',
        error: error.message,
        errorDetails: {
          code: error.code,
          level: error.level,
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  async pollRemoteJobStatus(localJobId, node, remoteJobId) {
    const { RemoteAPIClient } = await import('./remoteAPIClient.js')
    const apiClient = new RemoteAPIClient(node)
    
    const maxAttempts = 3600 // 1 hour with 1 second intervals
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        const remoteJob = await apiClient.getJob(remoteJobId)
        
        // Update local job status
        const logText = remoteJob.output || ''
        const updatePayload = {
          progress: remoteJob.progress || 0,
          status: remoteJob.status,
          error: remoteJob.error,
          logs: logText,
        }
        const outputPath = this.extractFinalOutputPath(logText)
        if (outputPath) {
          updatePayload.outputPath = outputPath
        }
        await this.updateJob(localJobId, updatePayload)
        
        // Check if job is complete
        if (remoteJob.status === 'completed' || remoteJob.status === 'failed' || remoteJob.status === 'cancelled') {
          break
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000)) // Poll every 2 seconds
        attempts++
      } catch (error) {
        console.error(`[JobManager] Error polling remote job ${remoteJobId}:`, error.message)
        await this.updateJob(localJobId, {
          status: 'failed',
          error: `Failed to poll remote job: ${error.message}`,
        })
        break
      }
    }
  }

  buildPipelineCommand(job) {
    // Use wrapper script that handles both YouTube URLs and manual paths
    const parts = ['python', 'pipeline_wrapper.py']

    // Input path or URL (wrapper will determine if it's YouTube or manual)
    if (job.inputMethod === 'youtube') {
      parts.push(`"${job.youtubeUrl}"`)
    } else {
      parts.push(job.manualPath)
    }

    // Flags
    parts.push(job.unetFlag ? 'true' : 'false')
    parts.push(job.faceRestoreFlag ? 'true' : 'false')
    parts.push(job.upscaleFlag ? 'true' : 'false')
    parts.push(job.upscaleValue.toString())
    parts.push(job.claheFlag ? 'true' : 'false')

    return parts.join(' ')
  }

  loadJobsFromDisk() {
    const persistedJobs = readJsonFile(storagePaths.jobs, [])
    if (Array.isArray(persistedJobs)) {
      persistedJobs.forEach((job) => {
        if (job?.id) {
          this.jobs.set(job.id, {
            ...job,
            logs: job.logs || '',
            outputPath: job.outputPath || null,
          })
        }
      })
    }
  }

  persistJobs() {
    writeJsonFile(storagePaths.jobs, Array.from(this.jobs.values()))
  }

  extractFinalOutputPath(logText) {
    if (!logText) {
      return null
    }

    const lines = logText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(/final\s+video\s+at:\s*(.+)$/i)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }
}

