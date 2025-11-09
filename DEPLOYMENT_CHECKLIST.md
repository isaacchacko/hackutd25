# Railway Deployment Checklist

Use this checklist when deploying to Railway.

## Pre-Deployment

- [ ] Ensure all code is committed and pushed to GitHub
- [ ] Verify NVIDIA_API_KEY is available
- [ ] Test both services locally

## Backend Service Setup

- [ ] Create new Railway service from `foldpilot-backend` directory
- [ ] Set environment variables:
  - [ ] `PORT=8000` (Railway sets this automatically, but good to have)
  - [ ] `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001` (for local testing)
  - [ ] `FRONTEND_URL=<will-set-after-frontend-deployment>`
  - [ ] `NVIDIA_API_KEY=<your-key>`
- [ ] Wait for deployment to complete
- [ ] Copy the Railway URL (e.g., `https://foldpilot-backend-production.up.railway.app`)
- [ ] Test health endpoint: `https://your-backend-url/health`

## Frontend Service Setup

- [ ] Create new Railway service from `foldpilot-frontend` directory
- [ ] Set environment variables:
  - [ ] `NEXT_PUBLIC_API_URL=<backend-railway-url>`
- [ ] Wait for deployment to complete
- [ ] Copy the Railway URL (e.g., `https://foldpilot-frontend-production.up.railway.app`)

## Post-Deployment Configuration

- [ ] Update backend `FRONTEND_URL` with frontend Railway URL
- [ ] Verify CORS is working (check backend logs for allowed origins)
- [ ] Test frontend → backend communication
- [ ] Generate public domains (optional but recommended):
  - [ ] Backend: Settings → Networking → Generate Domain
  - [ ] Frontend: Settings → Networking → Generate Domain
- [ ] Update environment variables with public domains if generated

## Verification

- [ ] Backend health check: `https://your-backend-url/health`
- [ ] Frontend loads without errors
- [ ] API calls from frontend succeed
- [ ] CORS errors are resolved
- [ ] Test a protein analysis query end-to-end

## Troubleshooting

If you encounter issues:

1. **CORS Errors**: Check that `FRONTEND_URL` in backend matches frontend URL exactly
2. **Connection Errors**: Verify `NEXT_PUBLIC_API_URL` is set correctly
3. **Build Errors**: Check Railway build logs for specific errors
4. **Port Issues**: Railway automatically sets `PORT`, ensure your Procfile uses `$PORT`

## Local Development After Deployment

You can still develop locally:
- Backend: Uses `.env` file (not committed)
- Frontend: Uses `.env.local` file (not committed)
- Set `NEXT_PUBLIC_API_URL=http://localhost:8000` for local backend
- Or set `NEXT_PUBLIC_API_URL=<railway-backend-url>` to test against remote backend

