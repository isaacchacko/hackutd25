# FoldForge AI
This project is an AI-powered protein analysis in seconds. Unlock deep insights into protein structures, mutations, and drug targets with our advanced AI analysis platform.

## Features
- AI-Powered Analysis
- Structure Analysis
- Literature Search
- Comprehensive Reports

## Requirements
- Next.js
- Python 3.13
- Node.js 20+
- requirements.txt in foldpilot-backend
- NVIDIA Nemotron API

## Quick Start

### Local Development

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed setup instructions.

**Backend:**
```bash
cd foldpilot-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd foldpilot-frontend
npm install
npm run dev
```

### Railway Deployment

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for complete deployment guide.

The project is configured to work both locally and on Railway with proper environment variable configuration.
