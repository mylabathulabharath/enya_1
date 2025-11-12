import axios from 'axios'
import FormData from 'form-data'

/**
 * Remote API Client
 * Connects to Python API server running in Docker containers
 */
export class RemoteAPIClient {
  constructor(node) {
    this.node = node
    this.baseURL = `http://${node.host}:${node.apiPort || 9090}`
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 second timeout
    })
  }

  async testConnection() {
    try {
      console.log(`[RemoteAPI] Testing connection to: ${this.baseURL}/health`)
      console.log(`[RemoteAPI] Node config:`, {
        host: this.node.host,
        apiPort: this.node.apiPort,
        baseURL: this.baseURL
      })
      
      const response = await axios.get(`${this.baseURL}/health`, { 
        timeout: 10000, // Increased timeout to 10 seconds
        validateStatus: () => true // Don't throw on any status code
      })
      
      console.log(`[RemoteAPI] Response status: ${response.status}`)
      console.log(`[RemoteAPI] Response data:`, JSON.stringify(response.data, null, 2))
      
      // Check if we got a valid response
      if (response.status === 200) {
        // Check if response.data exists and has status field
        if (response.data && response.data.status === 'ok') {
          console.log(`[RemoteAPI] Connection test SUCCESS for ${this.baseURL}`)
          return true
        } else {
          console.error(`[RemoteAPI] Unexpected response format. Expected status: 'ok', got:`, response.data)
          return false
        }
      } else {
        console.error(`[RemoteAPI] HTTP status ${response.status} for ${this.baseURL}/health`)
        return false
      }
    } catch (error) {
      console.error(`[RemoteAPI] Connection test error for ${this.baseURL}:`, {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      })
      
      if (error.code === 'ECONNREFUSED') {
        console.error(`[RemoteAPI] Connection refused to ${this.baseURL} - Is the API server running?`)
      } else if (error.code === 'ETIMEDOUT') {
        console.error(`[RemoteAPI] Connection timeout to ${this.baseURL} - Check network/VPN`)
      } else if (error.code === 'ENOTFOUND') {
        console.error(`[RemoteAPI] Host not found: ${this.node.host} - Check hostname/IP`)
      } else if (error.response) {
        console.error(`[RemoteAPI] HTTP error ${error.response.status}:`, error.response.data)
      } else {
        console.error(`[RemoteAPI] Connection test failed:`, error.message)
      }
      return false
    }
  }

  async getStatus() {
    try {
      const response = await this.client.get('/status')
      return response.data
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`)
    }
  }

  async uploadFile(fileBuffer, filename, mimetype, onProgress) {
    const formData = new FormData()
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: mimetype,
    })

    try {
      // Use axios directly (not this.client) to have better control over form-data
      const response = await axios.post(
        `${this.baseURL}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300000, // 5 minutes for large files
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              onProgress(percentCompleted)
            }
          },
        }
      )
      return response.data
    } catch (error) {
      console.error(`[RemoteAPI] Upload failed:`, error.message)
      throw new Error(`Upload failed: ${error.response?.data?.error || error.message}`)
    }
  }

  async createJob(jobData) {
    try {
      const response = await this.client.post('/jobs', jobData)
      return response.data
    } catch (error) {
      throw new Error(`Failed to create job: ${error.message}`)
    }
  }

  async getJob(jobId, timeout = 30000) {
    try {
      // Use a separate axios call with custom timeout for long-running jobs
      const response = await axios.get(`${this.baseURL}/jobs/${jobId}`, {
        timeout: timeout,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      })
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.data?.error || 'Unknown error'}`)
      }
      
      return response.data
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw new Error(`Failed to get job: ${error.response.data?.error || error.message}`)
      } else if (error.code === 'ECONNABORTED') {
        // Request timeout
        throw new Error(`Request timeout after ${timeout}ms`)
      } else if (error.code === 'ECONNREFUSED') {
        // Connection refused
        throw new Error(`Connection refused to ${this.baseURL}`)
      } else {
        // Other errors
        throw new Error(`Failed to get job: ${error.message}`)
      }
    }
  }

  async listJobs() {
    try {
      const response = await this.client.get('/jobs')
      return response.data.jobs || []
    } catch (error) {
      throw new Error(`Failed to list jobs: ${error.message}`)
    }
  }

  async cancelJob(jobId) {
    try {
      const response = await this.client.post(`/jobs/${jobId}/cancel`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to cancel job: ${error.message}`)
    }
  }

  async listFiles() {
    try {
      const response = await this.client.get('/files')
      return response.data.files || []
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }
  }

  async listJobOutputs(jobId) {
    try {
      const response = await this.client.get(`/jobs/${jobId}/outputs`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to list job outputs: ${error.message}`)
    }
  }

  async downloadJobOutput(jobId, filename) {
    try {
      const response = await this.client.get(`/jobs/${jobId}/download/${filename}`, {
        responseType: 'stream',
        timeout: 600000, // 10 minutes for large video files
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to download job output: ${error.message}`)
    }
  }

  getDownloadUrl(jobId, filename) {
    return `${this.baseURL}/jobs/${jobId}/download/${encodeURIComponent(filename)}`
  }
}

