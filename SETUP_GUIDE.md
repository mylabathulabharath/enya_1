# Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **SSH access** to remote GPU nodes
4. **Python** on remote nodes with pipeline dependencies

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure SSH Keys

Ensure you have SSH keys set up for accessing remote nodes:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to remote nodes
ssh-copy-id -i ~/.ssh/id_rsa.pub user@node-host
```

### 3. Start the Application

#### Development Mode

```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start frontend dev server
npm run dev
```

#### Production Mode

```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production npm run server
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Remote Node Setup

### Pipeline Requirements

On each remote node, ensure:

1. **Python environment** is set up with all pipeline dependencies
2. **pipeline.py** is in the working directory (default: `/workspace`)
3. **Utils/main_utils.py** is available with `get_input_video_path` function
4. **GPU drivers** and CUDA are properly configured
5. **Required models** are downloaded and accessible

### YouTube URL Support

If you want to use YouTube URLs, create a wrapper script on each node:

**pipeline_with_youtube.py**:
```python
import sys
from Utils.main_utils import get_input_video_path

# Get YouTube URL from command line
youtube_url = sys.argv[1] if len(sys.argv) > 1 else None
manual_path = sys.argv[1] if len(sys.argv) > 1 else None

# Download video if YouTube URL
if youtube_url and 'youtube.com' in youtube_url or 'youtu.be' in youtube_url:
    video_path = get_input_video_path(youtube_url=youtube_url, manual_path=None)
else:
    video_path = manual_path

# Build new command with video path
new_args = [sys.executable, 'pipeline.py', video_path] + sys.argv[2:]
sys.argv = new_args

# Execute pipeline
exec(open('pipeline.py').read())
```

## Adding Nodes

1. Go to **Settings** page in the UI
2. Click **Add Node**
3. Fill in node details:
   - **Name**: Descriptive name (e.g., "GPU Node 1")
   - **Host**: IP address or hostname
   - **Port**: SSH port (usually 22)
   - **User**: SSH username
   - **SSH Key Path**: Absolute path to private key (e.g., `/home/user/.ssh/id_rsa`)
   - **GPU Info**: GPU model (e.g., "RTX 3090")
   - **Location**: Optional location description

4. Click **Test Connection** to verify
5. Click **Add Node**

## Creating Jobs

1. Go to **Create Job** page
2. Select input method:
   - **Manual Path**: Path to video file on the node (e.g., `input_videos/video.mp4`)
   - **YouTube URL**: YouTube video URL
3. Select a node from the dropdown
4. Configure pipeline options:
   - **Face Restore**: Enable/disable face enhancement
   - **Background Upscale**: Enable/disable upscaling
   - **Upscale Value**: Scale factor (1.0-4.0)
   - **CLAHE Enhancement**: Enable/disable CLAHE
5. Click **Create Job**

## Monitoring Jobs

1. Go to **Dashboard** page
2. View job status:
   - **Pending**: Waiting to start
   - **Running**: Currently processing
   - **Completed**: Successfully finished
   - **Failed**: Error occurred
   - **Cancelled**: Manually cancelled

3. Filter jobs by status using tabs
4. Cancel running jobs or delete completed/failed jobs

## Troubleshooting

### Node Connection Issues

**Problem**: Node shows as "offline"

**Solutions**:
- Verify SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
- Test SSH connection manually: `ssh -i /path/to/key user@host`
- Check firewall rules allow SSH port
- Verify SSH key path is correct and accessible

### Job Execution Issues

**Problem**: Jobs fail immediately

**Solutions**:
- Verify `pipeline.py` exists on the node
- Check Python environment and dependencies
- Verify GPU is accessible and has sufficient memory
- Check node logs for specific error messages
- Ensure working directory is correct (default: `/workspace`)

### Progress Not Updating

**Problem**: Job progress stays at 0%

**Solutions**:
- Pipeline output may not include progress indicators
- Update `parseProgress` function in `server/services/sshExecutor.js` to match your pipeline's output format
- Check if pipeline writes progress to stdout

### YouTube URL Issues

**Problem**: YouTube URLs don't work

**Solutions**:
- Ensure `get_input_video_path` function is available in `Utils/main_utils.py`
- Verify `youtube-dl` or `yt-dlp` is installed on the node
- Check network connectivity on the node
- Create wrapper script as described above

## Security Considerations

1. **SSH Keys**: Store SSH keys securely, never commit them to version control
2. **Authentication**: Add authentication to the API in production
3. **HTTPS**: Use HTTPS in production
4. **Input Validation**: All user inputs are validated, but add additional checks if needed
5. **Node Access**: Restrict SSH access to trusted networks

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server with PM2
pm2 start server/index.js --name video-pipeline-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server/index.js"]
```

Build and run:
```bash
docker build -t video-pipeline-ui .
docker run -p 3001:3001 video-pipeline-ui
```

### Using Nginx

Configure Nginx to serve the frontend and proxy API requests:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve frontend
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Check node logs on remote servers
4. Verify pipeline.py works independently on the node

