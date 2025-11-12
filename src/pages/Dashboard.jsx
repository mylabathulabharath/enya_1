import React, { useState, useEffect } from 'react'
import { jobsAPI, nodesAPI } from '../services/api'
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Activity,
  RefreshCw,
  Trash2,
  Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
  running: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Cancelled' },
}

function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('all')

  const fetchData = async () => {
    try {
      const [jobsRes, nodesRes] = await Promise.all([
        jobsAPI.getAll().catch(err => ({ data: [] })),
        nodesAPI.getAll().catch(err => ({ data: [] })),
      ])
      setJobs(jobsRes.data || [])
      setNodes(nodesRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh every 10 seconds, but only if there are active jobs
    const interval = setInterval(() => {
      fetchData()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleCancelJob = async (jobId) => {
    if (!confirm('Are you sure you want to cancel this job?')) return
    try {
      await jobsAPI.cancel(jobId)
      fetchData()
    } catch (error) {
      console.error('Error cancelling job:', error)
      alert('Failed to cancel job')
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    try {
      await jobsAPI.delete(jobId)
      fetchData()
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job')
    }
  }

  const handleDownload = async (jobId) => {
    try {
      console.log(`[Dashboard] Starting download for job ${jobId}`)
      
      // Get output files for the job to verify they exist
      const response = await jobsAPI.getOutputs(jobId)
      const outputFiles = response.data?.output_files || []
      
      if (outputFiles.length === 0) {
        alert('No output files available for this job. The job may not have completed yet.')
        return
      }
      
      // There should be only one file in the final_without_post_process directory
      // Download the first (and only) file
      const fileToDownload = outputFiles[0]
      
      console.log(`[Dashboard] Downloading file: ${fileToDownload.name} (size: ${(fileToDownload.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Download the file - filename is optional, server will find the file
      jobsAPI.downloadOutput(jobId, fileToDownload.name)
    } catch (error) {
      console.error('[Dashboard] Error downloading output:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to download output file'
      alert(`Failed to download output file: ${errorMessage}`)
    }
  }

  const handleRefreshJob = async (jobId) => {
    try {
      console.log(`[Dashboard] Refreshing job ${jobId}`)
      const response = await jobsAPI.refresh(jobId)
      console.log('[Dashboard] Refresh response:', response.data)
      
      if (response.data?.error) {
        alert(`Failed to refresh: ${response.data.error}`)
      } else {
        alert(response.data?.message || 'Job status refreshed successfully')
      }
      
      fetchData() // Refresh the job list
    } catch (error) {
      console.error('[Dashboard] Error refreshing job:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to refresh job status'
      alert(`Failed to refresh job: ${errorMessage}`)
    }
  }

  const filteredJobs = selectedTab === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === selectedTab)

  const stats = {
    total: jobs.length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    pending: jobs.filter(j => j.status === 'pending').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor jobs and nodes</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Activity className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Running</p>
              <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
            </div>
            <PlayCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Nodes Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Nodes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{node.name}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    node.status === 'online'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {node.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Cpu className="h-4 w-4 mr-2" />
                  <span>{node.gpu || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <HardDrive className="h-4 w-4 mr-2" />
                  <span>{node.jobs || 0} active jobs</span>
                </div>
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  <span>{node.location || 'Remote'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jobs Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Jobs</h2>
          <div className="flex space-x-2">
            {['all', 'running', 'pending', 'completed', 'failed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === tab
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Input</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Node</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Progress</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const StatusIcon = statusConfig[job.status]?.icon || Clock
                const statusColor = statusConfig[job.status]?.color || 'text-gray-600'
                const statusBg = statusConfig[job.status]?.bg || 'bg-gray-50'
                const statusLabel = statusConfig[job.status]?.label || job.status

                return (
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 font-mono">
                      {job.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {job.inputPath?.split('/').pop() || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {job.nodeName || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBg} ${statusColor}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${job.progress || 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {job.createdAt
                        ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        {(job.status === 'running' || job.status === 'failed') && (
                          <button
                            onClick={() => handleRefreshJob(job.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Refresh Status"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        {job.status === 'running' && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {job.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleDownload(job.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="text-gray-600 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {(job.status === 'failed' || job.status === 'cancelled') && (
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-gray-600 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No jobs found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

