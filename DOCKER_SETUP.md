# Docker Container Setup Guide

## Overview

This guide explains how to set up and connect to a Docker container node running Jupyter Lab, accessible via VPN.

## Container Details

- **IP Address**: `192.168.27.14`
- **Jupyter Lab Port**: `8870`
- **Jupyter Lab URL**: `http://192.168.27.14:8870/lab/workspaces/auto-7`
- **SSH Port**: `22` (standard)
- **Workspace**: `/workspace`
- **Input Videos**: `/workspace/input_videos`

## Prerequisites

1. **VPN Connection**: Ensure VPN is connected to access the remote GPU node
2. **SSH Access**: SSH must be enabled in the Docker container
3. **Credentials**: Username and password for SSH access

## Adding the Node

### Step 1: Connect VPN

Ensure your VPN is connected and you can access `192.168.27.14`.

### Step 2: Add Node in UI

1. Go to **Settings** page
2. Click **Add Node**
3. Fill in the details:
   - **Name**: `Docker Node 1` (or descriptive name)
   - **Host**: `192.168.27.14`
   - **Port**: `22`
   - **User**: Your SSH username
   - **Password**: Your SSH password
   - **GPU Info**: `GPU Model` (e.g., RTX 3090)
   - **Location**: `Docker Container - VPN`
4. Click **Add Node**

### Step 3: Test Connection

1. Click the **Test Connection** button (test tube icon) next to your node
2. If successful, status will show "online"
3. If failed, check:
   - VPN is connected
   - SSH credentials are correct
   - SSH port is correct (usually 22)
   - Firewall allows SSH connections

### Step 4: Verify Setup

1. Click the **Verify Setup** button (checkmark icon) next to your node
2. This will check:
   - Workspace directory exists (`/workspace`)
   - Input videos directory exists (`/workspace/input_videos`)
   - `pipeline.py` exists
   - `pipeline_wrapper.py` exists
   - Python is installed

## Setting Up the Container

### Required Files

The container needs these files in `/workspace`:

```
/workspace/
├── pipeline.py              # Main pipeline script
├── pipeline_wrapper.py      # Wrapper script (copy from this repo)
├── Utils/
│   └── main_utils.py        # Utility functions
├── input_videos/            # Folder for input videos
└── models/                  # Model files (if needed)
```

### Copying Files to Container

#### Option 1: Using Jupyter Lab

1. Open Jupyter Lab: `http://192.168.27.14:8870/lab/workspaces/auto-7`
2. Upload `pipeline_wrapper.py` to `/workspace`
3. Verify `pipeline.py` exists in `/workspace`

#### Option 2: Using SSH

```bash
# Copy pipeline_wrapper.py to container
scp pipeline_wrapper.py user@192.168.27.14:/workspace/

# SSH into container
ssh user@192.168.27.14

# Make wrapper executable
chmod +x /workspace/pipeline_wrapper.py

# Verify files exist
ls -la /workspace/pipeline.py
ls -la /workspace/pipeline_wrapper.py
ls -la /workspace/input_videos
```

### Creating Input Videos Directory

If `input_videos` directory doesn't exist:

```bash
ssh user@192.168.27.14
mkdir -p /workspace/input_videos
chmod 755 /workspace/input_videos
```

## Troubleshooting

### Connection Issues

**Problem**: Node shows as "offline"

**Solutions**:
1. Verify VPN is connected
2. Test SSH manually: `ssh user@192.168.27.14`
3. Check SSH port (default: 22)
4. Verify username and password
5. Check firewall rules
6. Ensure SSH service is running in container

### Workspace Not Found

**Problem**: Workspace directory not found

**Solutions**:
1. Verify `/workspace` exists: `ssh user@192.168.27.14 "test -d /workspace && echo exists"`
2. Check container volume mounts
3. Verify user has access to `/workspace`

### Pipeline Files Missing

**Problem**: `pipeline.py` or `pipeline_wrapper.py` not found

**Solutions**:
1. Copy `pipeline_wrapper.py` to container
2. Verify `pipeline.py` exists in `/workspace`
3. Check file permissions: `chmod +x /workspace/pipeline_wrapper.py`

### Input Videos Directory Missing

**Problem**: `input_videos` directory not found

**Solutions**:
1. Create directory: `mkdir -p /workspace/input_videos`
2. Set permissions: `chmod 755 /workspace/input_videos`
3. Verify in Jupyter Lab

### Job Execution Failures

**Problem**: Jobs fail to execute

**Solutions**:
1. Check Python is installed: `python --version`
2. Verify pipeline dependencies are installed
3. Check GPU is accessible: `nvidia-smi`
4. Review job logs in Dashboard
5. Check workspace permissions
6. Verify `Utils/main_utils.py` exists

### VPN Connection Issues

**Problem**: Cannot connect to node

**Solutions**:
1. Verify VPN is connected
2. Test connectivity: `ping 192.168.27.14`
3. Check VPN routing rules
4. Verify network settings
5. Check VPN client logs

## Using the Node

### Creating Jobs

1. Go to **Create Job** page
2. Select input method:
   - **Manual Path**: `input_videos/video.mp4` (relative to /workspace)
   - **YouTube URL**: Paste YouTube URL
3. Select your Docker node
4. Configure pipeline options
5. Click **Create Job**

### Monitoring Jobs

1. Go to **Dashboard** page
2. View job status and progress
3. Check job logs for errors
4. Verify output files in container

### Uploading Videos

#### Via Jupyter Lab

1. Open Jupyter Lab: `http://192.168.27.14:8870/lab/workspaces/auto-7`
2. Navigate to `input_videos` folder
3. Upload video files
4. Use path: `input_videos/video.mp4` in job creation

#### Via SSH/SCP

```bash
# Copy video to container
scp video.mp4 user@192.168.27.14:/workspace/input_videos/

# Verify upload
ssh user@192.168.27.14 "ls -la /workspace/input_videos/"
```

## Security Notes

- Passwords are stored in memory (not encrypted)
- Use strong passwords
- Limit SSH access to trusted networks
- Consider using SSH keys instead of passwords
- Keep VPN connection secure
- Regularly update container and dependencies

## Next Steps

1. Add node using Settings page
2. Test connection
3. Verify setup
4. Upload test video
5. Create test job
6. Monitor job execution
7. Check output files

## Support

If you encounter issues:
1. Check server logs (backend console)
2. Review node verification results
3. Test SSH connection manually
4. Verify container setup
5. Check VPN connectivity
6. Review troubleshooting section

