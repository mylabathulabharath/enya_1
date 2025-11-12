import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsAPI, nodesAPI } from '../services/api'
import { Video, Upload, Youtube, FileVideo, CheckCircle, XCircle, Loader } from 'lucide-react'

function JobCreator() {
  const navigate = useNavigate()
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    inputMethod: 'upload', // 'youtube', 'manual', or 'upload'
    youtubeUrl: '',
    manualPath: '',
    uploadedFile: null,
    nodeId: '',
    unetFlag: 'true',
    faceRestoreFlag: 'false',
    upscaleFlag: 'false',
    upscaleValue: '2.0',
    claheFlag: 'false',
  })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchNodes()
  }, [])

  const fetchNodes = async () => {
    try {
      const res = await nodesAPI.getAll()
      setNodes(res.data.filter(node => node.status === 'online'))
      if (res.data.length > 0 && res.data[0].status === 'online') {
        setFormData(prev => ({ ...prev, nodeId: res.data[0].id }))
      }
    } catch (error) {
      console.error('Error fetching nodes:', error)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (formData.inputMethod === 'youtube') {
      if (!formData.youtubeUrl.trim()) {
        newErrors.youtubeUrl = 'YouTube URL is required'
      } else if (!formData.youtubeUrl.includes('youtube.com') && !formData.youtubeUrl.includes('youtu.be')) {
        newErrors.youtubeUrl = 'Invalid YouTube URL'
      }
    } else if (formData.inputMethod === 'upload') {
      if (!formData.uploadedFile) {
        newErrors.uploadedFile = 'Please upload a video file'
      }
    } else {
      if (!formData.manualPath.trim()) {
        newErrors.manualPath = 'Video path is required'
      }
    }

    if (!formData.nodeId) {
      newErrors.nodeId = 'Please select a node'
    }

    if (formData.upscaleFlag === 'true') {
      const upscaleValue = parseFloat(formData.upscaleValue)
      if (isNaN(upscaleValue) || upscaleValue < 1.0 || upscaleValue > 4.0) {
        newErrors.upscaleValue = 'Upscale value must be between 1.0 and 4.0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileUpload = async (file) => {
    if (!formData.nodeId) {
      alert('Please select a node first')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentCompleted = Math.round((e.loaded * 100) / e.total)
            setUploadProgress(percentCompleted)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText)
              resolve(result)
            } catch (e) {
              reject(new Error('Invalid response'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })

        xhr.open('POST', `/api/upload/${formData.nodeId}`)
        xhr.send(uploadFormData)
      })

      const result = await uploadPromise
      setFormData(prev => ({
        ...prev,
        uploadedFile: file,
        manualPath: result.path || `input_videos/${file.name}`,
      }))
      alert('✅ File uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('❌ Upload failed: ' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      // If upload method, ensure file is uploaded
      if (formData.inputMethod === 'upload' && !formData.manualPath) {
        alert('Please upload a file first')
        setSubmitting(false)
        return
      }

      const jobData = {
        inputMethod: formData.inputMethod === 'upload' ? 'manual' : formData.inputMethod,
        youtubeUrl: formData.inputMethod === 'youtube' ? formData.youtubeUrl : null,
        manualPath: formData.inputMethod === 'upload' || formData.inputMethod === 'manual' 
          ? formData.manualPath 
          : null,
        nodeId: formData.nodeId,
        unetFlag: formData.unetFlag === 'true',
        faceRestoreFlag: formData.faceRestoreFlag === 'true',
        upscaleFlag: formData.upscaleFlag === 'true',
        upscaleValue: parseFloat(formData.upscaleValue),
        claheFlag: formData.claheFlag === 'true',
      }

      await jobsAPI.create(jobData)
      navigate('/')
    } catch (error) {
      console.error('Error creating job:', error)
      alert('Failed to create job: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Job</h1>
        <p className="text-gray-600 mt-1">Submit a video processing job to the pipeline</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Input Method Selection */}
        <div>
          <label className="label">Input Method</label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleInputChange('inputMethod', 'upload')}
              className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg transition-all ${
                formData.inputMethod === 'upload'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Video
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('inputMethod', 'manual')}
              className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg transition-all ${
                formData.inputMethod === 'manual'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              <FileVideo className="h-5 w-5 mr-2" />
              Manual Path
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('inputMethod', 'youtube')}
              className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg transition-all ${
                formData.inputMethod === 'youtube'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              <Youtube className="h-5 w-5 mr-2" />
              YouTube URL
            </button>
          </div>
        </div>

        {/* File Upload */}
        {formData.inputMethod === 'upload' && (
          <div>
            <label className="label">Upload Video File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    handleFileUpload(file)
                  }
                }}
                className="hidden"
                id="file-upload"
                disabled={uploading || !formData.nodeId}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer ${uploading || !formData.nodeId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? (
                  <div>
                    <Loader className="h-8 w-8 mx-auto mb-2 animate-spin text-primary-600" />
                    <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
                  </div>
                ) : formData.uploadedFile ? (
                  <div>
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-gray-900 font-medium">{formData.uploadedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to upload different file</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {!formData.nodeId ? 'Select a node first' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">MP4, AVI, MOV, MKV, WebM (max 10GB)</p>
                  </div>
                )}
              </label>
            </div>
            {errors.uploadedFile && (
              <p className="mt-1 text-sm text-red-600">{errors.uploadedFile}</p>
            )}
            {formData.uploadedFile && (
              <p className="mt-2 text-sm text-gray-600">
                File will be uploaded to: <code className="bg-gray-100 px-2 py-1 rounded">{formData.manualPath}</code>
              </p>
            )}
          </div>
        )}

        {/* YouTube URL Input */}
        {formData.inputMethod === 'youtube' && (
          <div>
            <label className="label">YouTube URL</label>
            <input
              type="text"
              value={formData.youtubeUrl}
              onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`input-field ${errors.youtubeUrl ? 'border-red-500' : ''}`}
            />
            {errors.youtubeUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.youtubeUrl}</p>
            )}
          </div>
        )}

        {/* Manual Path Input */}
        {formData.inputMethod === 'manual' && (
          <div>
            <label className="label">Video Path</label>
            <input
              type="text"
              value={formData.manualPath}
              onChange={(e) => handleInputChange('manualPath', e.target.value)}
              placeholder="input_videos/file.mp4"
              className={`input-field ${errors.manualPath ? 'border-red-500' : ''}`}
            />
            {errors.manualPath && (
              <p className="mt-1 text-sm text-red-600">{errors.manualPath}</p>
            )}
          </div>
        )}

        {/* Node Selection */}
        <div>
          <label className="label">Select Node</label>
          <select
            value={formData.nodeId}
            onChange={(e) => handleInputChange('nodeId', e.target.value)}
            className={`input-field ${errors.nodeId ? 'border-red-500' : ''}`}
          >
            <option value="">Select a node...</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} - {node.gpu || 'GPU'} ({node.status}) - {node.connectionType === 'http' ? 'HTTP API' : 'SSH'}
              </option>
            ))}
          </select>
          {errors.nodeId && (
            <p className="mt-1 text-sm text-red-600">{errors.nodeId}</p>
          )}
          {nodes.length === 0 && (
            <p className="mt-1 text-sm text-yellow-600">No online nodes available. Go to Settings to add nodes.</p>
          )}
        </div>

        {/* Pipeline Options */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Options</h3>

          {/* Face Restore */}
          <div className="mb-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="label mb-0">Face Restore</span>
              <button
                type="button"
                onClick={() =>
                  handleInputChange(
                    'faceRestoreFlag',
                    formData.faceRestoreFlag === 'true' ? 'false' : 'true'
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.faceRestoreFlag === 'true' ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.faceRestoreFlag === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Enable face enhancement for better facial features
            </p>
          </div>

          {/* Upscale */}
          <div className="mb-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="label mb-0">Background Upscale</span>
              <button
                type="button"
                onClick={() =>
                  handleInputChange(
                    'upscaleFlag',
                    formData.upscaleFlag === 'true' ? 'false' : 'true'
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.upscaleFlag === 'true' ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.upscaleFlag === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Upscale background using Real-ESRGAN
            </p>
          </div>

          {/* Upscale Value */}
          {formData.upscaleFlag === 'true' && (
            <div className="mb-4 ml-6">
              <label className="label">Upscale Value (1.0 - 4.0)</label>
              <input
                type="number"
                value={formData.upscaleValue}
                onChange={(e) => handleInputChange('upscaleValue', e.target.value)}
                min="1.0"
                max="4.0"
                step="0.1"
                className={`input-field ${errors.upscaleValue ? 'border-red-500' : ''}`}
              />
              {errors.upscaleValue && (
                <p className="mt-1 text-sm text-red-600">{errors.upscaleValue}</p>
              )}
            </div>
          )}

          {/* CLAHE */}
          <div className="mb-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="label mb-0">CLAHE Enhancement</span>
              <button
                type="button"
                onClick={() =>
                  handleInputChange(
                    'claheFlag',
                    formData.claheFlag === 'true' ? 'false' : 'true'
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.claheFlag === 'true' ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.claheFlag === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Apply Contrast Limited Adaptive Histogram Equalization
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center"
            disabled={submitting || nodes.length === 0}
          >
            {submitting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Create Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default JobCreator

