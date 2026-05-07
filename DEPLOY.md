# Quick Deployment Checklist

## ✅ Pre-Deployment Setup (One-time)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. (Optional) Install Railway CLI for backend
```bash
npm install -g @railway/cli
```

---

## 🚀 Option A: Deploy Frontend Only (Demo Mode)

This deploys just the visualization with bot simulation (no real multiplayer).

```bash
# From the project directory
vercel

# For production deployment
vercel --prod
```

**Result**: Your app will be live at `https://your-project.vercel.app` in Demo Mode.

---

## 🚀 Option B: Deploy Full Stack (Frontend + Backend)

This enables real multiplayer functionality.

### Step 1: Deploy Backend to Railway

```bash
# Login to Railway
railway login

# Initialize project (first time only)
railway init

# Deploy the backend
railway up

# Get your Railway URL
railway domain
```

**Note the URL** - it will look like: `jungle-computing-production.up.railway.app`

### Step 2: Update Frontend Configuration

Edit `JungleComputing6.html` line 318:

Change:
```javascript
: "wss://your-backend-url-here.railway.app";
```

To:
```javascript
: "wss://jungle-computing-production.up.railway.app";  // Use YOUR Railway URL
```

### Step 3: Deploy Frontend to Vercel

```bash
# Deploy to production
vercel --prod
```

**Result**: Full multiplayer app with real-time messaging!

---

## 🧪 Testing Your Deployment

1. **Open your Vercel URL** in a browser
2. **Check the status indicator** (top-left):
   - 🟢 **Green "Connected"** = Backend is working!
   - 🟡 **Yellow "Demo Mode"** = Running offline (frontend only)
   - 🔴 **Red "Disconnected"** = Backend unreachable

3. **Test multiplayer** (if backend deployed):
   - Open in 2+ browser tabs
   - Send a message in one tab
   - See it appear in other tabs instantly

---

## 🔄 Updating Your Deployment

### Update Frontend
```bash
# Make your changes to HTML/JS files
# Then redeploy:
vercel --prod
```

### Update Backend
```bash
# Make changes to server.js
# Then redeploy:
railway up
```

---

## 📊 Monitoring

### Vercel Dashboard
- Visit: https://vercel.com/dashboard
- View deployments, analytics, and logs

### Railway Dashboard
- Visit: https://railway.app/dashboard
- Monitor server status, logs, and metrics

---

## 🐛 Troubleshooting

### "Demo Mode" when you expect multiplayer
- ✅ Check that backend is deployed and running
- ✅ Verify WebSocket URL in `JungleComputing6.html` is correct
- ✅ Use `wss://` (not `ws://`) for production
- ✅ Check Railway logs: `railway logs`

### Deployment fails on Vercel
- ✅ Check `.vercelignore` excludes server files
- ✅ Verify `vercel.json` is valid JSON
- ✅ Check Vercel deployment logs in dashboard

### Backend connection errors
- ✅ Ensure Railway service is running
- ✅ Check that port 8080 is configured
- ✅ Verify no firewall blocking WebSocket connections

---

## 💡 Tips

- **Local Development**: Just open `JungleComputing6.html` in a browser (runs `node server.js` separately if you want multiplayer locally)
- **Free Tier**: Both Vercel and Railway offer free tiers suitable for personal projects
- **Custom Domain**: You can add a custom domain in both Vercel and Railway dashboards
- **Environment Variables**: For advanced setups, use Vercel environment variables instead of hardcoding URLs

---

## 📝 Summary

**Simplest** (Demo Mode only):
```bash
vercel --prod
```

**Full Featured** (Multiplayer):
```bash
# 1. Deploy backend
railway up

# 2. Update JungleComputing6.html with Railway URL

# 3. Deploy frontend
vercel --prod
```

**Done!** 🎉
