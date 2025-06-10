import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for client credentials (in a real app, use a secure database)
let clientCredentials = {
  clientId: process.env.CLIENT_ID || '',
  clientSecret: process.env.CLIENT_SECRET || '',
  tokenUrl: process.env.TOKEN_URL || ''
};

// In-memory storage for the current access token
let accessToken = {
  token: '',
  expiresAt: 0
};

// Function to get a valid access token
async function getAccessToken() {
  // Check if we have a valid token
  const now = Date.now();
  if (accessToken.token && accessToken.expiresAt > now) {
    return accessToken.token;
  }

  // No valid token, get a new one
  if (!clientCredentials.clientId || !clientCredentials.clientSecret || !clientCredentials.tokenUrl) {
    throw new Error('Client credentials not configured');
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientCredentials.clientId);
    params.append('client_secret', clientCredentials.clientSecret);

    const response = await axios.post(clientCredentials.tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = response.data;

    // Store the token with expiration time
    accessToken = {
      token: tokenData.access_token,
      expiresAt: now + (tokenData.expires_in * 1000) - 30000 // Subtract 30 seconds for safety
    };

    return accessToken.token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw new Error('Failed to get access token');
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Third-party API is running' });
});

// Get client credentials
app.get('/api/credentials', (req, res) => {
  res.json({
    clientId: clientCredentials.clientId,
    clientSecret: clientCredentials.clientSecret ? '********' : '', // Don't send the actual secret
    tokenUrl: clientCredentials.tokenUrl,
    configured: !!(clientCredentials.clientId && clientCredentials.clientSecret && clientCredentials.tokenUrl)
  });
});

// Set client credentials
app.post('/api/credentials', (req, res) => {
  const { clientId, clientSecret, tokenUrl } = req.body;

  if (!clientId || !clientSecret || !tokenUrl) {
    return res.status(400).json({ error: 'All credential fields are required' });
  }

  // Update in-memory credentials
  clientCredentials = {
    clientId,
    clientSecret,
    tokenUrl
  };

  // Reset access token
  accessToken = {
    token: '',
    expiresAt: 0
  };

  // Save to .env file (in a real app, use a secure database)
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    envContent = envContent.replace(/CLIENT_ID=.*/, `CLIENT_ID=${clientId}`);
    envContent = envContent.replace(/CLIENT_SECRET=.*/, `CLIENT_SECRET=${clientSecret}`);
    envContent = envContent.replace(/TOKEN_URL=.*/, `TOKEN_URL=${tokenUrl}`);

    fs.writeFileSync(envPath, envContent);

    res.json({ success: true, message: 'Credentials updated successfully' });
  } catch (error) {
    console.error('Error saving credentials to .env:', error);
    // Still return success since in-memory credentials are updated
    res.json({ success: true, message: 'Credentials updated in memory only' });
  }
});

// Test token endpoint
app.get('/api/test-token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({
      success: true,
      message: 'Successfully obtained access token',
      tokenInfo: {
        token: token.substring(0, 10) + '...',
        expiresAt: new Date(accessToken.expiresAt).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Call protected resource endpoint
app.get('/api/call-protected-resource', async (req, res) => {
  try {
    // Get access token
    const token = await getAccessToken();

    // Call the protected resource
    const response = await axios.get(`${process.env.LOCAL_API_URL}/api/protected-resource`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({
      success: true,
      message: 'Successfully called protected resource',
      data: response.data
    });
  } catch (error) {
    console.error('Error calling protected resource:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({
      error: 'Failed to call protected resource',
      details: error.message,
      responseData: error.response ? error.response.data : null
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Third-party API server running at http://${HOST}:${PORT}`);

  // Load credentials from .env if available
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.TOKEN_URL) {
    clientCredentials = {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      tokenUrl: process.env.TOKEN_URL
    };
    console.log('Loaded client credentials from .env file');
  } else {
    console.log('No client credentials found in .env file');
  }
});