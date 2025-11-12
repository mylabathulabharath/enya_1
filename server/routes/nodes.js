import express from 'express'
import { nodeManager } from '../services/nodeManager.js'

const router = express.Router()

// Get all nodes
router.get('/', async (req, res) => {
  try {
    const nodes = await nodeManager.getAllNodes()
    res.json(nodes)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get node by ID
router.get('/:id', async (req, res) => {
  try {
    const node = await nodeManager.getNode(req.params.id)
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }
    res.json(node)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Add new node
router.post('/', async (req, res, next) => {
  try {
    const node = await nodeManager.addNode(req.body)
    res.status(201).json(node)
  } catch (error) {
    console.error(`[API] Error adding node:`, error)
    console.error(`[API] Error stack:`, error.stack)
    res.status(500).json({ 
      error: error.message || 'Failed to add node',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Update node
router.put('/:id', async (req, res) => {
  try {
    const node = await nodeManager.updateNode(req.params.id, req.body)
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }
    res.json(node)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete node
router.delete('/:id', async (req, res) => {
  try {
    await nodeManager.deleteNode(req.params.id)
    res.json({ message: 'Node deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Test node connection
router.post('/:id/test', async (req, res) => {
  try {
    // Use internal method to get node with password for testing
    const nodeWithPassword = nodeManager.getNodeWithPassword(req.params.id)
    if (!nodeWithPassword) {
      return res.status(404).json({ error: 'Node not found' })
    }

    const portInfo = nodeWithPassword.connectionType === 'http' 
      ? `${nodeWithPassword.host}:${nodeWithPassword.apiPort || 9090}` 
      : `${nodeWithPassword.host}:${nodeWithPassword.port || 22}`
    console.log(`[API] Testing node connection: ${nodeWithPassword.name} (${portInfo}, type: ${nodeWithPassword.connectionType || 'http'})`)
    const isOnline = await nodeManager.testNode(nodeWithPassword)
    await nodeManager.updateNode(req.params.id, { status: isOnline ? 'online' : 'offline' })

    if (isOnline) {
      res.json({ status: 'online', message: 'Connection successful' })
    } else {
      res.status(400).json({ 
        status: 'offline', 
        error: 'Connection failed. Check host, port, username, and password. Ensure VPN is connected if required.',
        troubleshooting: [
          'Verify VPN is connected',
          'Check SSH port (default: 22)',
          'Verify username and password are correct',
          'Ensure SSH service is running on the node',
          'Check firewall rules allow SSH connections',
          'For Docker containers, ensure SSH is accessible'
        ]
      })
    }
  } catch (error) {
    console.error(`[API] Error testing node ${req.params.id}:`, error)
    res.status(500).json({ error: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined })
  }
})

// Verify node setup (check workspace, pipeline files, etc.)
router.post('/:id/verify', async (req, res) => {
  try {
    const node = nodeManager.getNodeWithPassword(req.params.id)
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }

    // Use HTTP API if connection type is HTTP
    if (node.connectionType === 'http' || !node.connectionType) {
      const { RemoteAPIClient } = await import('../services/remoteAPIClient.js')
      const apiClient = new RemoteAPIClient(node)
      
      // Test connection
      const isConnected = await apiClient.testConnection()
      if (!isConnected) {
        return res.status(400).json({ error: 'Cannot connect to node API' })
      }
      
      // Get status from API
      const status = await apiClient.getStatus()
      
      const checks = [
        {
          name: 'Workspace directory',
          path: status.workspace?.path || '/workspace',
          status: status.workspace?.exists ? 'ok' : 'missing',
        },
        {
          name: 'Input videos directory',
          path: status.input_videos?.path || '/workspace/input_videos',
          status: status.input_videos?.exists ? 'ok' : 'missing',
        },
        {
          name: 'pipeline.py',
          path: '/workspace/pipeline.py',
          status: status.files?.pipeline_py ? 'ok' : 'missing',
        },
        {
          name: 'pipeline_wrapper.py',
          path: '/workspace/pipeline_wrapper.py',
          status: status.files?.pipeline_wrapper_py ? 'ok' : 'missing',
        },
        {
          name: 'Python',
          status: status.python?.includes('Python') ? 'ok' : 'missing',
          version: status.python || 'Unknown',
        },
      ]
      
      const allOk = checks.every(c => c.status === 'ok')
      res.json({
        status: allOk ? 'ready' : 'incomplete',
        checks,
        message: allOk 
          ? 'Node is ready for jobs' 
          : 'Some required files or directories are missing'
      })
    } else {
      // SSH verification (original code)
      const { SSHExecutor } = await import('../services/sshExecutor.js')
      const sshExecutor = new SSHExecutor()
      
      const isConnected = await sshExecutor.testConnection(node)
      if (!isConnected) {
        return res.status(400).json({ error: 'Cannot connect to node' })
      }

      const ssh = new (await import('node-ssh')).NodeSSH()
      await ssh.connect({
        host: node.host,
        port: node.port || 22,
        username: node.user,
        password: node.password,
        readyTimeout: 20000,
      })

      const checks = []
      
      const workspaceCheck = await ssh.execCommand('test -d /workspace && echo "exists" || echo "not found"')
      checks.push({
        name: 'Workspace directory',
        path: '/workspace',
        status: workspaceCheck.stdout.trim() === 'exists' ? 'ok' : 'missing',
      })

      const inputVideosCheck = await ssh.execCommand('test -d /workspace/input_videos && echo "exists" || echo "not found"')
      checks.push({
        name: 'Input videos directory',
        path: '/workspace/input_videos',
        status: inputVideosCheck.stdout.trim() === 'exists' ? 'ok' : 'missing',
      })

      const pipelineCheck = await ssh.execCommand('test -f /workspace/pipeline.py && echo "exists" || echo "not found"')
      checks.push({
        name: 'pipeline.py',
        path: '/workspace/pipeline.py',
        status: pipelineCheck.stdout.trim() === 'exists' ? 'ok' : 'missing',
      })

      const wrapperCheck = await ssh.execCommand('test -f /workspace/pipeline_wrapper.py && echo "exists" || echo "not found"')
      checks.push({
        name: 'pipeline_wrapper.py',
        path: '/workspace/pipeline_wrapper.py',
        status: wrapperCheck.stdout.trim() === 'exists' ? 'ok' : 'missing',
      })

      const pythonCheck = await ssh.execCommand('which python && python --version || echo "not found"')
      checks.push({
        name: 'Python',
        status: pythonCheck.stdout.includes('Python') ? 'ok' : 'missing',
        version: pythonCheck.stdout.trim(),
      })

      ssh.dispose()

      const allOk = checks.every(c => c.status === 'ok')
      res.json({
        status: allOk ? 'ready' : 'incomplete',
        checks,
        message: allOk 
          ? 'Node is ready for jobs' 
          : 'Some required files or directories are missing'
      })
    }
  } catch (error) {
    console.error(`[API] Error verifying node ${req.params.id}:`, error)
    res.status(500).json({ error: error.message })
  }
})

export default router

