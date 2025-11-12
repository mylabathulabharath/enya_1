import React, { useState, useEffect } from 'react'
import { nodesAPI } from '../services/api'
import { Server, Plus, Trash2, TestTube, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

function SettingsPage() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddNode, setShowAddNode] = useState(false)
  const [verifyingNode, setVerifyingNode] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)
  const [newNode, setNewNode] = useState({
    name: '',
    host: '',
    connectionType: 'http', // 'http' or 'ssh'
    apiPort: '9090', // For HTTP API
    port: '22', // For SSH
    user: '',
    password: '',
    gpu: '',
    location: '',
  })

  useEffect(() => {
    fetchNodes()
  }, [])

  const fetchNodes = async () => {
    try {
      const res = await nodesAPI.getAll()
      setNodes(res.data)
    } catch (error) {
      console.error('Error fetching nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNode = async (e) => {
    e.preventDefault()
    try {
      await nodesAPI.add(newNode)
      setShowAddNode(false)
      setNewNode({
        name: '',
        host: '',
        connectionType: 'http',
        apiPort: '9090',
        port: '22',
        user: '',
        password: '',
        gpu: '',
        location: '',
      })
      fetchNodes()
    } catch (error) {
      console.error('Error adding node:', error)
      alert('Failed to add node: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDeleteNode = async (nodeId) => {
    if (!confirm('Are you sure you want to delete this node?')) return
    try {
      await nodesAPI.delete(nodeId)
      fetchNodes()
    } catch (error) {
      console.error('Error deleting node:', error)
      alert('Failed to delete node')
    }
  }

  const handleTestNode = async (nodeId) => {
    try {
      const res = await nodesAPI.test(nodeId)
      if (res.data.status === 'online') {
        alert('✅ Node connection successful!')
      } else {
        alert('❌ Node connection failed: ' + (res.data.error || 'Unknown error'))
      }
      fetchNodes()
    } catch (error) {
      console.error('Error testing node:', error)
      const errorMsg = error.response?.data?.error || error.message
      alert('❌ Node test failed: ' + errorMsg)
      if (error.response?.data?.troubleshooting) {
        console.log('Troubleshooting tips:', error.response.data.troubleshooting)
      }
    }
  }

  const handleVerifyNode = async (nodeId) => {
    setVerifyingNode(nodeId)
    try {
      const res = await nodesAPI.verify(nodeId)
      setVerificationResult(res.data)
    } catch (error) {
      console.error('Error verifying node:', error)
      alert('Verification failed: ' + (error.response?.data?.error || error.message))
      setVerificationResult(null)
    } finally {
      setVerifyingNode(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage nodes and configuration</p>
        </div>
        <button
          onClick={() => setShowAddNode(!showAddNode)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </button>
      </div>

      {/* Add Node Form */}
      {showAddNode && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Node</h2>
          <form onSubmit={handleAddNode} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Node Name</label>
                <input
                  type="text"
                  value={newNode.name}
                  onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                  className="input-field"
                  placeholder="Docker Node 1"
                  required
                />
              </div>
              <div>
                <label className="label">Host (IP Address)</label>
                <input
                  type="text"
                  value={newNode.host}
                  onChange={(e) => setNewNode({ ...newNode, host: e.target.value })}
                  className="input-field"
                  placeholder="192.168.27.14"
                  required
                />
              </div>
              <div>
                <label className="label">Connection Type</label>
                <select
                  value={newNode.connectionType}
                  onChange={(e) => setNewNode({ ...newNode, connectionType: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="http">HTTP API (Recommended for Docker)</option>
                  <option value="ssh">SSH</option>
                </select>
              </div>
              {newNode.connectionType === 'http' ? (
                <div>
                  <label className="label">API Port</label>
                  <input
                    type="number"
                    value={newNode.apiPort}
                    onChange={(e) => setNewNode({ ...newNode, apiPort: e.target.value })}
                    className="input-field"
                    placeholder="9090"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Port where remote_api_server.py is running</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">SSH Port</label>
                    <input
                      type="number"
                      value={newNode.port}
                      onChange={(e) => setNewNode({ ...newNode, port: e.target.value })}
                      className="input-field"
                      placeholder="22"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">User</label>
                    <input
                      type="text"
                      value={newNode.user}
                      onChange={(e) => setNewNode({ ...newNode, user: e.target.value })}
                      className="input-field"
                      placeholder="username"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input
                      type="password"
                      value={newNode.password}
                      onChange={(e) => setNewNode({ ...newNode, password: e.target.value })}
                      className="input-field"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="label">GPU Info</label>
                <input
                  type="text"
                  value={newNode.gpu}
                  onChange={(e) => setNewNode({ ...newNode, gpu: e.target.value })}
                  className="input-field"
                  placeholder="RTX 3090"
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  value={newNode.location}
                  onChange={(e) => setNewNode({ ...newNode, location: e.target.value })}
                  className="input-field"
                  placeholder="Docker Container - VPN"
                />
              </div>
            </div>
            {newNode.connectionType === 'http' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>HTTP API Setup:</strong> Make sure <code className="bg-white px-1 rounded">remote_api_server.py</code> is running on the container at port {newNode.apiPort || '9090'}. 
                  See setup instructions in <code className="bg-white px-1 rounded">REMOTE_SETUP.md</code>
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowAddNode(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Node
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Nodes List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Nodes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Host</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">GPU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Location</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">{node.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{node.host}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{node.gpu || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{node.location || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        node.status === 'online'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {node.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTestNode(node.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Test Connection"
                      >
                        <TestTube className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleVerifyNode(node.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Verify Setup"
                        disabled={verifyingNode === node.id}
                      >
                        {verifyingNode === node.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nodes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No nodes configured
            </div>
          )}
        </div>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Verification Result</h2>
            <button
              onClick={() => setVerificationResult(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <div className={`p-3 rounded-lg ${
              verificationResult.status === 'ready' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center">
                {verificationResult.status === 'ready' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                )}
                <span className="font-medium">{verificationResult.message}</span>
              </div>
            </div>
            <div className="space-y-1">
              {verificationResult.checks?.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{check.name}</span>
                  <span className={`text-sm font-medium ${
                    check.status === 'ok' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {check.status === 'ok' ? '✓ OK' : '✗ Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Docker Container Info */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Docker Container Setup</h3>
        <p className="text-sm text-gray-600 mb-2">
          For Docker containers accessible via VPN (e.g., <code className="bg-white px-1 rounded">192.168.27.14:8870</code>):
        </p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Jupyter Lab URL: <code className="bg-white px-1 rounded">http://192.168.27.14:8870/lab/workspaces/auto-7</code></li>
          <li>Workspace directory: <code className="bg-white px-1 rounded">/workspace</code></li>
          <li>Input videos folder: <code className="bg-white px-1 rounded">/workspace/input_videos</code></li>
          <li>Ensure VPN is connected before testing connection</li>
          <li>SSH port is typically 22 (or as configured in Docker)</li>
        </ul>
      </div>
    </div>
  )
}

export default SettingsPage

