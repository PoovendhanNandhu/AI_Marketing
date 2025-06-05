# Stripe Configuration

## Setup

1. Sign up for a Stripe account at [stripe.com](https://stripe.com)
2. Navigate to the Stripe Dashboard
3. Go to Developers > API keys
4. Copy the "Secret key" (starts with `sk_test_` for test mode)
5. Add the following environment variables to your .env file:

```
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_key
```

## Stripe Products & Prices Setup

1. In the Stripe Dashboard, go to Products > Add Product
2. Create the following subscription products:

### Basic Plan
- Name: Basic AI Marketing
- Description: Essential AI marketing tools for small businesses
- Price: $29.99/month (recurring)
- Features:
  - AI content suggestions
  - Basic analytics
  - Limited campaign automation

### Pro Plan
- Name: Pro AI Marketing
- Description: Advanced AI marketing suite for growing businesses
- Price: $79.99/month (recurring)
- Features:
  - All Basic features
  - Advanced analytics
  - Unlimited campaign automation
  - A/B testing
  - Custom AI models

### Enterprise Plan
- Name: Enterprise AI Marketing
- Description: Complete AI marketing platform for large organizations
- Price: $199.99/month (recurring)
- Features:
  - All Pro features
  - Dedicated account manager
  - API access
  - Custom integrations
  - Advanced security

3. Copy the Price IDs for each plan (starts with `price_`) and add them to your .env file:

```
STRIPE_BASIC_PRICE_ID=price_your_basic_plan_id
STRIPE_PRO_PRICE_ID=price_your_pro_plan_id
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_plan_id
```

## Webhook Setup

1. In the Stripe Dashboard, go to Developers > Webhooks
2. Add an endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the Webhook Signing Secret (starts with `whsec_`) and add it to your .env file 