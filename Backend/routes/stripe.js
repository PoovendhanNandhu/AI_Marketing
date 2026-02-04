const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');

// Create a checkout session for subscription
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl, customerId } = req.body;
    
    console.log("Creating checkout session with:", { priceId, customerId, successUrl, cancelUrl });
    
    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let stripeCustomerId = null;
    
    // Check if the customer already exists in Stripe
    if (customerId) {
      try {
        // Try to fetch the existing customer
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if (existingCustomer && !existingCustomer.deleted) {
          stripeCustomerId = existingCustomer.id;
          console.log(`Using existing Stripe customer: ${stripeCustomerId}`);
        }
      } catch (err) {
        console.log(`Customer not found in Stripe: ${customerId}. Will create new customer.`);
      }
    }
    
    // Create a new customer if one doesn't exist
    if (!stripeCustomerId && customerId) {
      try {
        const newCustomer = await stripe.customers.create({
          metadata: {
            supabaseUserId: customerId
          }
        });
        stripeCustomerId = newCustomer.id;
        console.log(`Created new Stripe customer: ${stripeCustomerId}`);
      } catch (err) {
        console.error('Error creating Stripe customer:', err);
        return res.status(500).json({ error: 'Failed to create Stripe customer' });
      }
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: stripeCustomerId || undefined,
    });
    
    console.log("Checkout session created:", { id: session.id, url: session.url });
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription plans
router.get('/plans', async (req, res) => {
  try {
    console.log("Fetching subscription plans from Stripe...");
    // Fetch all products with associated prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    
    console.log(`Found ${products.data.length} products from Stripe`);
    
    // Check if any products are missing default_price
    if (products.data.some(product => !product.default_price)) {
      console.warn("Some products are missing default_price:", 
        products.data.filter(p => !p.default_price).map(p => ({ id: p.id, name: p.name }))
      );
    }
    
    // Format the response
    const plans = products.data.map(product => {
      const price = product.default_price;
      
      // Log details about each product and its price
      if (price) {
        console.log(`Product: ${product.name}, Price: ${price.unit_amount/100} ${price.currency}, ID: ${price.id}`);
      } else {
        console.warn(`Product ${product.name} has no default price`);
      }
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price ? price.unit_amount / 100 : 0, // Convert from cents to dollars
        currency: price ? price.currency : 'usd',
        interval: price ? (price.recurring ? price.recurring.interval : 'month') : 'month',
        priceId: price ? price.id : null,
        features: product.metadata.features ? JSON.parse(product.metadata.features) : [],
      };
    });
    
    console.log(`Returning ${plans.length} formatted plans`);
    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer subscription info
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log("Fetching subscription info for customer:", customerId);
    
    // First, check if this customer exists in Stripe
    let stripeCustomerId = null;
    
    try {
      // Try to retrieve the customer directly (if customerId is already a Stripe customer ID)
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        stripeCustomerId = customer.id;
        console.log(`Found existing Stripe customer: ${stripeCustomerId}`);
      }
    } catch (err) {
      // If direct lookup fails, try to find by metadata (Supabase user ID)
      console.log(`Direct customer lookup failed, searching by metadata for: ${customerId}`);
      
      try {
        const customers = await stripe.customers.search({
          query: `metadata['supabaseUserId']:'${customerId}'`,
        });
        
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
          console.log(`Found Stripe customer by metadata: ${stripeCustomerId}`);
        } else {
          console.log(`No Stripe customer found for Supabase user: ${customerId}`);
          return res.json({ hasActiveSubscription: false, customerExists: false });
        }
      } catch (searchErr) {
        console.log(`Customer search failed: ${searchErr.message}`);
        return res.json({ hasActiveSubscription: false, customerExists: false });
      }
    }
    
    if (!stripeCustomerId) {
      console.log(`No Stripe customer found for: ${customerId}`);
      return res.json({ hasActiveSubscription: false, customerExists: false });
    }
    
    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      expand: ['data.default_payment_method', 'data.plan.product'],
    });
    
    if (subscriptions.data.length === 0) {
      console.log(`No active subscriptions found for customer ${stripeCustomerId}`);
      return res.json({ 
        hasActiveSubscription: false, 
        customerExists: true,
        stripeCustomerId 
      });
    }
    
    const subscription = subscriptions.data[0];
    console.log(`Found active subscription for customer ${stripeCustomerId}: ${subscription.id}`);
    
    res.json({
      hasActiveSubscription: true,
      customerExists: true,
      stripeCustomerId,
      subscriptionId: subscription.id,
      planId: subscription.plan.product.id,
      planName: subscription.plan.product.name,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Error fetching customer subscription:', error);
    
    // Check if it's a "customer not found" error
    if (error.code === 'resource_missing' && error.param === 'customer') {
      console.log(`Customer not found in Stripe: ${req.params.customerId}`);
      return res.json({ hasActiveSubscription: false, customerExists: false });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }
    
    // Cancel at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a portal session to manage subscription
router.post('/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    
    if (!customerId || !returnUrl) {
      return res.status(400).json({ error: 'Customer ID and return URL are required' });
    }
    
    // First, find the actual Stripe customer ID
    let stripeCustomerId = null;
    
    try {
      // Try direct lookup first
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        stripeCustomerId = customer.id;
      }
    } catch (err) {
      // Try to find by metadata
      try {
        const customers = await stripe.customers.search({
          query: `metadata['supabaseUserId']:'${customerId}'`,
        });
        
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        }
      } catch (searchErr) {
        console.error('Customer search failed:', searchErr);
      }
    }
    
    if (!stripeCustomerId) {
      return res.status(404).json({ error: 'Customer not found in Stripe' });
    }
    
    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not set in environment variables");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    console.log("Received Stripe webhook. Verifying signature...");
    
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log(`Processing Stripe event: ${event.type}`);
    
    // Handle specific webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        const checkoutSession = event.data.object;
        // Handle successful checkout
        console.log(`Checkout completed for customer: ${checkoutSession.customer}`);
        console.log(`Subscription: ${checkoutSession.subscription}`);
        
        try {
          // If your app requires further actions after subscription checkout
          // such as updating your database or creating resources
          const subscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription
          );
          console.log(`Subscription plan: ${subscription.plan.id}, status: ${subscription.status}`);
          
          // Get Supabase user ID from Stripe customer metadata
          const customer = await stripe.customers.retrieve(checkoutSession.customer);
          if (customer && customer.metadata && customer.metadata.supabaseUserId) {
            const supabaseUserId = customer.metadata.supabaseUserId;
            console.log(`Updating subscription for Supabase user: ${supabaseUserId}`);
            
            // Connect to Supabase and update user's subscription
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_KEY
            );
            
            // Check if user already has a subscription
            const { data: existingSubscriptions, error: fetchError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', supabaseUserId);
              
            if (fetchError) {
              console.error('Error fetching existing subscriptions:', fetchError);
              break;
            }
            
            if (existingSubscriptions && existingSubscriptions.length > 0) {
              // Update existing subscription
              const { error: updateError } = await supabase
                .from('user_subscriptions')
                .update({
                  plan_id: subscription.plan.product || 'paid',
                  status: subscription.status,
                  article_generations_limit: -1, // -1 indicates unlimited
                  chat_messages_limit: -1, // unlimited messages as well
                  image_generations_limit: -1, // unlimited image generations - FIXED!
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', supabaseUserId);
                
              if (updateError) {
                console.error('Error updating subscription in Supabase:', updateError);
              } else {
                console.log(`Successfully updated subscription for user ${supabaseUserId} to unlimited`);
              }
            } else {
              // Create new subscription
              const { error: insertError } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: supabaseUserId,
                  plan_id: subscription.plan.product || 'paid',
                  status: subscription.status,
                  article_generations_limit: -1, // unlimited
                  chat_messages_limit: -1, // unlimited
                  image_generations_limit: -1, // unlimited image generations
                  article_generations_used: 0,
                  chat_messages_used: 0,
                  image_generations_used: 0,
                  current_period_start: new Date().toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                });
                
              if (insertError) {
                console.error('Error creating subscription in Supabase:', insertError);
              } else {
                console.log(`Successfully created unlimited subscription for user ${supabaseUserId}`);
              }
            }
          } else {
            console.error('Could not find Supabase user ID in Stripe customer metadata');
          }
        } catch (err) {
          console.error('Error processing checkout session:', err);
        }
        break;
        
      case 'customer.subscription.created':
        const newSubscription = event.data.object;
        console.log(`New subscription created for customer: ${newSubscription.customer}`);
        console.log(`Subscription ID: ${newSubscription.id}, status: ${newSubscription.status}`);
        
        try {
          // Get customer details to find Supabase user ID
          const customer = await stripe.customers.retrieve(newSubscription.customer);
          if (customer && customer.metadata && customer.metadata.supabaseUserId) {
            const supabaseUserId = customer.metadata.supabaseUserId;
            
            // Connect to Supabase and update user's subscription
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_KEY
            );
            
            // Update or create subscription with unlimited generations
            const { error } = await supabase
              .from('user_subscriptions')
              .upsert({
                user_id: supabaseUserId,
                plan_id: newSubscription.plan.product || 'paid',
                status: newSubscription.status,
                article_generations_limit: -1, // unlimited 
                chat_messages_limit: -1, // unlimited
                image_generations_limit: -1, // unlimited image generations
                article_generations_used: 0,
                chat_messages_used: 0,
                image_generations_used: 0,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (error) {
              console.error('Error updating subscription in Supabase:', error);
            } else {
              console.log(`Successfully set unlimited generations for user ${supabaseUserId}`);
            }
          }
        } catch (err) {
          console.error('Error processing subscription created event:', err);
        }
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        console.log(`Subscription updated for customer: ${updatedSubscription.customer}`);
        console.log(`Subscription ID: ${updatedSubscription.id}, status: ${updatedSubscription.status}`);

        try {
          const customer = await stripe.customers.retrieve(updatedSubscription.customer);
          if (customer && customer.metadata && customer.metadata.supabaseUserId) {
            const supabaseUserId = customer.metadata.supabaseUserId;

            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_KEY
            );

            const { error } = await supabase
              .from('user_subscriptions')
              .update({
                status: updatedSubscription.status,
                current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', supabaseUserId);

            if (error) {
              console.error('Error updating subscription status in Supabase:', error);
            } else {
              console.log(`Successfully updated subscription status for user ${supabaseUserId}`);
            }
          }
        } catch (err) {
          console.error('Error processing subscription updated event:', err);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log(`Subscription deleted for customer: ${deletedSubscription.customer}`);
        console.log(`Subscription ID: ${deletedSubscription.id}, status: ${deletedSubscription.status}`);

        try {
          const customer = await stripe.customers.retrieve(deletedSubscription.customer);
          if (customer && customer.metadata && customer.metadata.supabaseUserId) {
            const supabaseUserId = customer.metadata.supabaseUserId;

            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_KEY
            );

            // Reset to free plan when subscription is deleted/canceled
            const { error } = await supabase
              .from('user_subscriptions')
              .update({
                plan_id: 'free',
                status: 'active',
                article_generations_limit: 5,
                chat_messages_limit: 300,
                image_generations_limit: 3,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', supabaseUserId);

            if (error) {
              console.error('Error resetting subscription to free in Supabase:', error);
            } else {
              console.log(`Successfully reset user ${supabaseUserId} to free plan`);
            }
          }
        } catch (err) {
          console.error('Error processing subscription deleted event:', err);
        }
        break;
        
      case 'invoice.paid':
        const invoice = event.data.object;
        console.log(`Invoice ${invoice.id} paid for customer: ${invoice.customer}`);
        
        try {
          // Get customer details to find Supabase user ID
          const customer = await stripe.customers.retrieve(invoice.customer);
          if (customer && customer.metadata && customer.metadata.supabaseUserId) {
            const supabaseUserId = customer.metadata.supabaseUserId;
            
            // Connect to Supabase and update user's subscription
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_KEY
            );
            
            // Ensure the subscription has unlimited generations
            const { error } = await supabase
              .from('user_subscriptions')
              .update({
                article_generations_limit: -1, // unlimited
                chat_messages_limit: -1, // unlimited
                image_generations_limit: -1, // unlimited image generations
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', supabaseUserId);
              
            if (error) {
              console.error('Error updating subscription after invoice payment:', error);
            } else {
              console.log(`Successfully updated limits for user ${supabaseUserId} after payment`);
            }
          }
        } catch (err) {
          console.error('Error processing invoice paid event:', err);
        }
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log(`Payment failed for invoice ${failedInvoice.id}, customer: ${failedInvoice.customer}`);

        try {
          const customer = await stripe.customers.retrieve(failedInvoice.customer);
          if (customer && customer.metadata && customer.metadata.supabaseUserId) {
            const supabaseUserId = customer.metadata.supabaseUserId;

            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_KEY
            );

            // Update status to past_due
            const { error } = await supabase
              .from('user_subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', supabaseUserId);

            if (error) {
              console.error('Error updating subscription to past_due in Supabase:', error);
            } else {
              console.log(`Marked subscription as past_due for user ${supabaseUserId}`);
            }
          }
        } catch (err) {
          console.error('Error processing payment failed event:', err);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.status(200).json({received: true});
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router; 