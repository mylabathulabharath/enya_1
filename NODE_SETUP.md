# Node Setup Guide

## Quick Setup for Docker Container Node

### Node Configuration

For a Docker container running Jupyter Lab with workspace at `/workspace`:

1. **Host**: `192.168.27.14` (or your node IP)
2. **Port**: `22` (SSH port - standard)
3. **User**: Your SSH username
4. **Password**: Your SSH password
5. **Workspace**: `/workspace` (inside container)
6. **Input Videos**: `/workspace/input_videos` (for uploading videos)

### Adding the Node

1. Go to **Settings** page in the UI
2. Click **Add Node**
3. Fill in the details:
   - **Name**: `Docker Node 1` (or any descriptive name)
   - **Host**: `192.168.27.14`
   - **Port**: `22`
   - **User**: Your SSH username
   - **Password**: Your SSH password
   - **GPU Info**: `GPU Model` (e.g., RTX 3090)
   - **Location**: `Docker Container`
4. Click **Test Connection** to verify
5. Click **Add Node**

### Workspace Structure

The workspace on the node should have:

```
/workspace/
├── pipeline.py              # Main pipeline script
├── pipeline_wrapper.py      # Wrapper script (copy from this repo)
├── Utils/
│   └── main_utils.py        # Utility functions with get_input_video_path
├── input_videos/            # Folder for input videos
└── models/                  # Model files (if needed)
```

### Setting Up the Node

1. **Copy pipeline_wrapper.py** to the node:
   ```bash
   scp pipeline_wrapper.py user@192.168.27.14:/workspace/
   ```

2. **Make it executable**:
   ```bash
   ssh user@192.168.27.14
   chmod +x /workspace/pipeline_wrapper.py
   ```

3. **Verify pipeline.py exists**:
   ```bash
   ls -la /workspace/pipeline.py
   ```

4. **Verify Utils/main_utils.py exists**:
   ```bash
   ls -la /workspace/Utils/main_utils.py
   ```

### Testing the Node

1. In the UI, go to **Settings**
2. Find your node in the list
3. Click the **Test Connection** icon (test tube icon)
4. The status should change to "online" if successful

### Creating Jobs

Once the node is set up:

1. Go to **Create Job** page
2. Select input method:
   - **Manual Path**: Use path like `input_videos/video.mp4` (relative to /workspace)
   - **YouTube URL**: Paste YouTube URL
3. Select your node from the dropdown
4. Configure pipeline options
5. Click **Create Job**

### Troubleshooting

#### Node Shows as Offline

- Verify SSH is accessible: `ssh user@192.168.27.14`
- Check username and password are correct
- Verify SSH port is 22 (or update port in node settings)
- Check firewall rules allow SSH connections

#### Jobs Fail to Execute

- Verify `pipeline_wrapper.py` exists in `/workspace`
- Check `pipeline.py` exists in `/workspace`
- Verify `Utils/main_utils.py` exists
- Check Python dependencies are installed
- Verify GPU is accessible inside container
- Check workspace permissions: `ls -la /workspace`

#### YouTube URLs Don't Work

- Ensure `get_input_video_path` function exists in `Utils/main_utils.py`
- Install `youtube-dl` or `yt-dlp` in the container
- Check network connectivity inside container

#### Permission Issues

- Ensure user has write access to `/workspace`
- Check file permissions: `chmod +x /workspace/pipeline_wrapper.py`
- Verify user can execute Python scripts

### Docker Container Notes

If your workspace is inside a Docker container:

1. **SSH to Host**: If SSH is to the host machine, you may need to use `docker exec` to run commands inside the container
2. **SSH to Container**: If SSH is directly to the container, ensure SSH service is running inside the container
3. **Volume Mounts**: Ensure `/workspace` is properly mounted as a volume
4. **Network**: Ensure the container has network access for YouTube downloads

### Security Notes

- Passwords are stored in memory (not encrypted in this version)
- In production, encrypt passwords or use environment variables
- Use SSH keys instead of passwords for better security
- Limit SSH access to trusted networks
- Use strong passwords

### Next Steps

1. Add your node using the Settings page
2. Test the connection
3. Create a test job with a small video
4. Monitor the job on the Dashboard
5. Check job output and logs

