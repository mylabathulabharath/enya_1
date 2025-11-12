# Setup Checklist for Docker Container Nodes

## ✅ Pre-Setup Checklist

- [ ] VPN is connected
- [ ] Can access Jupyter Lab at `http://192.168.27.14:8870/lab/workspaces/auto-7`
- [ ] Have access to `/workspace` directory in container
- [ ] Python is installed in container
- [ ] `pipeline.py` exists in `/workspace`

## ✅ Step 1: Set Up Python API Server

### On Remote Container:

1. **Copy files to container:**
   - [ ] `remote_api_server.py` → `/workspace/`
   - [ ] `requirements_remote.txt` → `/workspace/`
   - [ ] `pipeline_wrapper.py` → `/workspace/`

2. **Install dependencies:**
   ```bash
   cd /workspace
   pip install -r requirements_remote.txt
   ```
   - [ ] Dependencies installed successfully

3. **Start API server:**
   ```bash
   python remote_api_server.py --port 5000
   ```
   - [ ] Server starts without errors
   - [ ] Server is accessible at `http://192.168.27.14:5000/health`

4. **Verify setup:**
   - [ ] `curl http://192.168.27.14:5000/health` returns `{"status":"ok"}`
   - [ ] `curl http://192.168.27.14:5000/status` returns status info
   - [ ] Port 5000 is exposed in Docker (if needed)

5. **Set up auto-start (optional):**
   - [ ] Added to startup script
   - [ ] Or configured as system service
   - [ ] Or added to Docker entrypoint

## ✅ Step 2: Configure UI Server

### On Local Machine:

1. **Install dependencies:**
   ```bash
   npm install
   ```
   - [ ] Dependencies installed

2. **Start servers:**
   ```bash
   # Terminal 1: Backend
   npm run server
   # Terminal 2: Frontend
   npm run dev
   ```
   - [ ] Backend running on port 3001
   - [ ] Frontend running on port 3000
   - [ ] No errors in console

## ✅ Step 3: Add Node in UI

1. **Open UI:** http://localhost:3000
   - [ ] UI loads successfully
   - [ ] No console errors

2. **Go to Settings page:**
   - [ ] Settings page loads
   - [ ] "Add Node" button is visible

3. **Add node:**
   - [ ] Fill in node details:
     - Name: `Docker Node 1`
     - Host: `192.168.27.14`
     - Connection Type: `HTTP API`
     - API Port: `5000`
     - Location: `Docker Container`
   - [ ] Click "Add Node"
   - [ ] Node appears in list

4. **Test connection:**
   - [ ] Click "Test Connection"
   - [ ] Status shows "online" ✅
   - [ ] No error messages

5. **Verify setup:**
   - [ ] Click "Verify Setup"
   - [ ] All checks show "OK" ✅
   - [ ] No missing files/directories

## ✅ Step 4: Test File Upload

1. **Go to Create Job page:**
   - [ ] Page loads successfully
   - [ ] Node is available in dropdown

2. **Select node:**
   - [ ] Node is selected
   - [ ] Node shows "HTTP API" in dropdown

3. **Upload test video:**
   - [ ] Select "Upload Video" method
   - [ ] Choose video file
   - [ ] Upload starts
   - [ ] Upload completes successfully
   - [ ] File path is displayed

## ✅ Step 5: Create Test Job

1. **Create job:**
   - [ ] Fill in job details
   - [ ] Select uploaded file or manual path
   - [ ] Configure pipeline options
   - [ ] Click "Create Job"

2. **Monitor job:**
   - [ ] Job appears in Dashboard
   - [ ] Job status updates
   - [ ] Progress is displayed
   - [ ] Job completes successfully

## 🔍 Troubleshooting Checklist

### Connection Issues:
- [ ] VPN is connected
- [ ] Can ping `192.168.27.14`
- [ ] Port 5000 is accessible: `curl http://192.168.27.14:5000/health`
- [ ] Firewall allows connections
- [ ] Docker port mapping is correct

### API Server Issues:
- [ ] Server is running: `ps aux | grep remote_api_server`
- [ ] Port is listening: `netstat -tuln | grep 5000`
- [ ] No errors in logs: `tail -f api_server.log`
- [ ] Dependencies are installed: `pip list | grep flask`

### File Issues:
- [ ] `pipeline.py` exists in `/workspace`
- [ ] `pipeline_wrapper.py` exists in `/workspace`
- [ ] `input_videos` directory exists
- [ ] Permissions are correct: `ls -la /workspace`

### UI Issues:
- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] No CORS errors in browser console
- [ ] API calls are successful (check Network tab)

## 📝 Notes

- **API Server Port**: Default is 5000, change if needed
- **VPN Required**: Must be connected to access remote containers
- **File Size Limit**: 10GB max per file
- **Supported Formats**: MP4, AVI, MOV, MKV, WebM
- **Auto-refresh**: Dashboard refreshes every 10 seconds

## 🎯 Success Criteria

- [x] API server running on container
- [x] Node added and connected in UI
- [x] File upload works
- [x] Job creation works
- [x] Job execution works
- [x] Progress tracking works
- [x] Job completion works

## 🆘 If Something Fails

1. Check server logs (backend console)
2. Check API server logs (`api_server.log`)
3. Check browser console (F12)
4. Test API endpoints with curl
5. Verify VPN connection
6. Check Docker port mapping
7. Review troubleshooting section in `REMOTE_SETUP.md`

