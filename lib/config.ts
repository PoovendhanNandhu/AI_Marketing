// Configuration utility for API endpoints and environment variables

export const config = {
  // Backend API URL - automatically detects environment
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 
          (process.env.NODE_ENV === 'production' 
            ? 'https://ai-marketing-xvf3.onrender.com'
            : 'http://localhost:3001'),
  
  // Supabase configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// API endpoint helpers
export const apiEndpoints = {
  // Article endpoints
  articles: {
    chat: `${config.apiUrl}/api/articles/chat`,
  },
  
  // Chat assistant endpoints
  chat: `${config.apiUrl}/api/chat`,
  
  // Contact endpoints
  contact: {
    submit: `${config.apiUrl}/api/contact/submit`,
  },
  
  // Stripe endpoints
  stripe: {
    plans: `${config.apiUrl}/api/stripe/plans`,
    createCheckout: `${config.apiUrl}/api/stripe/create-checkout-session`,
    createPortal: `${config.apiUrl}/api/stripe/create-portal-session`,
    cancelSubscription: `${config.apiUrl}/api/stripe/cancel-subscription`,
    customer: (customerId: string) => `${config.apiUrl}/api/stripe/customer/${customerId}`,
  },
  
  // Image generation endpoints
  images: {
    models: `${config.apiUrl}/api/images/models`,
    generate: `${config.apiUrl}/api/images/generate`,
    usage: (userId: string) => `${config.apiUrl}/api/images/usage/${userId}`,
  },
};

export default config; 