# Step-by-Step Vercel Deployment Instructions

## Prerequisites

- GitHub account
- Vercel account (free tier is fine)
- Railway account (for backend) or Render account
- Your remote API servers should be running and accessible

## Step 1: Prepare the Codebase

### 1.1 Update API Configuration

The API service is already configured to use environment variables. Make sure `src/services/api.js` has:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

### 1.2 Create Environment File

Create `.env.production` (don't commit this):

```env
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

### 1.3 Update .gitignore

Make sure `.env.production` is in `.gitignore`:

```
.env.production
.env.local
```

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub

### 2.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not already connected
4. Select your repository
5. Click "Deploy"

### 2.3 Configure Project

1. Railway will detect it's a Node.js project
2. Set the **Root Directory** to: `/` (project root)
3. Set the **Start Command** to: `node server/index.js`
4. Railway will automatically detect `package.json`

### 2.4 Add Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
```

### 2.5 Get Backend URL

1. Railway will assign a URL like: `https://your-project.railway.app`
2. Copy this URL - you'll need it for the frontend
3. Your backend API will be at: `https://your-project.railway.app/api`

### 2.6 Test Backend

1. Visit: `https://your-project.railway.app/api/health`
2. Should return: `{"status":"ok","timestamp":"..."}`

### 2.7 Set Up Persistent Storage (Important!)

**Option A: Use Railway's Persistent Volume (Recommended)**

1. In Railway dashboard, go to your service
2. Click **Volumes** tab
3. Click **+ New Volume**
4. Mount path: `/app/data`
5. Update `server/services/jobManager.js`:
   ```javascript
   const JOBS_FILE = process.env.JOBS_FILE_PATH || path.join(__dirname, '../../data/jobs.json')
   ```
6. Set environment variable: `JOBS_FILE_PATH=/app/data/jobs.json`

**Option B: Use Database (Better for Production)**

1. In Railway dashboard, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway will create a PostgreSQL database
4. Install database driver: `npm install pg`
5. Update `server/services/jobManager.js` to use PostgreSQL instead of file storage

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with GitHub

### 3.2 Create New Project

1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Select your repository
4. Click "Import"

### 3.3 Configure Project

Vercel will auto-detect Vite configuration:

- **Framework Preset**: Vite
- **Root Directory**: `./` (leave as is)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 3.4 Add Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables**:

```
VITE_API_BASE_URL=https://your-project.railway.app/api
```

Replace `your-project.railway.app` with your actual Railway backend URL.

### 3.5 Update vercel.json

Update `vercel.json` with your actual backend URL:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-project.railway.app/api/$1"
    }
  ]
}
```

### 3.6 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Vercel will provide a URL like: `https://your-app.vercel.app`

## Step 4: Update CORS in Backend

### 4.1 Update server/index.js

Update CORS to allow your Vercel domain:

```javascript
import cors from 'cors'

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  'https://your-app.vercel.app'
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
```

### 4.2 Add Frontend URL to Railway

In Railway dashboard, add environment variable:

```
FRONTEND_URL=https://your-app.vercel.app
```

### 4.3 Redeploy Backend

Railway will automatically redeploy when environment variables change.

## Step 5: Configure Remote API Servers

### 5.1 Ensure Remote Servers are Accessible

Your remote API servers (Python Flask) must be accessible from the internet:

1. **If on VPS**: 
   - Open port 9090 in firewall
   - Ensure server is bound to `0.0.0.0:9090`
   - Test: `curl http://your-server-ip:9090/health`

2. **If on Docker**:
   - Map port 9090: `docker run -p 9090:9090 ...`
   - Ensure container is accessible
   - Test: `curl http://your-server-ip:9090/health`

3. **If behind firewall**:
   - Use nginx reverse proxy
   - Set up SSL with Let's Encrypt
   - Use domain name instead of IP

### 5.2 Add Nodes in Frontend

1. Go to your Vercel-deployed frontend
2. Go to Settings page
3. Add a new node:
   - **Name**: Your server name
   - **Host**: Your server IP or domain
   - **Port**: 9090
   - **API Port**: 9090
   - **Connection Type**: HTTP
4. Test connection

## Step 6: Test Everything

### 6.1 Test Frontend

1. Visit your Vercel URL
2. Check if frontend loads
3. Check browser console for errors
4. Verify API calls are going to Railway backend

### 6.2 Test Backend

1. Visit: `https://your-project.railway.app/api/health`
2. Should return: `{"status":"ok"}`
3. Test jobs endpoint: `https://your-project.railway.app/api/jobs`
4. Should return: `[]` (empty array if no jobs)

### 6.3 Test Connection

1. In frontend, try to create a job
2. Check Railway logs for requests
3. Verify job is created
4. Check if job status updates

### 6.4 Test Download

1. Wait for a job to complete
2. Click download button
3. Verify file downloads correctly

## Step 7: Set Up Custom Domain (Optional)

### 7.1 Frontend (Vercel)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will automatically set up SSL

### 7.2 Backend (Railway)

1. In Railway dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records
4. Railway will automatically set up SSL
5. Update `VITE_API_BASE_URL` in Vercel with new domain

## Step 8: Set Up Monitoring

### 8.1 Railway Logs

Railway provides built-in logs:
1. Go to Railway dashboard
2. Click on your service
3. View logs in real-time

### 8.2 Vercel Analytics

1. In Vercel dashboard, enable Analytics
2. View deployment logs
3. Monitor errors

### 8.3 Error Tracking (Optional)

Set up Sentry or similar:
1. Create Sentry account
2. Install Sentry SDK
3. Add Sentry DSN to environment variables
4. Monitor errors in Sentry dashboard

## Troubleshooting

### Issue: Frontend can't connect to backend

**Solution**:
1. Check `VITE_API_BASE_URL` is set correctly in Vercel
2. Verify backend URL is accessible: `https://your-project.railway.app/api/health`
3. Check CORS settings in backend
4. Check browser console for errors
5. Check Network tab in browser DevTools

### Issue: Jobs are lost after redeploy

**Solution**:
1. Use Railway's persistent volume (see Step 2.7)
2. Or use a database instead of file storage
3. Jobs should persist across redeployments

### Issue: Download doesn't work

**Solution**:
1. Check remote API server is accessible
2. Verify file path is correct (check logs)
3. Check file permissions on remote server
4. Verify CORS allows download requests

### Issue: Timeout errors

**Solution**:
1. Backend is on Railway (no timeout limits)
2. Vercel frontend only serves static files (no timeout)
3. Long-running operations happen on Railway backend
4. If still timing out, check Railway logs

### Issue: CORS errors

**Solution**:
1. Update CORS in `server/index.js` to include Vercel domain
2. Add `FRONTEND_URL` environment variable in Railway
3. Redeploy backend after changing CORS settings
4. Check browser console for specific CORS errors

## Quick Reference

### Frontend (Vercel)
- URL: `https://your-app.vercel.app`
- Environment Variable: `VITE_API_BASE_URL`
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend (Railway)
- URL: `https://your-project.railway.app`
- Environment Variables: `NODE_ENV`, `PORT`, `FRONTEND_URL`
- Start Command: `node server/index.js`
- Persistent Storage: `/app/data` (volume) or database

### Remote API Servers
- Host: Your server IP or domain
- Port: 9090
- Must be accessible from internet
- Should use HTTPS in production

## Next Steps

1. Set up database for persistent storage (PostgreSQL, MongoDB)
2. Add authentication/authorization
3. Set up error tracking (Sentry)
4. Add monitoring and alerts
5. Set up CI/CD pipeline
6. Add automated backups
7. Implement rate limiting
8. Add logging and analytics

## Support

If you encounter issues:
1. Check Railway logs
2. Check Vercel deployment logs
3. Check browser console
4. Verify environment variables are set
5. Check CORS configuration
6. Verify network connectivity
7. Check remote API server accessibility

---

**Important Notes**:

1. **Vercel is for frontend only** - Don't try to run the Node.js server on Vercel
2. **Railway is for backend** - Deploy the Node.js server to Railway
3. **Remote API servers stay on Docker/VPS** - Keep them on your existing infrastructure
4. **Use environment variables** - Never hardcode URLs or secrets
5. **Set up persistent storage** - Use Railway volume or database
6. **Configure CORS properly** - Allow requests from Vercel domain
7. **Test everything** - Verify all connections work before going to production

This setup separates concerns properly and scales well!

