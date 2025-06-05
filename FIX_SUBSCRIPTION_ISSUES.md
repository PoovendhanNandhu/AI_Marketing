# Fix Subscription Issues for Image Generation

This guide will help you resolve the issue where subscribers are being asked to upgrade after generating just 1 image.

## The Problem

The issue has three main causes:

1. **Database function bug**: The `increment_user_image_generations` function increments the counter even for unlimited subscriptions
2. **Missing subscription updates**: Some paid users might not have their `image_generations_limit` set to `-1` (unlimited)
3. **Frontend not checking Stripe**: The image generator wasn't checking for active Stripe subscriptions before checking limits

## The Solution

### Step 1: Run the Database Fix

1. Go to your Supabase SQL Editor
2. Copy and paste the contents of `fix_image_generation_subscription.sql`
3. Run the entire script

This will:
- Fix the database function to properly handle unlimited subscriptions
- Update all paid subscribers to have unlimited image generations
- Ensure free users have the correct limits (3 images)
- Create diagnostic functions to help troubleshoot

### Step 2: Verify the Database Changes

After running the SQL script, you should see output showing:
- How many subscriptions were updated
- Current subscription status by plan
- Any inconsistencies that need manual fixing

### Step 3: Frontend Updates

The frontend code has been updated to:
- Check Stripe subscriptions on page load
- Automatically update Supabase subscription limits for paid users
- Refresh usage stats after each generation
- Better handle unlimited subscriptions in the UI

### Step 4: Test the Fix

1. Log in as a subscriber
2. Go to the image generator page
3. Generate an image
4. Verify that:
   - The usage counter shows "X of Unlimited" for paid users
   - You can generate multiple images without hitting limits
   - Free users still see their proper limits (3 images)

## How It Works Now

### For Free Users:
- `image_generations_limit = 3`
- `image_generations_used` increments from 0 to 3
- After 3 generations, they're asked to upgrade

### For Paid Users:
- `image_generations_limit = -1` (unlimited)
- `image_generations_used` is NOT incremented (stays at 0)
- They can generate unlimited images
- UI shows "Unlimited" in the usage display

## Database Schema

The key fields in `user_subscriptions` table:
```sql
image_generations_used INTEGER NOT NULL DEFAULT 0,
image_generations_limit INTEGER NOT NULL DEFAULT 3,
```

Where:
- `limit = 3` for free users
- `limit = -1` for paid users (unlimited)
- `used` only increments for non-unlimited users

## Troubleshooting

### If a paid user still hits limits:

1. Check their subscription in Supabase:
```sql
SELECT * FROM user_subscriptions WHERE user_id = 'their-user-id';
```

2. If `image_generations_limit` is not `-1`, run:
```sql
SELECT * FROM fix_user_subscription_limits('their-user-id');
```

3. If they don't have a Stripe subscription linked, check the Stripe webhook logs

### If the issue persists:

1. Check the backend logs when generating images
2. Verify the `increment_user_image_generations` function was updated
3. Ensure the Stripe webhooks are working properly

## Key Files Modified

- `fix_image_generation_subscription.sql` - Database fix
- `Frontend/app/ai-apps/image-generator/page.tsx` - Frontend improvements
- `Backend/routes/imageRoutes.js` - Already had correct logic
- `Backend/routes/stripe.js` - Already sets unlimited for paid users

The fix ensures that the subscription system works consistently across all features (articles, chat, and images) with the same unlimited model for paid subscribers. 