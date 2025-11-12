import { nodeManager } from './nodeManager.js'
import { SSHExecutor } from './sshExecutor.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use environment variable for file path (for Railway deployment)
// Default to data/jobs.json in project root for local development
const JOBS_FILE = process.env.JOBS_FILE_PATH || path.join(__dirname, '../../data/jobs.json')

export class JobManager {
  constructor() {
    this.jobs = new Map()
    this.nodeManager = nodeManager
    this.sshExecutor = new SSHExecutor()
    this.saveTimer = null
    this.loadJobs().catch(err => {
      console.error('[JobManager] Error loading jobs:', err)
    })
  }

  async loadJobs() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(JOBS_FILE)
      await fs.mkdir(dataDir, { recursive: true })
      
      // Try to load existing jobs
      try {
        const data = await fs.readFile(JOBS_FILE, 'utf-8')
        const jobsArray = JSON.parse(data)
        
        // Convert array to Map
        for (const job of jobsArray) {
          this.jobs.set(job.id, job)
        }
        
        console.log(`[JobManager] Loaded ${this.jobs.size} jobs from persistent storage`)
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('[JobManager] No existing jobs file found, starting fresh')
        } else {
          throw err
        }
      }
    } catch (error) {
      console.error('[JobManager] Error loading jobs from file:', error)
      // Continue with empty jobs if loading fails
    }
  }

  async saveJobs(immediate = false) {
    // Debounce saves to avoid too many file writes
    if (this.saveTimer && !immediate) {
      clearTimeout(this.saveTimer)
    }
    
    const save = async () => {
      try {
        // Ensure data directory exists
        const dataDir = path.dirname(JOBS_FILE)
        await fs.mkdir(dataDir, { recursive: true })
        
        // Convert Map to array
        const jobsArray = Array.from(this.jobs.values())
        
        // Write to file
        await fs.writeFile(JOBS_FILE, JSON.stringify(jobsArray, null, 2), 'utf-8')
        console.log(`[JobManager] Saved ${jobsArray.length} jobs to persistent storage`)
      } catch (error) {
        console.error('[JobManager] Error saving jobs to file:', error)
        // Don't throw - we don't want to fail operations if saving fails
      }
    }
    
    if (immediate) {
      await save()
    } else {
      // Debounce: wait 2 seconds before saving
      this.saveTimer = setTimeout(save, 2000)
    }
  }

  async getAllJobs() {
    return Array.from(this.jobs.values())
  }

  async getJob(id) {
    return this.jobs.get(id) || null
  }

  async addJob(job) {
    this.jobs.set(job.id, job)
    await this.saveJobs(true) // Save immediately for new jobs
    return job
  }

  async updateJob(id, updates) {
    const job = this.jobs.get(id)
    if (!job) {
      throw new Error('Job not found')
    }
    const updated = { ...job, ...updates, updatedAt: new Date().toISOString() }
    this.jobs.set(id, updated)
    await this.saveJobs()
    return updated
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
    await this.saveJobs()
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

      console.log(`[JobManager] Executing job ${jobId} on node ${node.name} (${node.host})`)

      // Use HTTP API if connection type is HTTP, otherwise use SSH
      if (node.connectionType === 'http' || !node.connectionType) {
        // Use HTTP API client
        const { RemoteAPIClient } = await import('./remoteAPIClient.js')
        const apiClient = new RemoteAPIClient(node)
        
        // Test connection first
        console.log(`[JobManager] Testing connection to ${node.host}:${node.apiPort || 9090}`)
        const isConnected = await apiClient.testConnection()
        if (!isConnected) {
          throw new Error(`Cannot connect to remote node ${node.host}:${node.apiPort || 9090}. Please check if the remote API server is running.`)
        }
        
        console.log(`[JobManager] Connection successful, creating job on remote node`)
        
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
        
        console.log(`[JobManager] Remote job created: ${remoteJob.id}`)
        
        // Store remote job ID
        await this.updateJob(jobId, { remoteJobId: remoteJob.id })
        
        // Start polling in background (don't await - let it run asynchronously)
        this.pollRemoteJobStatus(jobId, node, remoteJob.id).catch((error) => {
          console.error(`[JobManager] Polling error for job ${jobId}:`, error)
          // Don't mark as failed here - let the polling function handle it
        })
        
        console.log(`[JobManager] Started polling for job ${jobId}`)
      } else {
        // Use SSH executor
        const command = this.buildPipelineCommand(job)
        await this.sshExecutor.executeCommand(node, command, (progress) => {
          this.updateJob(jobId, { progress }).catch(console.error)
        })
        
        // Update job status to completed
        await this.updateJob(jobId, {
          status: 'completed',
          progress: 100,
        })
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
    
    // Poll for up to 24 hours (jobs can run for a very long time)
    const maxAttempts = 43200 // 24 hours with 2 second intervals
    const maxConsecutiveFailures = 10 // Allow up to 10 consecutive failures before giving up
    let attempts = 0
    let consecutiveFailures = 0
    let lastSuccessfulPoll = Date.now()
    
    console.log(`[JobManager] Starting to poll remote job ${remoteJobId} for local job ${localJobId}`)
    
    while (attempts < maxAttempts) {
      try {
        // Increase timeout for long-running jobs (30 seconds)
        const remoteJob = await apiClient.getJob(remoteJobId, 30000)
        
        // Reset consecutive failures on successful poll
        consecutiveFailures = 0
        lastSuccessfulPoll = Date.now()
        
        // Update local job status
        const updateData = {
          progress: remoteJob.progress || 0,
          status: remoteJob.status,
          error: remoteJob.error,
        }
        
        // If job is completed, try to get output files
        if (remoteJob.status === 'completed' && remoteJob.output_files) {
          updateData.outputFiles = remoteJob.output_files
        }
        
        await this.updateJob(localJobId, updateData)
        
        console.log(`[JobManager] Job ${localJobId} (remote: ${remoteJobId}) status: ${remoteJob.status}, progress: ${remoteJob.progress}%`)
        
        // Check if job is complete
        if (remoteJob.status === 'completed' || remoteJob.status === 'failed' || remoteJob.status === 'cancelled') {
          console.log(`[JobManager] Job ${localJobId} finished with status: ${remoteJob.status}`)
          
          // If completed, fetch output files if not already in job
          if (remoteJob.status === 'completed') {
            try {
              const outputs = await apiClient.listJobOutputs(remoteJobId)
              if (outputs && outputs.output_files) {
                await this.updateJob(localJobId, { outputFiles: outputs.output_files })
                console.log(`[JobManager] Found ${outputs.output_files.length} output files for job ${localJobId}`)
              }
            } catch (error) {
              console.error(`[JobManager] Error fetching output files: ${error.message}`)
              // Don't fail the job if we can't fetch output files - they might be available later
            }
          }
          break
        }
        
        // Wait before next poll (poll every 5 seconds to reduce load)
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
        
      } catch (error) {
        consecutiveFailures++
        const timeSinceLastSuccess = Date.now() - lastSuccessfulPoll
        const minutesSinceLastSuccess = Math.floor(timeSinceLastSuccess / 60000)
        
        console.warn(`[JobManager] Error polling remote job ${remoteJobId} (attempt ${attempts + 1}, consecutive failures: ${consecutiveFailures}):`, error.message)
        
        // Only mark as failed if we've had many consecutive failures AND it's been a while since last success
        if (consecutiveFailures >= maxConsecutiveFailures && timeSinceLastSuccess > 300000) {
          // 5 minutes without a successful poll and 10+ consecutive failures
          console.error(`[JobManager] Giving up on job ${localJobId} after ${consecutiveFailures} consecutive failures and ${minutesSinceLastSuccess} minutes without success`)
          
          // Check one more time if the job is actually running on the remote side
          try {
            const lastCheck = await apiClient.getJob(remoteJobId, 10000)
            if (lastCheck.status === 'running') {
              // Job is still running, but we can't poll it - mark as "unknown" or keep as "running"
              console.warn(`[JobManager] Job ${localJobId} is still running on remote but polling is failing. Keeping status as running.`)
              await this.updateJob(localJobId, {
                status: 'running',
                error: `Connection issues - job may still be running. Last poll error: ${error.message}`,
              })
              // Don't break - keep trying to poll, but less frequently
              await new Promise(resolve => setTimeout(resolve, 30000)) // Wait 30 seconds before retrying
              attempts++
              consecutiveFailures = 0 // Reset on successful check
              continue
            } else {
              // Job has a final status, update it
              await this.updateJob(localJobId, {
                status: lastCheck.status,
                progress: lastCheck.progress || 0,
                error: lastCheck.error || `Polling failed: ${error.message}`,
              })
              break
            }
          } catch (finalError) {
            // Can't even do a final check - but don't mark as failed, keep as running with error message
            console.error(`[JobManager] Final check also failed for job ${localJobId}:`, finalError.message)
            await this.updateJob(localJobId, {
              status: 'running', // Keep as running - don't assume it failed
              error: `Connection lost to remote node. Job may still be running. Last error: ${error.message}. Use refresh button to check status.`,
            })
            // Don't break - continue polling but with longer delays
            await new Promise(resolve => setTimeout(resolve, 60000)) // Wait 60 seconds before retrying
            attempts++
            continue
          }
        } else {
          // Temporary failure - wait longer before retrying (exponential backoff)
          const backoffDelay = Math.min(5000 * Math.pow(2, Math.min(consecutiveFailures - 1, 4)), 60000) // Max 60 seconds
          console.log(`[JobManager] Waiting ${backoffDelay}ms before retry (backoff, consecutive failures: ${consecutiveFailures})`)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
          attempts++
        }
      }
    }
    
    if (attempts >= maxAttempts) {
      console.error(`[JobManager] Polling timed out for job ${localJobId} after ${maxAttempts} attempts`)
      // Don't mark as failed - the job might still be running
      await this.updateJob(localJobId, {
        error: `Polling timeout - job may still be running on remote node`,
      })
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
}

