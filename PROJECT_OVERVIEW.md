# Project Overview

## 🎯 What Was Built

A professional, modern React-based dashboard for managing video processing pipeline jobs across multiple remote GPU nodes. The system provides a web interface for employees to submit video processing jobs and monitor their execution on distributed GPU infrastructure.

## 🏗️ Architecture

### Frontend (React)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom theme
- **Icons**: Lucide React
- **Routing**: React Router
- **HTTP Client**: Axios
- **State Management**: React Hooks (useState, useEffect)

### Backend (Node.js)
- **Framework**: Express.js
- **SSH Execution**: node-ssh library
- **API**: RESTful API with Express routes
- **Job Management**: In-memory job queue (can be extended to Redis/database)
- **Node Management**: In-memory node registry (can be extended to database)

### Key Components

#### 1. Dashboard (`src/pages/Dashboard.jsx`)
- Real-time job monitoring
- Node status display
- Job statistics (total, running, completed, failed)
- Filterable job list by status
- Auto-refresh every 5 seconds

#### 2. Job Creator (`src/pages/JobCreator.jsx`)
- Input method selection (YouTube URL or Manual Path)
- Node selection dropdown
- Pipeline option toggles:
  - Face Restore
  - Background Upscale
  - Upscale Value (1.0-4.0)
  - CLAHE Enhancement
- Form validation
- Error handling

#### 3. Settings (`src/pages/Settings.jsx`)
- Node management (add, update, delete)
- Node connection testing
- Node status display
- SSH configuration

#### 4. Backend Services

**Job Manager** (`server/services/jobManager.js`)
- Job creation and tracking
- Job execution coordination
- Progress updates
- Status management

**Node Manager** (`server/services/nodeManager.js`)
- Node registration
- Node status checking
- Connection testing

**SSH Executor** (`server/services/sshExecutor.js`)
- SSH connection management
- Remote command execution
- Progress parsing from stdout
- Error handling

## 📁 Project Structure

```
.
├── src/                          # Frontend React application
│   ├── pages/                    # Page components
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── JobCreator.jsx       # Job creation form
│   │   └── Settings.jsx         # Node management
│   ├── services/                 # API clients
│   │   └── api.js               # Axios API client
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
│
├── server/                       # Backend API server
│   ├── routes/                  # Express routes
│   │   ├── jobs.js             # Job API routes
│   │   └── nodes.js            # Node API routes
│   ├── services/                # Business logic
│   │   ├── jobManager.js       # Job management
│   │   ├── nodeManager.js      # Node management
│   │   └── sshExecutor.js      # SSH execution
│   └── index.js                # Express server
│
├── pipeline_wrapper.py          # Python wrapper for pipeline
├── pipeline.py                  # Original pipeline script
│
├── package.json                 # Dependencies
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── README.md                   # Main documentation
├── QUICK_START.md              # Quick start guide
├── SETUP_GUIDE.md              # Setup instructions
└── PROJECT_OVERVIEW.md         # This file
```

## 🔄 Data Flow

### Job Creation Flow

```
User fills form → Job Creator
    ↓
API POST /api/jobs
    ↓
Job Manager creates job
    ↓
Job Manager executes job (async)
    ↓
SSH Executor connects to node
    ↓
SSH Executor runs pipeline_wrapper.py
    ↓
pipeline_wrapper.py resolves video path
    ↓
pipeline_wrapper.py executes pipeline.py
    ↓
SSH Executor parses progress from stdout
    ↓
Job Manager updates job progress
    ↓
Dashboard displays updated status
```

### Node Management Flow

```
User adds node → Settings
    ↓
API POST /api/nodes
    ↓
Node Manager creates node
    ↓
Node Manager tests SSH connection
    ↓
Node status updated (online/offline)
    ↓
Node displayed in Dashboard
```

## 🎨 UI/UX Features

### Design Principles
- **Classic Look**: Clean, professional interface
- **Modern Icons**: Lucide React icons (21st century design)
- **Simple Navigation**: Clear menu structure
- **Responsive**: Works on desktop and mobile
- **Color Scheme**: Primary blue (#0ea5e9) with gray accents
- **Typography**: Inter font family

### Key UI Elements
- **Cards**: Clean card-based layout
- **Tables**: Sortable job and node tables
- **Toggles**: Modern toggle switches for options
- **Progress Bars**: Visual progress indicators
- **Status Badges**: Color-coded status indicators
- **Icons**: Consistent iconography throughout

## 🔌 API Endpoints

### Jobs API
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create new job
- `POST /api/jobs/:id/cancel` - Cancel job
- `DELETE /api/jobs/:id` - Delete job

### Nodes API
- `GET /api/nodes` - Get all nodes
- `GET /api/nodes/:id` - Get node by ID
- `POST /api/nodes` - Add new node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node
- `POST /api/nodes/:id/test` - Test node connection

## 🚀 Deployment

### Development
```bash
npm run dev        # Frontend dev server
npm run server     # Backend API server
```

### Production
```bash
npm run build      # Build frontend
NODE_ENV=production npm run server  # Production server
```

### Docker (Optional)
- Frontend can be served via Nginx
- Backend can be containerized with Docker
- Use PM2 for process management

## 🔒 Security Considerations

1. **SSH Keys**: Stored securely, never committed
2. **Authentication**: Add authentication for production
3. **HTTPS**: Use HTTPS in production
4. **Input Validation**: All inputs validated
5. **Error Handling**: Proper error messages without exposing internals

## 🎯 Future Enhancements

### Short-term
- [ ] Add authentication and authorization
- [ ] Implement job queue with priority
- [ ] Add job logs viewing
- [ ] Implement job retry mechanism
- [ ] Add email notifications

### Long-term
- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] Redis for job queue
- [ ] WebSocket for real-time updates
- [ ] Job scheduling
- [ ] Resource allocation optimization
- [ ] Multi-user support with roles
- [ ] Job templates and presets
- [ ] Analytics and reporting
- [ ] Export job results
- [ ] Batch job processing

## 📊 Performance

### Current Implementation
- **Job Storage**: In-memory (Map data structure)
- **Node Storage**: In-memory (Map data structure)
- **Refresh Rate**: 5 seconds (polling)
- **Concurrent Jobs**: Limited by node capacity

### Optimizations
- Use WebSockets for real-time updates (reduce polling)
- Implement database for persistence
- Add job queue with Redis
- Implement job prioritization
- Add resource pooling

## 🧪 Testing

### Manual Testing
- Test node connection
- Create test jobs
- Verify job execution
- Check progress updates
- Test error handling

### Automated Testing (Future)
- Unit tests for services
- Integration tests for API
- E2E tests for UI
- SSH connection mocking

## 📝 Documentation

- **README.md**: Main documentation
- **QUICK_START.md**: Quick start guide
- **SETUP_GUIDE.md**: Detailed setup instructions
- **PIPELINE_FLOW_ANALYSIS.md**: Pipeline flow analysis
- **PROJECT_OVERVIEW.md**: This file

## 🎓 Learning Resources

### Technologies Used
- React: https://react.dev/
- Express: https://expressjs.com/
- Tailwind CSS: https://tailwindcss.com/
- node-ssh: https://github.com/steelbrain/node-ssh
- Lucide React: https://lucide.dev/

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License

## 🙏 Acknowledgments

- Built with React, Express, and Tailwind CSS
- Icons from Lucide React
- SSH execution via node-ssh

