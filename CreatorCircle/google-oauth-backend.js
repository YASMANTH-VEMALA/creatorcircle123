const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '775288481200-14u6gn5nhjiaa605hc2h820ecqrt02b1.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here';

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    res.status(200).json({ 
      status: 'OK', 
      message: 'Google OAuth backend is running',
      timestamp: new Date().toISOString(),
      client_id: GOOGLE_CLIENT_ID,
      has_secret: !!GOOGLE_CLIENT_SECRET && GOOGLE_CLIENT_SECRET !== 'your_google_client_secret_here'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// OAuth token exchange endpoint
app.post('/auth/google/token', async (req, res) => {
  try {
    console.log('Received token exchange request:', req.body);
    
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      console.error('Missing required parameters:', { code: !!code, redirect_uri: !!redirect_uri });
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['code', 'redirect_uri'],
        received: { code: !!code, redirect_uri: !!redirect_uri }
      });
    }

    if (GOOGLE_CLIENT_SECRET === 'your_google_client_secret_here') {
      console.error('Google Client Secret not configured');
      return res.status(500).json({ 
        error: 'Google Client Secret not configured. Please update your .env file.' 
      });
    }

    console.log('Exchanging code for tokens...');
    
    // Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code'
    });

    const { access_token, id_token, refresh_token } = tokenResponse.data;
    console.log('Token exchange successful');

    // Get user info from Google
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    console.log('User info retrieved:', userInfoResponse.data.email);

    res.json({
      success: true,
      access_token,
      id_token,
      refresh_token,
      user_info: userInfoResponse.data
    });

  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid authorization code or redirect URI',
        details: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: 'Token exchange failed',
      details: error.response?.data || error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  
  console.log(`🚀 Google OAuth backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Token exchange: http://localhost:${PORT}/auth/google/token`);
  console.log(`🔑 Client ID: ${GOOGLE_CLIENT_ID}`);
  console.log(`🔒 Client Secret: ${GOOGLE_CLIENT_SECRET ? 'Configured' : 'NOT CONFIGURED'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app; 