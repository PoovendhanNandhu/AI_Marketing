# Email Configuration for Contact Form

## Setup Instructions

To enable the contact form to send emails, you need to set up the following environment variables in your backend `.env` file:

```
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
RECIPIENT_EMAIL=where_to_receive_contacts@example.com
```

## Gmail Configuration Steps

1. If using Gmail (recommended for simplicity):
   
   a. Make sure you have 2-Factor Authentication enabled on your Google account
   
   b. Generate an "App Password" at https://myaccount.google.com/apppasswords
   
   c. Use this app password in your .env file (not your regular Gmail password)

2. For other email providers:
   
   a. Update the `service` parameter in `contactRoutes.js` to match your provider
   
   b. Or use SMTP configuration with host, port, etc.

## Testing the Email Functionality

After setting up your environment variables:

1. Restart the backend server
2. Fill out the contact form on the frontend
3. Check your recipient email to confirm you're receiving form submissions

## Security Notes

- Never commit your `.env` file with real credentials to version control
- Consider using environment variables in production deployment
- Follow email provider best practices for sending transactional emails
