# Backend Deployment Guide

## Deploying to Render

### 1. Prerequisites
- A Render account
- All required environment variables (see below)
- This backend repository

### 2. Required Environment Variables

Set these environment variables in your Render service settings:

#### Core Configuration
```
NODE_ENV=production
PORT=10000
```

#### Authentication & Database
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

#### AI Services
```
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_google_gemini_api_key
```

#### Payment Processing
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

#### Email Configuration
```
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
RECIPIENT_EMAIL=email_where_contact_forms_are_sent
```

#### Image Generation (Optional)
```
REPLICATE_API_TOKEN=your_replicate_api_token
STABILITY_API_KEY=your_stability_ai_api_key
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REFRESH_TOKEN=your_google_oauth_refresh_token
DEFAULT_FREE_LIMIT=5
```

### 3. Render Service Configuration

#### Build Settings
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18.x or higher
- **Root Directory**: `/Backend` (if deploying from monorepo)

#### Health Check
The backend includes a health check endpoint at `/health` that returns:
```json
{"status": "ok"}
```

### 4. Deployment Steps

1. **Connect Repository**: Link your GitHub repository to Render
2. **Create Web Service**: Choose "Web Service" in Render dashboard
3. **Configure Build**: 
   - Root Directory: `Backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Set Environment Variables**: Add all required variables from the list above
5. **Deploy**: Render will automatically build and deploy

### 5. Post-Deployment

#### Verify Deployment
1. Check the health endpoint: `https://your-app.onrender.com/health`
2. Test API endpoints
3. Verify webhook endpoints for Stripe

#### Monitoring
- Monitor logs in Render dashboard
- Check for any missing environment variables
- Verify all third-party API integrations

### 6. API Endpoints

The backend provides these main endpoints:
- `/health` - Health check
- `/api/articles` - Article generation
- `/api/chat-assistant` - Chat functionality  
- `/api/contact` - Contact form handling
- `/api/stripe` - Payment processing
- `/api/images` - Image generation

### 7. Troubleshooting

#### Common Issues
1. **Missing Environment Variables**: Check Render logs for any `undefined` variable errors
2. **Build Failures**: Ensure Node.js version is 18.x or higher
3. **API Timeouts**: Increase timeout settings if using AI services
4. **Webhook Issues**: Verify Stripe webhook URL points to your Render service

#### Debug Mode
Set `NODE_ENV=development` temporarily to get detailed error messages.

---

## Alternative Deployment Platforms

### Heroku
Similar setup, use `Procfile`:
```
web: npm start
```

### Railway
- Auto-detects Node.js
- Set environment variables in dashboard
- Deploy from GitHub

### DigitalOcean App Platform
- Similar to Render
- Use same environment variables
- Configure via `app.yaml` if needed 