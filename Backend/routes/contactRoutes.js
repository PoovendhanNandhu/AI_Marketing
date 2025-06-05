const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Replace with your SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Contact form submission endpoint
router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Please provide name, email, and message' });
    }

    // Email content
    const mailOptions = {
      from: `"AI Marketing Contact Form" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
      to: process.env.RECIPIENT_EMAIL || 'your-email@gmail.com', // Where you want to receive the messages
      subject: `Contact Form: ${subject || 'New message from website'}`,
      text: `
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
      `,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
        <h4>Message:</h4>
        <p>${message}</p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true, 
      message: 'Your message has been sent successfully. We will get back to you soon!' 
    });
  } catch (error) {
    console.error('Error sending contact form email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send your message. Please try again later.' 
    });
  }
});

module.exports = router; 