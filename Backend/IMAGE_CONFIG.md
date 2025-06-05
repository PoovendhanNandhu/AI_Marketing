# Google Imagen API Configuration

This document explains how to set up Google's Imagen API for use with the AI Marketing platform's image generation feature.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled
3. Access to Google's Generative AI services

## Setup Steps

### 1. Enable Required APIs

1. Go to the [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key for Generative AI
4. Save this API key securely

Alternatively, through Google Cloud Console:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable "Generative Language API"

### 2. Create API Key

1. In Google AI Studio, navigate to "API Keys" section
2. Click "Create API Key"
3. Copy the generated API key
4. (Optional but recommended) Add a description for what the key is used for

### 3. Set Environment Variables

Add your Google API key to the `.env` file in the backend project:

```
GOOGLE_API_KEY=your_google_api_key_here
```

### 4. Access to Imagen

Google's Imagen is available through the Generative AI API. To use it:

1. Make sure your Google account has access to the Gemini and Imagen models
2. If you're in a region where access is restricted, you may need to use a VPN
3. Be aware of [content safety policies](https://ai.google.dev/docs/safety_setting)

## Usage Notes

- Keep your API keys secure and never commit them to version control
- Set appropriate usage quotas to manage costs
- Monitor your API usage through the Google AI Studio dashboard
- Consider implementing caching for generated images to reduce API calls
- The free tier has limitations on requests per minute and total monthly requests

## Troubleshooting

- If you receive "Access Denied" errors, verify that your account has the proper permissions
- Check that you're using the correct API key
- Error 429 indicates you've hit rate limits - implement exponential backoff for retries
- If images aren't generating as expected, try refining your prompts or using different styles

## Additional Resources

- [Google Generative AI Documentation](https://ai.google.dev/docs)
- [Imagen API Reference](https://ai.google.dev/api/rest/v1beta/models/generateImage)
- [API Pricing Information](https://ai.google.dev/pricing)
- [Content Safety Information](https://ai.google.dev/docs/safety_setting) 