# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Application

```bash
# Terminal 1: Backend API Server
npm run server

# Terminal 2: Frontend Development Server
npm run dev
```

### 3. Access the Dashboard

Open your browser and navigate to: **http://localhost:3000**

### 4. Add a Node

1. Go to **Settings** page
2. Click **Add Node**
3. Fill in node details:
   - Name: `GPU Node 1`
   - Host: `192.168.1.100` (your node IP)
   - Port: `22`
   - User: `your_username`
   - SSH Key Path: `/home/user/.ssh/id_rsa`
   - GPU Info: `RTX 3090`
4. Click **Test Connection** to verify
5. Click **Add Node**

### 5. Create Your First Job

1. Go to **Create Job** page
2. Select **Manual Path** or **YouTube URL**
3. Enter video path or URL
4. Select a node
5. Configure options (Face Restore, Upscale, etc.)
6. Click **Create Job**

### 6. Monitor Jobs

Go to **Dashboard** to see:
- Job status and progress
- Node health
- Job history

## 📋 Remote Node Setup

On each remote GPU node, you need:

1. **Python environment** with pipeline dependencies
2. **pipeline.py** in `/workspace` directory
3. **pipeline_wrapper.py** in `/workspace` directory (copy from this repo)
4. **Utils/main_utils.py** with `get_input_video_path` function
5. **SSH access** configured

### Copy Wrapper Script to Node

```bash
# On your local machine
scp pipeline_wrapper.py user@node-host:/workspace/

# On the node, make it executable
ssh user@node-host
chmod +x /workspace/pipeline_wrapper.py
```

## 🎯 Key Features

- ✅ **Multi-Node Support**: Manage multiple GPU nodes
- ✅ **Job Queue**: Queue and monitor multiple jobs
- ✅ **Real-time Updates**: Auto-refresh every 5 seconds
- ✅ **YouTube Support**: Process videos from YouTube URLs
- ✅ **Progress Tracking**: Monitor job progress in real-time
- ✅ **Error Handling**: View job errors and retry

## 🔧 Troubleshooting

### Node Shows as Offline

```bash
# Test SSH connection manually
ssh -i /path/to/key user@node-host

# Check SSH key permissions
chmod 600 /path/to/key
```

### Jobs Fail Immediately

- Verify `pipeline.py` exists on node
- Check Python dependencies are installed
- Verify GPU is accessible
- Check node logs for errors

### YouTube URLs Don't Work

- Ensure `get_input_video_path` function exists
- Install `youtube-dl` or `yt-dlp` on node
- Check network connectivity on node

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for advanced configuration
- Review pipeline flow in [PIPELINE_FLOW_ANALYSIS.md](PIPELINE_FLOW_ANALYSIS.md)

## 💡 Tips

- Use **Test Connection** before adding nodes
- Monitor **Dashboard** for job status
- Check **Settings** to manage nodes
- Use **Filter tabs** to view specific job statuses

## 🆘 Need Help?

1. Check the troubleshooting section
2. Review server logs in terminal
3. Check node logs on remote servers
4. Verify pipeline.py works independently

