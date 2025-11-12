# Quick Start: Vercel Deployment

## 🎯 Overview

This project needs to be split into three parts for Vercel deployment:
1. **Frontend (React)** → Deploy to Vercel ✅
2. **Backend API (Node.js)** → Deploy to Railway/Render ⚠️
3. **Remote API Servers (Python)** → Keep on Docker/VPS ✅

## ✅ Task 1: Fixed Download Functionality

### What Was Fixed

The download functionality was looking in the wrong path. Updated to search in:
```
/workspace/output_videos_latest/video_name/final_without_post_process_some_id/
```

### Changes Made

1. **Updated `find_output_files()`** in `remote_api_server.py`:
   - Now searches in subdirectories that start with `final_without_post_process_`
   - Finds the single video file in that directory
   - Returns the file for download

2. **Updated download endpoint**:
   - Simplified file matching logic
   - Falls back to first file found if exact match fails
   - Better error messages and logging

3. **Updated Dashboard download handler**:
   - Simplified to download the first (and only) file
   - Better error handling

### Testing

1. Complete a job
2. Click download button
3. File should download from: `output_videos_latest/video_name/final_without_post_process_*/file.mp4`

## 🚀 Task 2: Vercel Deployment Steps

### Step 1: Deploy Backend to Railway (5 minutes)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your repository
   - Click "Deploy"

3. **Configure Project**
   - Root Directory: `/` (leave as is)
   - Start Command: `node server/index.js`
   - Railway will auto-detect Node.js

4. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-app.vercel.app
   ```

5. **Set Up Persistent Storage**
   - Go to "Volumes" tab
   - Click "+ New Volume"
   - Mount path: `/app/data`
   - Add env variable: `JOBS_FILE_PATH=/app/data/jobs.json`

6. **Get Backend URL**
   - Railway will assign URL: `https://your-project.railway.app`
   - Your API: `https://your-project.railway.app/api`
   - Test: `https://your-project.railway.app/api/health`

### Step 2: Deploy Frontend to Vercel (5 minutes)

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Create New Project**
   - Click "Add New" → "Project"
   - Import GitHub repository
   - Select your repository
   - Click "Import"

3. **Configure Project**
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Root Directory: `./` (leave as is)

4. **Add Environment Variables**
   ```
   VITE_API_BASE_URL=https://your-project.railway.app/api
   ```
   Replace `your-project.railway.app` with your actual Railway URL.

5. **Update vercel.json**
   - Update the rewrite rule with your Railway URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://your-project.railway.app/api/$1"
       }
     ]
   }
   ```

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Get URL: `https://your-app.vercel.app`

### Step 3: Update CORS (2 minutes)

1. **Update Backend CORS**
   - Already configured in `server/index.js`
   - Add your Vercel URL to `FRONTEND_URL` in Railway

2. **Redeploy Backend**
   - Railway will auto-redeploy when env vars change

### Step 4: Test Deployment (5 minutes)

1. **Test Frontend**
   - Visit: `https://your-app.vercel.app`
   - Check if it loads
   - Check browser console for errors

2. **Test Backend**
   - Visit: `https://your-project.railway.app/api/health`
   - Should return: `{"status":"ok"}`

3. **Test Connection**
   - Create a job in frontend
   - Check Railway logs for requests
   - Verify job is created

## 📋 Deployment Checklist

### Backend (Railway)
- [ ] Railway account created
- [ ] Project deployed
- [ ] Environment variables set
- [ ] Persistent volume configured
- [ ] Backend URL obtained
- [ ] Health endpoint working
- [ ] CORS configured

### Frontend (Vercel)
- [ ] Vercel account created
- [ ] Project deployed
- [ ] Environment variables set
- [ ] vercel.json updated with backend URL
- [ ] Frontend URL obtained
- [ ] Frontend loads correctly
- [ ] API calls work

### Remote API Servers
- [ ] Remote servers accessible from internet
- [ ] Port 9090 open in firewall
- [ ] Servers bound to `0.0.0.0:9090`
- [ ] Health endpoint accessible
- [ ] Nodes configured in frontend

## 🔧 Configuration Files

### vercel.json
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

### Environment Variables

**Vercel (Frontend)**:
```
VITE_API_BASE_URL=https://your-project.railway.app/api
```

**Railway (Backend)**:
```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
JOBS_FILE_PATH=/app/data/jobs.json
```

## 🐛 Troubleshooting

### Issue: Frontend can't connect to backend

**Check**:
1. `VITE_API_BASE_URL` is set correctly in Vercel
2. Backend URL is accessible: `https://your-project.railway.app/api/health`
3. CORS is configured in backend
4. Browser console for errors

**Solution**:
1. Verify backend URL is correct
2. Check CORS settings in `server/index.js`
3. Add Vercel URL to `FRONTEND_URL` in Railway
4. Redeploy backend

### Issue: Jobs are lost after redeploy

**Solution**:
1. Use Railway's persistent volume (see Step 1.5)
2. Or use a database instead of file storage
3. Jobs should persist across redeployments

### Issue: Download doesn't work

**Check**:
1. Remote API server is accessible
2. File path is correct (check logs)
3. File exists in: `output_videos_latest/video_name/final_without_post_process_*/file.mp4`

**Solution**:
1. Check remote API server logs
2. Verify file structure matches expected path
3. Check file permissions on remote server

## 💰 Cost Estimation

### Vercel (Frontend)
- **Hobby**: Free (with limitations)
- **Pro**: $20/month (recommended for production)

### Railway (Backend)
- **Hobby**: $5/month (500 hours free)
- **Pro**: $20/month (recommended for production)

### Remote API Servers
- **Your existing infrastructure** (no additional cost)

## 🎯 Next Steps

1. **Set up database** (PostgreSQL, MongoDB) for persistent storage
2. **Add authentication/authorization**
3. **Set up error tracking** (Sentry)
4. **Add monitoring and alerts**
5. **Set up CI/CD pipeline**
6. **Add automated backups**
7. **Implement rate limiting**
8. **Add logging and analytics**

## 📚 Documentation

- **Full Deployment Guide**: See `VERCEL_DEPLOYMENT.md`
- **Step-by-Step Instructions**: See `DEPLOYMENT_STEPS.md`
- **Job Tracking Explanation**: See `JOB_TRACKING_SESSIONS.md`

## 🆘 Support

If you encounter issues:
1. Check Railway logs
2. Check Vercel deployment logs
3. Check browser console
4. Verify environment variables
5. Check CORS configuration
6. Verify network connectivity

## ⚠️ Important Notes

1. **Vercel is for frontend only** - Don't run Node.js server on Vercel
2. **Railway is for backend** - Deploy Node.js server to Railway
3. **Remote API servers stay on Docker/VPS** - Keep on existing infrastructure
4. **Use environment variables** - Never hardcode URLs
5. **Set up persistent storage** - Use Railway volume or database
6. **Configure CORS properly** - Allow requests from Vercel domain
7. **Test everything** - Verify all connections work

---

**Ready to deploy?** Follow the steps above and you'll have your application running on Vercel in about 15 minutes!

