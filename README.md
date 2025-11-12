# Video Pipeline Dashboard

A professional React-based dashboard for managing video processing pipeline jobs across multiple GPU nodes.

## Features

- 🎯 **Job Management**: Create, monitor, and manage video processing jobs
- 🖥️ **Node Management**: Add and configure remote GPU nodes
- 📊 **Real-time Dashboard**: Monitor job status and node health
- 🎨 **Modern UI**: Clean, professional interface with Tailwind CSS
- 🔄 **Auto-refresh**: Automatic updates every 5 seconds
- 📱 **Responsive**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18
- React Router
- Tailwind CSS
- Lucide React (Icons)
- Axios
- Vite

### Backend
- Node.js
- Express
- node-ssh (for SSH connections)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
# Terminal 1: Start backend API server
npm run server

# Terminal 2: Start frontend dev server
npm run dev
```

3. Open your browser:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Configuration

### Adding Nodes

1. Go to the Settings page
2. Click "Add Node"
3. Fill in the node information:
   - **Name**: Descriptive name for the node
   - **Host**: IP address or hostname (e.g., `192.168.27.14`)
   - **Port**: SSH port (default: 22)
   - **User**: SSH username
   - **Password**: SSH password
   - **GPU Info**: GPU information (e.g., "RTX 3090")
   - **Location**: Optional location description (e.g., "Docker Container")

### Creating Jobs

1. Go to the "Create Job" page
2. Select input method:
   - **Manual Path**: Path to video file on the node
   - **YouTube URL**: YouTube video URL
3. Select a node
4. Configure pipeline options:
   - **Face Restore**: Enable face enhancement
   - **Background Upscale**: Enable upscaling
   - **Upscale Value**: Upscale factor (1.0-4.0)
   - **CLAHE Enhancement**: Enable CLAHE
5. Click "Create Job"

## Project Structure

```
.
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx      # Main dashboard with jobs and nodes
│   │   ├── JobCreator.jsx     # Job creation form
│   │   └── Settings.jsx       # Node management
│   ├── services/
│   │   └── api.js             # API client
│   ├── App.jsx                # Main app component
│   └── main.jsx               # Entry point
├── server/
│   ├── routes/
│   │   ├── jobs.js            # Job routes
│   │   └── nodes.js           # Node routes
│   ├── services/
│   │   ├── jobManager.js      # Job management logic
│   │   ├── nodeManager.js     # Node management logic
│   │   └── sshExecutor.js     # SSH execution
│   └── index.js               # Express server
├── package.json
└── README.md
```

## API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create new job
- `POST /api/jobs/:id/cancel` - Cancel job
- `DELETE /api/jobs/:id` - Delete job

### Nodes
- `GET /api/nodes` - Get all nodes
- `GET /api/nodes/:id` - Get node by ID
- `POST /api/nodes` - Add new node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node
- `POST /api/nodes/:id/test` - Test node connection

## Pipeline Integration

The backend executes the pipeline on remote nodes using SSH. For YouTube URLs and manual paths, it uses a wrapper script that handles video path resolution.

### Wrapper Script

The `pipeline_wrapper.py` script should be placed on each remote node alongside `pipeline.py`. It:
- Handles YouTube URL downloads using `get_input_video_path`
- Resolves manual video paths
- Passes the resolved path to `pipeline.py`

### Command Format

```bash
python pipeline_wrapper.py <youtube_url|manual_path> <unet_flag> <face_restore_flag> <upscale_flag> <upscale_value> <clahe_flag>
```

The wrapper script then calls:
```bash
python pipeline.py <resolved_video_path> <unet_flag> <face_restore_flag> <upscale_flag> <upscale_value> <clahe_flag>
```

## Environment Variables

Create a `.env` file for configuration:

```env
PORT=3001
NODE_ENV=development
```

## Production Deployment

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
NODE_ENV=production npm run server
```

3. Serve the built frontend (use nginx, Apache, or similar)

## Security Notes

- Passwords are stored in memory (not encrypted in this version)
- In production, encrypt passwords or use environment variables
- Implement authentication for production use
- Use HTTPS in production
- Validate all user inputs
- Consider using SSH keys instead of passwords for better security

## Troubleshooting

### Node Connection Issues
- Verify SSH username and password are correct
- Check SSH port is correct (default: 22)
- Ensure node is accessible from server
- Test SSH connection manually: `ssh user@192.168.27.14`
- Check firewall rules allow SSH connections

### Job Execution Issues
- Verify pipeline.py exists on the node
- Check pipeline dependencies are installed
- Review node logs for errors
- Ensure sufficient GPU memory

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

