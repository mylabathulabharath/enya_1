import { v4 as uuidv4 } from 'uuid'

export class NodeManager {
  constructor() {
    this.nodes = new Map()
    // Initialize with some example nodes (you can remove this and add via API)
    this.initializeDefaultNodes()
  }

  initializeDefaultNodes() {
    // Add default nodes if needed
    // This can be removed if you want to add nodes only via the UI
  }

  async getAllNodes() {
    const nodes = Array.from(this.nodes.values())
    
    // For performance, only check status for HTTP nodes, use cached for others
    // Check status in parallel with timeout
    const statusChecks = nodes.map(async (node) => {
      // Only check HTTP nodes, use cached status for SSH nodes
      if (node.connectionType === 'http' || !node.connectionType) {
        try {
          const statusPromise = this.checkNodeStatus(node)
          const timeoutPromise = new Promise((resolve) => 
            setTimeout(() => resolve('offline'), 2000)
          )
          node.status = await Promise.race([statusPromise, timeoutPromise])
        } catch (error) {
          node.status = 'offline'
        }
      }
      // For SSH nodes, keep existing status (don't check every time)
    })
    
    // Wait for all checks with overall timeout
    await Promise.race([
      Promise.all(statusChecks),
      new Promise((resolve) => setTimeout(resolve, 3000)) // Max 3 seconds total
    ])
    
    // Return nodes without password for security
    return nodes.map(node => {
      const { password, ...nodeWithoutPassword } = node
      return nodeWithoutPassword
    })
  }

  async getNode(id) {
    const node = this.nodes.get(id)
    if (node) {
      node.status = await this.checkNodeStatus(node)
      // Return node without password for security
      const { password, ...nodeWithoutPassword } = node
      return nodeWithoutPassword
    }
    return null
  }

  async addNode(nodeData) {
    // Parse ports properly, handling strings and numbers
    const parsePort = (value, defaultValue) => {
      if (value === null || value === undefined || value === '') return defaultValue
      const parsed = parseInt(String(value).trim())
      return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed
    }
    
    const connectionType = nodeData.connectionType || 'http'
    const apiPort = parsePort(nodeData.apiPort, 9090)
    const port = parsePort(nodeData.port, connectionType === 'ssh' ? 22 : 9090)
    
    const node = {
      id: uuidv4(),
      name: nodeData.name,
      host: nodeData.host?.trim() || '',
      connectionType: connectionType,
      port: port,
      apiPort: apiPort, // For HTTP API
      user: nodeData.user || '', // Optional for HTTP
      password: nodeData.password || '', // Optional for HTTP
      gpu: nodeData.gpu || '',
      location: nodeData.location || '',
      status: 'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log(`[NodeManager] Adding node with config:`, {
      name: node.name,
      host: node.host,
      connectionType: node.connectionType,
      apiPort: node.apiPort,
      port: node.port
    })

    // Test connection
    node.status = (await this.testNode(node)) ? 'online' : 'offline'

    this.nodes.set(node.id, node)
    
    // Return node without password for security
    const { password, ...nodeWithoutPassword } = node
    return nodeWithoutPassword
  }

  async updateNode(id, updates) {
    const node = this.nodes.get(id)
    if (!node) {
      throw new Error('Node not found')
    }
    const updated = { ...node, ...updates, updatedAt: new Date().toISOString() }
    
    // Ensure apiPort is set for HTTP nodes
    if ((updated.connectionType === 'http' || !updated.connectionType) && !updated.apiPort) {
      updated.apiPort = 9090
    }
    
    this.nodes.set(id, updated)
    
    // Return node without password for security
    const { password, ...nodeWithoutPassword } = updated
    return nodeWithoutPassword
  }

  async deleteNode(id) {
    if (!this.nodes.has(id)) {
      throw new Error('Node not found')
    }
    this.nodes.delete(id)
  }

  async testNode(node) {
    try {
      // Get node from internal storage or use provided node
      const nodeToTest = this.nodes.get(node.id) || node
      console.log(`[NodeManager] Testing connection to node: ${nodeToTest.name} (${nodeToTest.host})`)
      console.log(`[NodeManager] Node configuration:`, {
        id: nodeToTest.id,
        name: nodeToTest.name,
        host: nodeToTest.host,
        connectionType: nodeToTest.connectionType,
        apiPort: nodeToTest.apiPort,
        port: nodeToTest.port
      })
      
      // Use HTTP API if connection type is HTTP, otherwise use SSH
      if (nodeToTest.connectionType === 'http' || !nodeToTest.connectionType) {
        // Ensure apiPort is set
        if (!nodeToTest.apiPort) {
          nodeToTest.apiPort = 9090
          console.log(`[NodeManager] apiPort not set, defaulting to 9090`)
        }
        const { RemoteAPIClient } = await import('./remoteAPIClient.js')
        const apiClient = new RemoteAPIClient(nodeToTest)
        const result = await apiClient.testConnection()
        console.log(`[NodeManager] HTTP API connection test result for ${nodeToTest.name}: ${result ? 'SUCCESS' : 'FAILED'}`)
        return result
      } else {
        // SSH connection
        const { SSHExecutor } = await import('./sshExecutor.js')
        const sshExecutor = new SSHExecutor()
        const result = await sshExecutor.testConnection(nodeToTest)
        console.log(`[NodeManager] SSH connection test result for ${nodeToTest.name}: ${result ? 'SUCCESS' : 'FAILED'}`)
        return result
      }
    } catch (error) {
      console.error(`[NodeManager] Node ${node.id || node.name} test failed:`, error.message)
      console.error(`[NodeManager] Error stack:`, error.stack)
      return false
    }
  }

  async checkNodeStatus(node) {
    // Quick status check - use HTTP health check for HTTP nodes
    try {
      const nodeToCheck = this.nodes.get(node.id) || node
      
      // For HTTP nodes, do a quick health check
      if (nodeToCheck.connectionType === 'http' || !nodeToCheck.connectionType) {
        try {
          // Ensure apiPort is set
          if (!nodeToCheck.apiPort) {
            nodeToCheck.apiPort = 9090
          }
          const { RemoteAPIClient } = await import('./remoteAPIClient.js')
          const apiClient = new RemoteAPIClient(nodeToCheck)
          const isOnline = await apiClient.testConnection()
          return isOnline ? 'online' : 'offline'
        } catch (error) {
          console.error(`[NodeManager] Status check failed for ${nodeToCheck.name}:`, error.message)
          return 'offline'
        }
      } else {
        // For SSH nodes, use cached status or quick test
        return nodeToCheck.status || 'offline'
      }
    } catch (error) {
      console.error(`[NodeManager] Status check error:`, error.message)
      return 'offline'
    }
  }

  // Internal method to get node with password (for internal use only)
  getNodeWithPassword(id) {
    const node = this.nodes.get(id)
    if (node) {
      // Ensure apiPort is set for HTTP nodes
      if ((node.connectionType === 'http' || !node.connectionType) && !node.apiPort) {
        node.apiPort = 9090
        console.log(`[NodeManager] Set default apiPort 9090 for node ${id}`)
      }
    }
    return node || null
  }
}

// Export a singleton instance so all routes share the same NodeManager
export const nodeManager = new NodeManager()
