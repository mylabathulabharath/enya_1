# 🚀 START HERE - Quick Setup Guide

## Overview

This system uses **HTTP API** (not SSH) to connect to Docker containers. A Python API server runs in each container to handle job execution.

## ⚡ Quick Start (3 Steps)

### Step 1: Set Up Python API Server on Container

**On your Docker container (`192.168.27.14`):**

```bash
# 1. Copy files to /workspace
# Upload these files via Jupyter Lab or copy via Docker:
# - remote_api_server.py
# - requirements_remote.txt  
# - pipeline_wrapper.py

# 2. Install dependencies
cd /workspace
pip install flask flask-cors werkzeug

# 3. Start API server
python remote_api_server.py --port 5000

# 4. Test it works
curl http://localhost:5000/health
# Should return: {"status":"ok",...}
```

### Step 2: Add Node in UI

1. **Open UI**: http://localhost:3000
2. **Go to Settings** → **Add Node**
3. **Fill in:**
   - Name: `Docker Node 1`
   - Host: `192.168.27.14`
   - Connection Type: **HTTP API** (not SSH!)
   - API Port: `5000`
   - Location: `Docker Container`
4. **Click "Add Node"**
5. **Click "Test Connection"** → Should show ✅ online
6. **Click "Verify Setup"** → Should show all ✅ OK

### Step 3: Upload Video and Create Job

1. **Go to "Create Job"**
2. **Select "Upload Video"**
3. **Select your node**
4. **Upload video file**
5. **Configure options**
6. **Click "Create Job"**
7. **Monitor on Dashboard**

## 🔑 Key Points

- ✅ **No SSH Required** - Uses HTTP API
- ✅ **Python API Server** runs in container on port 5000
- ✅ **VPN Required** - Must be connected to access containers
- ✅ **File Upload** - Direct upload via UI
- ✅ **Real-time Status** - Job progress updates automatically

## 📁 Files Needed on Container

```
/workspace/
├── remote_api_server.py      # Python API server (NEW - required!)
├── pipeline_wrapper.py       # Wrapper script
├── pipeline.py               # Main pipeline
├── Utils/main_utils.py       # Utilities
└── input_videos/             # Upload folder
```

## 🐛 Troubleshooting

### Cannot Connect to Node

1. **Check API server is running:**
   ```bash
   # On container
   ps aux | grep remote_api_server
   netstat -tuln | grep 5000
   ```

2. **Test from browser:**
   ```
   http://192.168.27.14:5000/health
   ```

3. **Check VPN:** Ensure VPN is connected

4. **Check firewall:** Port 5000 must be accessible

### UI Loading Slowly

- Dashboard now refreshes every 10 seconds (was 5)
- Status checks have 3-second timeout
- Only refreshes when there are running jobs

### File Upload Fails

- Check node supports HTTP API (not SSH)
- Check `input_videos` directory exists
- Check file size (max 10GB)
- Check disk space on container

## 📚 Documentation

- **`REMOTE_SETUP.md`** - Detailed setup instructions
- **`QUICK_SETUP_STEPS.md`** - Step-by-step guide
- **`SETUP_CHECKLIST.md`** - Setup checklist
- **`DOCKER_SETUP.md`** - Docker-specific setup

## 🎯 What Changed?

1. **HTTP API Instead of SSH** - No SSH required for Docker containers
2. **Python API Server** - Runs in container on port 5000
3. **File Upload** - Direct upload via UI
4. **Optimized Loading** - Faster UI with better performance
5. **Better Error Handling** - Detailed error messages and logging

## 🆘 Need Help?

1. Check server logs (backend console)
2. Check API server logs (`api_server.log` on container)
3. Test API: `curl http://192.168.27.14:5000/health`
4. Verify VPN connection
5. Check Docker port mapping
6. Review troubleshooting in `REMOTE_SETUP.md`

## ✅ Success Checklist

- [ ] API server running on container
- [ ] Can access `http://192.168.27.14:5000/health`
- [ ] Node added in UI
- [ ] Connection test successful
- [ ] Setup verification passed
- [ ] File upload works
- [ ] Job creation works
- [ ] Job execution works

---

**Next:** Follow `REMOTE_SETUP.md` for detailed instructions.

