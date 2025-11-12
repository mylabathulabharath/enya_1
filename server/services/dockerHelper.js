/**
 * Docker Helper Utilities
 * Helper functions for Docker container operations
 */

export class DockerHelper {
  /**
   * Check if we're connecting to a Docker container
   * This can be used to adjust commands or paths
   */
  static isDockerContainer(node) {
    // Check if node location or name suggests Docker
    return (
      node.location?.toLowerCase().includes('docker') ||
      node.name?.toLowerCase().includes('docker') ||
      node.host?.includes('docker')
    )
  }

  /**
   * Get the workspace path - defaults to /workspace
   * Can be customized per node if needed
   */
  static getWorkspacePath(node) {
    return node.workspacePath || '/workspace'
  }

  /**
   * Get the input videos path
   */
  static getInputVideosPath(node) {
    const workspace = this.getWorkspacePath(node)
    return `${workspace}/input_videos`
  }

  /**
   * Verify Docker container setup
   */
  static async verifyContainerSetup(sshExecutor, node) {
    const workspace = this.getWorkspacePath(node)
    const checks = []

    // Check workspace exists
    const workspaceCheck = await sshExecutor.execCommand(
      node,
      `test -d ${workspace} && echo "exists" || echo "not found"`
    )
    checks.push({
      name: 'Workspace directory',
      path: workspace,
      exists: workspaceCheck.stdout.trim() === 'exists',
    })

    // Check input_videos folder
    const inputVideosPath = this.getInputVideosPath(node)
    const inputVideosCheck = await sshExecutor.execCommand(
      node,
      `test -d ${inputVideosPath} && echo "exists" || echo "not found"`
    )
    checks.push({
      name: 'Input videos directory',
      path: inputVideosPath,
      exists: inputVideosCheck.stdout.trim() === 'exists',
    })

    // Check pipeline.py exists
    const pipelineCheck = await sshExecutor.execCommand(
      node,
      `test -f ${workspace}/pipeline.py && echo "exists" || echo "not found"`
    )
    checks.push({
      name: 'pipeline.py',
      path: `${workspace}/pipeline.py`,
      exists: pipelineCheck.stdout.trim() === 'exists',
    })

    // Check pipeline_wrapper.py exists
    const wrapperCheck = await sshExecutor.execCommand(
      node,
      `test -f ${workspace}/pipeline_wrapper.py && echo "exists" || echo "not found"`
    )
    checks.push({
      name: 'pipeline_wrapper.py',
      path: `${workspace}/pipeline_wrapper.py`,
      exists: wrapperCheck.stdout.trim() === 'exists',
    })

    return checks
  }
}

