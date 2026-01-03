# AI Assistant - Powered by Llama 3 70B on Groq

A standalone AI assistant that uses Groq's cloud GPUs to run Llama 3 70B.

## Features (Phase 1)

- ✅ Chat with Llama 3 70B
- ✅ Upload and analyze files (TXT, MD, CSV, JSON, DOCX, XLSX, PDF)
- ✅ Voice input (speech-to-text)
- ✅ Voice output (text-to-speech)
- ✅ Works on any computer via browser

## Deployment to Vercel

### Step 1: Create GitHub Repository

1. Go to github.com
2. Click "New" (green button)
3. Name it: `groq-ai-assistant`
4. Click "Create repository"

### Step 2: Upload Files

Upload all files from this project to your new GitHub repository.

### Step 3: Deploy to Vercel

1. Go to vercel.com
2. Click "Add New" → "Project"
3. Select your `groq-ai-assistant` repository
4. In "Environment Variables" section, add:
   - Name: `GROQ_API_KEY`
   - Value: `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`
5. Click "Deploy"

### Step 4: Access Your App

After deployment, Vercel will give you a URL like:
`https://groq-ai-assistant.vercel.app`

Open this URL on any computer to use your AI assistant.

## Local Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Environment Variables

| Variable | Description |
|----------|-------------|
| GROQ_API_KEY | Your Groq API key from console.groq.com |
