# Deployment Guide - Quick Reference

## 🎯 Two Tasks Completed

### ✅ Task 1: Fixed Download Functionality

**Problem**: Download was looking in wrong path
**Solution**: Updated to search in nested directory structure:
- Path: `output_videos_latest/video_name/final_without_post_process_some_id/`
- Finds the single video file in that directory
- Downloads it correctly

### ✅ Task 2: Vercel Deployment Setup

**Architecture**:
- Frontend (React) → Vercel
- Backend (Node.js) → Railway/Render
- Remote API Servers (Python) → Keep on Docker/VPS

## 🚀 Quick Deployment Steps

### 1. Deploy Backend to Railway (5 min)

```bash
# 1. Go to railway.app and sign up
# 2. Create new project from GitHub
# 3. Add environment variables:
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
JOBS_FILE_PATH=/app/data/jobs.json

# 4. Add persistent volume:
# - Go to Volumes tab
# - Create new volume
# - Mount path: /app/data

# 5. Get backend URL: https://your-project.railway.app
```

### 2. Deploy Frontend to Vercel (5 min)

```bash
# 1. Go to vercel.com and sign up
# 2. Import GitHub repository
# 3. Add environment variable:
VITE_API_BASE_URL=https://your-project.railway.app/api

# 4. Update vercel.json with your Railway URL
# 5. Deploy
# 6. Get frontend URL: https://your-app.vercel.app
```

### 3. Update CORS (2 min)

```bash
# In Railway, add:
FRONTEND_URL=https://your-app.vercel.app

# Backend will auto-redeploy
```

### 4. Test (5 min)

```bash
# 1. Visit: https://your-app.vercel.app
# 2. Test: https://your-project.railway.app/api/health
# 3. Create a job
# 4. Verify it works
```

## 📋 Important Files

### vercel.json
- Frontend configuration
- Update with your Railway backend URL

### railway.json
- Backend configuration (optional)
- Railway auto-detects Node.js projects

### Environment Variables

**Vercel**:
```
VITE_API_BASE_URL=https://your-project.railway.app/api
```

**Railway**:
```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
JOBS_FILE_PATH=/app/data/jobs.json
```

## 🐛 Troubleshooting

### Download Not Working?
1. Check remote API server logs
2. Verify file path: `output_videos_latest/video_name/final_without_post_process_*/file.mp4`
3. Check file exists on remote server
4. Verify file permissions

### Frontend Can't Connect?
1. Check `VITE_API_BASE_URL` in Vercel
2. Verify backend URL: `https://your-project.railway.app/api/health`
3. Check CORS in backend
4. Check browser console for errors

### Jobs Lost After Deploy?
1. Use Railway persistent volume (see Step 1.4)
2. Or use database instead of file storage
3. Jobs should persist across redeployments

## 📚 Full Documentation

- **Complete Guide**: `VERCEL_DEPLOYMENT.md`
- **Step-by-Step**: `DEPLOYMENT_STEPS.md`
- **Quick Start**: `DEPLOYMENT_QUICK_START.md`
- **Job Tracking**: `JOB_TRACKING_SESSIONS.md`

## ⚠️ Important Notes

1. **Vercel = Frontend only** - Don't run Node.js server on Vercel
2. **Railway = Backend** - Deploy Node.js server to Railway
3. **Remote servers stay on Docker/VPS** - Keep existing infrastructure
4. **Use environment variables** - Never hardcode URLs
5. **Set up persistent storage** - Use Railway volume or database
6. **Configure CORS** - Allow requests from Vercel domain

## 💰 Cost

- **Vercel**: Free (Hobby) or $20/month (Pro)
- **Railway**: $5/month (Hobby) or $20/month (Pro)
- **Remote servers**: Your existing infrastructure

---

**Ready?** Follow the steps above and deploy in 15 minutes!

