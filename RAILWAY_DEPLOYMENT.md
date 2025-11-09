# Railway Deployment Guide

This guide will help you deploy FoldPilot AI to Railway while maintaining the ability to run locally.

## Architecture

The project consists of two services:
- **Backend**: FastAPI application (`foldpilot-backend/`)
- **Frontend**: Next.js application (`foldpilot-frontend/`)

Both services can run independently and communicate via HTTP.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. Railway CLI (optional, but recommended): `npm i -g @railway/cli`
3. NVIDIA API key (for LLM functionality)

## Deployment Steps

### 1. Create Railway Project

1. Go to https://railway.app and create a new project
2. Select "Deploy from GitHub repo" or use Railway CLI

### 2. Deploy Backend Service

1. In Railway dashboard, click "New Service" → "GitHub Repo"
2. Select your repository and choose the `foldpilot-backend` directory
3. Railway will automatically detect the Python project and use the `Procfile` or `railway.json`

#### Backend Environment Variables

Set these in Railway dashboard (Settings → Variables):

```
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=<your-frontend-railway-url>
NVIDIA_API_KEY=<your-nvidia-api-key>
```

**Important**: After deploying the frontend, update `FRONTEND_URL` with the actual Railway URL of your frontend service.

### 3. Deploy Frontend Service

1. In the same Railway project, click "New Service" → "GitHub Repo"
2. Select your repository and choose the `foldpilot-frontend` directory
3. Railway will automatically detect the Node.js project

#### Frontend Environment Variables

Set these in Railway dashboard (Settings → Variables):

```
NEXT_PUBLIC_API_URL=<your-backend-railway-url>
```

**Important**: Use the Railway-generated URL for your backend service (e.g., `https://foldpilot-backend-production.up.railway.app`)

### 4. Configure Service Communication

After both services are deployed:

1. **Get Backend URL**: Copy the Railway URL from your backend service (e.g., `https://foldpilot-backend-production.up.railway.app`)
2. **Update Frontend**: Set `NEXT_PUBLIC_API_URL` in frontend service to the backend URL
3. **Get Frontend URL**: Copy the Railway URL from your frontend service
4. **Update Backend CORS**: Set `FRONTEND_URL` in backend service to the frontend URL

### 5. Generate Public URLs (Optional)

Railway provides private URLs by default. To get public URLs:

1. Go to each service → Settings → Networking
2. Click "Generate Domain" to create a public domain
3. Update environment variables with the new public URLs

## Local Development Setup

### Backend

1. Navigate to `foldpilot-backend/`
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create `.env` file:
   ```bash
   PORT=8000
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   NVIDIA_API_KEY=your_nvidia_api_key_here
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend

1. Navigate to `foldpilot-frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` file:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables Reference

### Backend (`foldpilot-backend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `8000` | No |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,http://localhost:3001` | No |
| `FRONTEND_URL` | Frontend URL for CORS (Railway) | - | Yes (for Railway) |
| `NVIDIA_API_KEY` | NVIDIA API key for LLM | - | Yes |

### Frontend (`foldpilot-frontend/.env.local`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` | No |

## Running Both Locally and Remotely

The configuration supports running services in different environments:

- **Local Frontend → Local Backend**: Set `NEXT_PUBLIC_API_URL=http://localhost:8000`
- **Local Frontend → Remote Backend**: Set `NEXT_PUBLIC_API_URL=<railway-backend-url>`
- **Remote Frontend → Remote Backend**: Set `NEXT_PUBLIC_API_URL=<railway-backend-url>` in Railway
- **Remote Frontend → Local Backend**: Not recommended (CORS/network issues)

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Check that `FRONTEND_URL` in backend matches your frontend URL exactly
2. Ensure `ALLOWED_ORIGINS` includes all necessary origins
3. Check backend logs for the CORS allowed origins list

### Connection Errors

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check that backend service is running and healthy
3. Test backend health endpoint: `https://your-backend-url/health`

### Build Errors

1. Ensure all dependencies are in `requirements.txt` (backend) and `package.json` (frontend)
2. Check Railway build logs for specific errors
3. Verify Node.js/Python versions are compatible

## Railway-Specific Notes

- Railway automatically sets `$PORT` environment variable - use it in your Procfile
- Railway provides private networking between services in the same project
- Public domains are optional but recommended for production
- Environment variables set in Railway dashboard override local `.env` files

## Monitoring

- Check service health: `https://your-backend-url/health`
- View logs in Railway dashboard for each service
- Monitor resource usage in Railway dashboard

## Support

For Railway-specific issues, check:
- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

