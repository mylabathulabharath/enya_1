# Vercel Deployment Guide

## Overview

This guide explains how to deploy this video pipeline application to Vercel. **Important**: Vercel is designed for serverless functions and static sites, not long-running Node.js servers. This means we need to split the application into:

1. **Frontend (React)** → Deploy to Vercel ✅
2. **Backend API (Node.js)** → Deploy to Railway/Render/VPS ⚠️
3. **Remote API Servers (Python)** → Keep on Docker/Remote Servers ✅

## Architecture for Vercel Deployment

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Frontend  │────────▶│  Backend API │────────▶│  Remote API     │
│   (Vercel)  │         │  (Railway/   │         │  Server         │
│             │         │   Render)    │         │  (Docker/VPS)   │
└─────────────┘         └──────────────┘         └─────────────────┘
```

## Step 1: Prepare Frontend for Vercel

### 1.1 Update API Base URL

The frontend needs to know where the backend API is hosted. Update `src/services/api.js`:

```javascript
// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

### 1.2 Create Vercel Configuration

Create `vercel.json` in the root directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend-api.railway.app/api/$1"
    }
  ],
  "env": {
    "VITE_API_BASE_URL": "https://your-backend-api.railway.app/api"
  }
}
```

### 1.3 Update Environment Variables

Create `.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-api.railway.app/api
```

## Step 2: Deploy Backend to Railway/Render

### Option A: Railway (Recommended)

#### 2.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

#### 2.2 Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect it's a Node.js project
5. Set the root directory to the project root
6. Set the start command: `node server/index.js`
7. Add environment variables (see below)

#### 2.3 Configure Environment Variables
Add these in Railway dashboard:
```
NODE_ENV=production
PORT=3001
```

#### 2.4 Set Up Persistent Storage
Railway provides persistent storage. Update `server/services/jobManager.js` to use Railway's storage:

```javascript
// Use Railway's persistent volume or external database
const JOBS_FILE = process.env.JOBS_FILE_PATH || path.join(__dirname, '../../data/jobs.json')
```

**Better Option**: Use a database instead of file storage:
- PostgreSQL (Railway provides this)
- MongoDB Atlas (free tier available)
- Supabase (free tier available)

### Option B: Render

#### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Create a new Web Service

#### 2.2 Deploy Backend
1. Connect your GitHub repository
2. Set:
   - **Name**: video-pipeline-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Instance Type**: Free (or paid for better performance)

#### 2.3 Configure Environment Variables
Add in Render dashboard:
```
NODE_ENV=production
PORT=3001
```

#### 2.4 Set Up Persistent Storage
Render provides a persistent disk. Update the data directory path:

```javascript
const JOBS_FILE = process.env.JOBS_FILE_PATH || '/opt/render/project/src/data/jobs.json'
```

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 3.2 Login to Vercel
```bash
vercel login
```

### 3.3 Deploy Frontend
```bash
# From project root
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **video-pipeline-ui** (or your choice)
- Directory? **./** (current directory)
- Override settings? **N**

### 3.4 Configure Environment Variables
In Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add:
   ```
   VITE_API_BASE_URL=https://your-backend-api.railway.app/api
   ```

### 3.5 Update vercel.json
Update the rewrite rule with your actual backend URL:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend-api.railway.app/api/$1"
    }
  ]
}
```

## Step 4: Update CORS Settings

### 4.1 Update Backend CORS
In `server/index.js`, update CORS to allow Vercel domain:

```javascript
import cors from 'cors'

const app = express()

// Allow requests from Vercel deployment
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-app.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
```

### 4.2 Update Environment Variables
In Railway/Render, add:
```
FRONTEND_URL=https://your-app.vercel.app
```

## Step 5: Handle Persistent Storage

### Problem: Vercel/Railway/Render have ephemeral file systems

**Solution Options**:

#### Option 1: Use a Database (Recommended)
Replace file-based storage with a database:

1. **PostgreSQL (Railway)**
   ```bash
   # Install pg
   npm install pg
   ```

2. **MongoDB Atlas (Free)**
   ```bash
   # Install mongodb
   npm install mongodb
   ```

3. **Supabase (Free)**
   ```bash
   # Install @supabase/supabase-js
   npm install @supabase/supabase-js
   ```

#### Option 2: Use External Storage
- **AWS S3** - For job data and files
- **Cloudflare R2** - S3-compatible, cheaper
- **Google Cloud Storage** - Alternative to S3

#### Option 3: Use Railway's Persistent Volume
Railway provides persistent volumes for file storage:

1. In Railway dashboard, add a volume
2. Mount it to your service
3. Update `JOBS_FILE` path to use the volume

## Step 6: Update Remote API Server Connection

### 6.1 Update Node Configuration
Make sure your nodes are configured with public URLs:

```javascript
// In node configuration
{
  host: "your-remote-server-ip-or-domain",
  apiPort: 9090,
  connectionType: "http"
}
```

### 6.2 Ensure Remote API Server is Accessible
- Remote API server must be accessible from the internet
- If behind firewall, open port 9090
- If using Docker, ensure port mapping is correct
- Consider using a reverse proxy (nginx) for HTTPS

## Step 7: Testing Deployment

### 7.1 Test Frontend
1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Check if frontend loads
3. Check browser console for errors

### 7.2 Test Backend API
1. Visit: `https://your-backend-api.railway.app/api/health`
2. Should return: `{"status":"ok","timestamp":"..."}`

### 7.3 Test Connection
1. In frontend, try to create a job
2. Check backend logs for requests
3. Verify job is created and stored

## Step 8: Domain Configuration (Optional)

### 8.1 Custom Domain for Frontend (Vercel)
1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### 8.2 Custom Domain for Backend (Railway/Render)
1. In Railway/Render, add custom domain
2. Update DNS records
3. Update `VITE_API_BASE_URL` in Vercel

## Important Considerations

### 1. Serverless Functions Limitations
- **Vercel serverless functions have a 10-second timeout** (Hobby plan)
- **Pro plan has 60-second timeout**
- **Enterprise plan has custom timeouts**
- Your backend API calls might take longer than 10 seconds
- **Solution**: Deploy backend to Railway/Render (no timeout limits)

### 2. File Upload Size Limits
- **Vercel**: 4.5MB for serverless functions
- **Railway**: No hard limit (but check plan limits)
- **Render**: 100MB for free tier
- Large video files should be uploaded directly to remote servers, not through Vercel

### 3. Persistent Storage
- **Vercel**: Ephemeral (files are lost on redeploy)
- **Railway**: Persistent volumes available
- **Render**: Persistent disk available
- **Recommendation**: Use a database instead of file storage

### 4. Environment Variables
- Store sensitive data (API keys, passwords) in environment variables
- Never commit `.env` files to git
- Use Vercel/Railway/Render dashboard to set environment variables

### 5. CORS Configuration
- Make sure CORS allows requests from your Vercel domain
- Update CORS settings when adding new domains

### 6. Rate Limiting
- Consider adding rate limiting to prevent abuse
- Vercel has built-in DDoS protection
- Railway/Render might need additional rate limiting

## Troubleshooting

### Issue: Frontend can't connect to backend
**Solution**:
1. Check `VITE_API_BASE_URL` is set correctly
2. Verify backend is accessible (visit health endpoint)
3. Check CORS settings in backend
4. Check browser console for errors

### Issue: Jobs are lost after redeploy
**Solution**:
1. Use database instead of file storage
2. Or use persistent volume (Railway)
3. Or use external storage (S3, etc.)

### Issue: File uploads fail
**Solution**:
1. Upload files directly to remote API server
2. Don't proxy through Vercel
3. Use signed URLs for direct uploads

### Issue: Timeout errors
**Solution**:
1. Backend API calls should go directly to Railway/Render
2. Don't use Vercel serverless functions for long-running operations
3. Use background jobs for processing

## Quick Deployment Checklist

- [ ] Frontend builds successfully (`npm run build`)
- [ ] Backend runs locally (`npm run server`)
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] Database/external storage set up
- [ ] Remote API servers accessible
- [ ] Domain configuration (if using custom domains)
- [ ] SSL certificates configured (automatic with Vercel/Railway/Render)
- [ ] Monitoring and logging set up
- [ ] Error tracking configured (Sentry, etc.)

## Cost Estimation

### Vercel (Frontend)
- **Hobby**: Free (with limitations)
- **Pro**: $20/month
- **Enterprise**: Custom pricing

### Railway (Backend)
- **Hobby**: $5/month (500 hours free)
- **Pro**: $20/month
- **Team**: Custom pricing

### Render (Backend - Alternative)
- **Free**: Limited (spins down after inactivity)
- **Starter**: $7/month
- **Standard**: $25/month

### Remote API Servers
- **Docker/VPS**: Your existing infrastructure
- **Cloud**: AWS, GCP, Azure (pay as you go)

## Recommended Setup

1. **Frontend**: Vercel (Free/Pro plan)
2. **Backend API**: Railway (Hobby/Pro plan)
3. **Database**: Railway PostgreSQL (included) or Supabase (free)
4. **Remote API Servers**: Keep on existing Docker/VPS infrastructure
5. **File Storage**: Use remote server storage or S3/R2

## Next Steps

1. Set up database for persistent storage
2. Implement proper error tracking (Sentry)
3. Add monitoring (Railway/Render provide this)
4. Set up CI/CD pipeline
5. Add automated backups
6. Implement rate limiting
7. Add authentication/authorization
8. Set up logging and analytics

## Support

If you encounter issues:
1. Check Vercel/Railway/Render logs
2. Check browser console for errors
3. Verify environment variables are set
4. Check CORS configuration
5. Verify network connectivity
6. Check remote API server accessibility

---

**Note**: This deployment setup separates concerns properly:
- Frontend on Vercel (fast, global CDN)
- Backend on Railway/Render (persistent, no timeout limits)
- Remote API servers on Docker/VPS (GPU access, long-running processes)

This architecture scales well and handles the limitations of each platform appropriately.

