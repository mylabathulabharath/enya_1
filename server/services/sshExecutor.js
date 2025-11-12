import { NodeSSH } from 'node-ssh'

export class SSHExecutor {
  async testConnection(node) {
    const ssh = new NodeSSH()
    try {
      console.log(`[SSH] Attempting to connect to ${node.user}@${node.host}:${node.port || 22}`)
      await ssh.connect({
        host: node.host,
        port: node.port || 22,
        username: node.user,
        password: node.password,
        readyTimeout: 20000, // Increased timeout for VPN connections
        tryKeyboard: true,
        onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish([node.password])
          }
        },
      })
      console.log(`[SSH] Successfully connected to ${node.name} (${node.host})`)
      
      // Test if we can execute a simple command and verify workspace
      try {
        const pwdResult = await ssh.execCommand('pwd')
        console.log(`[SSH] Current directory: ${pwdResult.stdout.trim()}`)
        
        const workspaceCheck = await ssh.execCommand('test -d /workspace && echo "exists" || echo "not found"')
        if (workspaceCheck.stdout.trim() === 'exists') {
          console.log(`[SSH] Workspace directory (/workspace) verified`)
        } else {
          console.warn(`[SSH] Warning: Workspace directory (/workspace) not found`)
        }
      } catch (testError) {
        console.warn(`[SSH] Test command warning:`, testError.message)
        // Don't fail the connection test if workspace check fails
      }
      
      ssh.dispose()
      return true
    } catch (error) {
      console.error(`[SSH] Connection test failed for node ${node.name} (${node.host}):`, {
        message: error.message,
        code: error.code,
        level: error.level,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
      })
      try {
        ssh.dispose()
      } catch (disposeError) {
        // Ignore dispose errors
      }
      return false
    }
  }

  async executeCommand(node, command, progressCallback) {
    const ssh = new NodeSSH()
    try {
      console.log(`[SSH] Connecting to ${node.name} (${node.host}:${node.port || 22})`)
      await ssh.connect({
        host: node.host,
        port: node.port || 22,
        username: node.user,
        password: node.password,
        readyTimeout: 20000, // Increased timeout for VPN connections
        tryKeyboard: true,
        onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish([node.password])
          }
        },
      })
      console.log(`[SSH] Connected to ${node.name}, executing command: ${command}`)

      let stdout = ''
      let stderr = ''

      // Verify workspace exists
      const workspaceCheck = await ssh.execCommand('test -d /workspace && echo "exists" || echo "not found"')
      if (workspaceCheck.stdout.trim() !== 'exists') {
        throw new Error('Workspace directory /workspace not found on node')
      }
      console.log(`[SSH] Workspace directory verified`)

      const result = await ssh.execCommand(command, {
        cwd: '/workspace',
        onStdout: (chunk) => {
          const output = chunk.toString()
          stdout += output
          console.log(`[Node ${node.name}] stdout:`, output.trim())
          
          // Parse progress from output
          const progress = this.parseProgress(output)
          if (progress !== null && progressCallback) {
            progressCallback(progress)
          }
        },
        onStderr: (chunk) => {
          const error = chunk.toString()
          stderr += error
          console.error(`[Node ${node.name}] stderr:`, error.trim())
        },
      })

      console.log(`[SSH] Command completed with exit code: ${result.code}`)
      ssh.dispose()

      if (result.code !== 0) {
        const errorMsg = `Command failed with code ${result.code}`
        console.error(`[SSH] ${errorMsg}`, { stdout: stdout.slice(-500), stderr: stderr.slice(-500) })
        throw new Error(`${errorMsg}: ${stderr || stdout}`)
      }

      return result
    } catch (error) {
      console.error(`[SSH] Error executing command on ${node.name}:`, {
        message: error.message,
        code: error.code,
        level: error.level,
      })
      try {
        ssh.dispose()
      } catch (disposeError) {
        // Ignore dispose errors
      }
      throw error
    }
  }

  parseProgress(output) {
    // Parse progress from pipeline output
    // Look for patterns like "Progress: 50%" or "Task 3/8 completed"
    const progressMatch = output.match(/Progress:\s*(\d+)%/i)
    if (progressMatch) {
      return parseInt(progressMatch[1])
    }

    // Try to parse task progress (e.g., "Task 3/8")
    const taskMatch = output.match(/Task\s+(\d+)\s*\/\s*(\d+)/i)
    if (taskMatch) {
      const current = parseInt(taskMatch[1])
      const total = parseInt(taskMatch[2])
      return Math.round((current / total) * 100)
    }

    return null
  }
}

