# Subscription System Setup

This document explains how to set up the subscription system for the AI Marketing application, which includes usage limits for different features.

## Database Setup

### If you're setting up a new database:

Run the `supabase_sql_setup.sql` file in your Supabase SQL editor, which already includes the image generation limits.

### If you have an existing database:

Run the `update_subscriptions_table.sql` file in your Supabase SQL editor to add the image generation columns to your existing user_subscriptions table.

## Features with Usage Limits

The subscription system now supports usage limits for:

1. **Articles**: Number of article generations per subscription period
2. **Chat Messages**: Number of chat messages per subscription period
3. **Image Generations**: Number of image generations per subscription period

## Default Limits

The system includes the following default limits:

| Plan     | Article Limit | Chat Messages Limit | Image Generation Limit |
|----------|---------------|---------------------|------------------------|
| Free     | 5             | 300                 | 3                      |
| Basic    | 10            | 600                 | 30                     |
| Pro      | 25            | 1500                | 100                    |
| Business | 50            | 3000                | 300                    |

## API Endpoints

The following API endpoints have been implemented for usage tracking:

- `GET /api/images/usage/:userId`: Get image generation usage stats
- `POST /api/images/generate`: Generate images (now checks limits)

## Frontend Integration

The image generator page now integrates with the subscription system and shows:

1. A usage progress bar
2. Limits and remaining usage
3. Upgrade buttons for free tier users
4. Error messages when limits are reached

## Usage Hook

A new hook has been created (`useSubscription`) that can be used to check usage limits for any feature:

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function YourComponent() {
  const { 
    canUseFeature, 
    getRemainingUsage, 
    getUsagePercentage,
    isPremium 
  } = useSubscription();
  
  // Check if user can use a feature
  const canGenerateImage = canUseFeature('image');
  
  // Get remaining usage
  const remainingImages = getRemainingUsage('image');
  
  // Get usage percentage (0-100)
  const imageUsagePercent = getUsagePercentage('image');
  
  // Check if user is on premium plan
  const userIsPremium = isPremium();
  
  // ...
}
```

## Next Steps

1. Implement usage limit checks for Chat and Article features
2. Update the pricing page to reflect feature limits
3. Add subscription management in user profile 