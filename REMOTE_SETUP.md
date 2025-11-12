# Remote API Server Setup Guide

## Overview

This guide explains how to set up the Python API server (`remote_api_server.py`) in your Docker containers to enable job execution without SSH.

## Why This Approach?

- **No SSH Required**: Works with Docker containers accessible via browser
- **Simple Setup**: Just run a Python script
- **File Uploads**: Direct video upload support
- **Real-time Status**: HTTP API for job status
- **VPN Compatible**: Works with VPN connections

## Step-by-Step Setup

### Step 1: Copy Files to Container

1. **Copy `remote_api_server.py` to container:**
   - Via Jupyter Lab: Upload to `/workspace/`
   - Via Docker exec: `docker cp remote_api_server.py <container_id>:/workspace/`

2. **Copy `requirements_remote.txt` to container:**
   - Upload to `/workspace/`

3. **Copy `pipeline_wrapper.py` to container:**
   - Upload to `/workspace/`

### Step 2: Install Dependencies

```bash
# SSH into container or use Jupyter Lab terminal
cd /workspace
pip install -r requirements_remote.txt
```

Or install manually:
```bash
pip install flask flask-cors werkzeug
```

### Step 3: Run the API Server

#### Option A: Run in Background (Recommended)

```bash
# Run in background with nohup
cd /workspace
nohup python remote_api_server.py --port 5000 > api_server.log 2>&1 &

# Check if running
ps aux | grep remote_api_server

# View logs
tail -f api_server.log
```

#### Option B: Run with Screen/Tmux

```bash
# Install screen if not available
apt-get update && apt-get install -y screen

# Start screen session
screen -S api_server

# Run server
cd /workspace
python remote_api_server.py --port 5000

# Detach: Ctrl+A, then D
# Reattach: screen -r api_server
```

#### Option C: Run as System Service (Production)

Create `/etc/systemd/system/video-pipeline-api.service`:

```ini
[Unit]
Description=Video Pipeline API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/workspace
ExecStart=/usr/bin/python /workspace/remote_api_server.py --port 5000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
systemctl daemon-reload
systemctl enable video-pipeline-api
systemctl start video-pipeline-api
systemctl status video-pipeline-api
```

### Step 4: Verify Server is Running

```bash
# Check if port is listening
netstat -tuln | grep 5000

# Or test the endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"ok","workspace":"/workspace",...}
```

### Step 5: Expose Port in Docker (if needed)

If the container doesn't expose port 5000:

```bash
# Stop container
docker stop <container_id>

# Start with port mapping
docker run -p 8870:8870 -p 5000:5000 <image_name>

# Or add to docker-compose.yml:
ports:
  - "8870:8870"  # Jupyter Lab
  - "5000:5000"  # API Server
```

### Step 6: Test from UI

1. Go to **Settings** page in UI
2. Click **Add Node**
3. Fill in:
   - **Name**: `Docker Node 1`
   - **Host**: `192.168.27.14`
   - **Connection Type**: `HTTP API`
   - **API Port**: `5000`
   - **Location**: `Docker Container`
4. Click **Add Node**
5. Click **Test Connection** - should show "online"
6. Click **Verify Setup** - should show all checks passed

## API Endpoints

The server provides these endpoints:

- `GET /health` - Health check
- `GET /status` - Server status and workspace info
- `POST /upload` - Upload video file
- `GET /jobs` - List all jobs
- `GET /jobs/<id>` - Get job status
- `POST /jobs` - Create new job
- `POST /jobs/<id>/cancel` - Cancel job
- `GET /files` - List uploaded files

## Configuration

### Change Port

```bash
python remote_api_server.py --port 8080
```

### Change Host

```bash
python remote_api_server.py --host 0.0.0.0 --port 5000
```

## Troubleshooting

### Server Won't Start

**Problem**: Port already in use

**Solution**:
```bash
# Find process using port
lsof -i :5000
# Or
netstat -tuln | grep 5000

# Kill process or use different port
python remote_api_server.py --port 5001
```

### Connection Refused

**Problem**: Cannot connect from UI

**Solutions**:
1. Check server is running: `ps aux | grep remote_api_server`
2. Check port is exposed: `netstat -tuln | grep 5000`
3. Check firewall: `iptables -L`
4. Check Docker port mapping
5. Verify VPN is connected
6. Test with curl: `curl http://192.168.27.14:5000/health`

### File Upload Fails

**Problem**: Upload endpoint returns error

**Solutions**:
1. Check `input_videos` directory exists: `ls -la /workspace/input_videos`
2. Check permissions: `chmod 755 /workspace/input_videos`
3. Check disk space: `df -h`
4. Check file size limit (default: 10GB)

### Jobs Don't Execute

**Problem**: Jobs created but don't run

**Solutions**:
1. Check `pipeline.py` exists: `ls -la /workspace/pipeline.py`
2. Check `pipeline_wrapper.py` exists: `ls -la /workspace/pipeline_wrapper.py`
3. Check Python: `python --version`
4. Check dependencies: `pip list`
5. Check server logs: `tail -f api_server.log`

## Auto-Start on Container Restart

### Using Docker Entrypoint

Create `start_api.sh`:

```bash
#!/bin/bash
cd /workspace
python remote_api_server.py --port 5000 &
exec "$@"
```

Make executable:
```bash
chmod +x start_api.sh
```

Add to Dockerfile:
```dockerfile
COPY start_api.sh /start_api.sh
ENTRYPOINT ["/start_api.sh"]
```

### Using Crontab

```bash
# Add to crontab
crontab -e

# Add line:
@reboot cd /workspace && nohup python remote_api_server.py --port 5000 > api_server.log 2>&1 &
```

## Monitoring

### View Logs

```bash
# Real-time logs
tail -f api_server.log

# Last 100 lines
tail -n 100 api_server.log

# Search for errors
grep ERROR api_server.log
```

### Check Server Status

```bash
# Check if process is running
ps aux | grep remote_api_server

# Check port
netstat -tuln | grep 5000

# Test endpoint
curl http://localhost:5000/health
```

## Security Notes

- **Firewall**: Restrict access to trusted IPs
- **HTTPS**: Use reverse proxy (nginx) for HTTPS in production
- **Authentication**: Add authentication for production use
- **Rate Limiting**: Implement rate limiting for API endpoints
- **File Validation**: Validate uploaded files

## Next Steps

1. Set up the API server using one of the methods above
2. Test connection from UI
3. Verify setup
4. Upload test video
5. Create test job
6. Monitor job execution

## Support

If you encounter issues:
1. Check server logs
2. Verify port is accessible
3. Test endpoints with curl
4. Check Docker port mapping
5. Verify VPN connection
6. Review troubleshooting section

