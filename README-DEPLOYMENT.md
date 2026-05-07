# Deploying Jungle Computing to Vercel

## Overview

Jungle Computing is a WebSocket-based distributed computing visualization. This guide covers deployment strategies for Vercel.

## Important: WebSocket Limitations on Vercel

⚠️ **Vercel does not support persistent WebSocket connections** in serverless functions. You have two deployment options:

---

## Option 1: Static Frontend Only (Simplest)

Deploy just the frontend to Vercel and use **Demo Mode** (offline simulation with bots).

### Steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (Select your account)
   - Link to existing project? **N**
   - Project name? `jungle-computing` (or your preference)
   - In which directory is your code located? `./`
   - Want to override settings? **N**

3. **Access your deployment**:
   - Vercel will provide a URL like: `https://jungle-computing.vercel.app`
   - The app will load in **Demo Mode** by default (if server is unreachable)

### Advantages:
- ✅ Simple, one-command deployment
- ✅ Free on Vercel
- ✅ Fast CDN delivery
- ✅ Automatic HTTPS

### Limitations:
- ❌ No real-time multiplayer (Demo Mode only)
- ❌ Bots only, no real users

---

## Option 2: Hybrid Deployment (Frontend on Vercel + Backend Elsewhere)

Deploy the frontend to Vercel and the WebSocket server to a platform that supports persistent connections.

### Part A: Deploy Frontend to Vercel

Same as Option 1 above.

### Part B: Deploy WebSocket Server

Choose one of these platforms for the backend:

#### **Railway.app** (Recommended - Easy & Free Tier)

1. **Create account** at [railway.app](https://railway.app)

2. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

3. **Login and deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

4. **Get your WebSocket URL**:
   - Railway will provide a URL like: `wss://your-app.railway.app`
   - Note the port (usually 8080)

5. **Update frontend configuration**:
   - Edit `JungleComputing6.html` line 315
   - Change: `const WS_URL = "ws://127.0.0.1:8080";`
   - To: `const WS_URL = "wss://your-app.railway.app";`

6. **Redeploy frontend to Vercel**:
   ```bash
   vercel --prod
   ```

#### **Alternative: Render.com**

1. Create account at [render.com](https://render.com)
2. Create new **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Deploy and get your WebSocket URL
6. Update frontend as described above

#### **Alternative: Fly.io**

1. Install flyctl: [fly.io/docs/hands-on/install-flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Create `fly.toml`:
   ```toml
   app = "jungle-computing-ws"
   
   [build]
   
   [env]
     PORT = "8080"
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   
     [[services.ports]]
       port = 80
       handlers = ["http"]
   
     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```
3. Deploy: `fly deploy`
4. Update frontend configuration

### Advantages:
- ✅ Full multiplayer functionality
- ✅ Real-time messaging between users
- ✅ Frontend on Vercel's fast CDN
- ✅ Backend on appropriate infrastructure

### Considerations:
- 🔧 Requires managing two deployments
- 💰 May require paid tier for backend (depending on usage)

---

## Option 3: Environment-Based Configuration (Best Practice)

Make the WebSocket URL configurable so you can easily switch between local development and production.

### Update `JungleComputing6.html`:

Replace line 315:
```javascript
const WS_URL = "ws://127.0.0.1:8080";
```

With:
```javascript
const WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "ws://127.0.0.1:8080"  // Local development
    : "wss://your-backend.railway.app";  // Production
```

This way:
- Local development automatically uses `ws://127.0.0.1:8080`
- Production automatically uses your deployed backend

---

## Quick Start Commands

### Deploy to Vercel (Frontend Only):
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Deploy Backend to Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## Testing Your Deployment

1. **Visit your Vercel URL**: `https://your-project.vercel.app`
2. **Check the status indicator**:
   - 🟢 Green = Connected to WebSocket server
   - 🟡 Yellow = Demo Mode (offline)
   - 🔴 Red = Connection error
3. **Test messaging**:
   - Open in multiple browser tabs/windows
   - Send messages to verify real-time sync

---

## Troubleshooting

### "Disconnected (Retrying...)" on Vercel
- This is expected if you deployed frontend only
- The app will automatically switch to Demo Mode
- To enable multiplayer, deploy the backend separately

### CORS Errors
- Ensure your backend allows connections from your Vercel domain
- Add CORS headers if needed (not required for WebSocket in this case)

### Mixed Content Errors (HTTP/HTTPS)
- Use `wss://` (secure WebSocket) for production, not `ws://`
- Vercel serves over HTTPS, so backend must also use secure connections

---

## Cost Estimates

### Free Tier Options:
- **Vercel**: Free for personal projects (100GB bandwidth/month)
- **Railway**: $5 free credit/month (usually sufficient for small projects)
- **Render**: Free tier available (may sleep after inactivity)
- **Fly.io**: Free tier with limitations

### Recommended for Production:
- **Vercel Pro**: $20/month (if you need more bandwidth)
- **Railway**: Pay-as-you-go (~$5-10/month for small apps)

---

## Next Steps

1. Choose your deployment strategy (Option 1 or 2)
2. Follow the relevant steps above
3. Update the WebSocket URL if using Option 2
4. Test your deployment
5. Share your Vercel URL!

---

## Files Created for Vercel Deployment

- ✅ `vercel.json` - Vercel configuration
- ✅ `index.html` - Default landing page (redirects to JungleComputing6.html)
- ✅ `.vercelignore` - Excludes server files from deployment
- ✅ `README-DEPLOYMENT.md` - This guide

---

## Support

For issues:
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Render Docs: [render.com/docs](https://render.com/docs)
