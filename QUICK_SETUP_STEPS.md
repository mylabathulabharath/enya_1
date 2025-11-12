# Quick Setup Steps - Docker Containers

## 🚀 Step-by-Step Setup for Docker Container Nodes

### Step 1: Set Up Python API Server on Remote Container

1. **Copy files to container:**
   ```bash
   # Copy these files to /workspace in your Docker container:
   - remote_api_server.py
   - requirements_remote.txt
   - pipeline_wrapper.py
   ```

2. **Install dependencies:**
   ```bash
   cd /workspace
   pip install -r requirements_remote.txt
   # Or: pip install flask flask-cors werkzeug
   ```

3. **Start the API server:**
   ```bash
   cd /workspace
   python remote_api_server.py --port 5000
   # Or run in background:
   nohup python remote_api_server.py --port 5000 > api_server.log 2>&1 &
   ```

4. **Verify it's running:**
   ```bash
   # Check if port 5000 is listening
   netstat -tuln | grep 5000
   
   # Test the endpoint
   curl http://localhost:5000/health
   ```

5. **Expose port in Docker (if needed):**
   - Add `-p 5000:5000` to docker run command
   - Or add to docker-compose.yml:
     ```yaml
     ports:
       - "8870:8870"  # Jupyter Lab
       - "5000:5000"  # API Server
     ```

### Step 2: Add Node in UI

1. **Open UI**: http://localhost:3000
2. **Go to Settings** page
3. **Click "Add Node"**
4. **Fill in:**
   - **Name**: `Docker Node 1`
   - **Host**: `192.168.27.14`
   - **Connection Type**: `HTTP API (Recommended for Docker)`
   - **API Port**: `5000`
   - **GPU Info**: `RTX 3090` (or your GPU)
   - **Location**: `Docker Container - VPN`
5. **Click "Add Node"**
6. **Click "Test Connection"** - should show "online" ✅
7. **Click "Verify Setup"** - should show all checks passed ✅

### Step 3: Upload Video and Create Job

1. **Go to "Create Job" page**
2. **Select "Upload Video"** (or Manual Path/YouTube URL)
3. **Select your node**
4. **Upload video file** (if using upload method)
5. **Configure pipeline options**
6. **Click "Create Job"**
7. **Monitor on Dashboard**

## 📋 Required Files on Remote Container

### `/workspace/` directory should contain:

```
/workspace/
├── remote_api_server.py      # Python API server (NEW)
├── pipeline_wrapper.py        # Wrapper script
├── pipeline.py                # Main pipeline script
├── Utils/
│   └── main_utils.py         # Utility functions
├── input_videos/             # Input videos folder
└── models/                   # Model files
```

## 🔧 Troubleshooting

### API Server Won't Start

```bash
# Check if port is in use
netstat -tuln | grep 5000

# Check Python version
python --version

# Check dependencies
pip list | grep flask

# View logs
tail -f api_server.log
```

### Cannot Connect from UI

1. **Check VPN is connected**
2. **Test from browser**: `http://192.168.27.14:5000/health`
3. **Check firewall rules**
4. **Verify Docker port mapping**
5. **Check server logs**

### File Upload Fails

1. **Check `input_videos` directory exists**
2. **Check permissions**: `chmod 755 /workspace/input_videos`
3. **Check disk space**: `df -h`
4. **Check file size** (max 10GB)

### Jobs Don't Execute

1. **Verify `pipeline.py` exists**
2. **Verify `pipeline_wrapper.py` exists**
3. **Check Python dependencies**
4. **Check GPU accessibility**: `nvidia-smi`
5. **View API server logs**

## 🎯 Key Points

- **No SSH Required**: Uses HTTP API instead
- **Port 5000**: Default API server port (changeable)
- **VPN Required**: Ensure VPN is connected
- **Auto-start**: Set up API server to start on container restart
- **File Upload**: Direct upload to container via API
- **Real-time Status**: Job status updates via API polling

## 📝 Next Steps

1. ✅ Set up API server on container
2. ✅ Add node in UI
3. ✅ Test connection
4. ✅ Verify setup
5. ✅ Upload test video
6. ✅ Create test job
7. ✅ Monitor execution

## 🆘 Need Help?

- Check `REMOTE_SETUP.md` for detailed setup
- Check server logs: `tail -f api_server.log`
- Test API: `curl http://192.168.27.14:5000/health`
- Verify port: `netstat -tuln | grep 5000`

