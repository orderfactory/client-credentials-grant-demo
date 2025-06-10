import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import KcAdminClient from 'keycloak-admin';
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

// Keycloak Admin Client setup
const kcAdminClient = new KcAdminClient.default({
  baseUrl: `${process.env.KEYCLOAK_URL}`,
  realmName: 'master'
});

// Initialize Keycloak realm and clients
let realmInitialized = false;

// Function to authenticate with retry
async function authenticateKeycloakAdmin(retries = 10, delayMs = 3000, targetRealm = 'master') {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Always set realmName to 'master' before admin authentication
      kcAdminClient.setConfig({
        realmName: 'master'
      });
      await kcAdminClient.auth({
        username: process.env.KEYCLOAK_ADMIN_USERNAME,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli'
      });

      // If we need to switch to a different realm after authentication
      if (targetRealm !== 'master') {
        kcAdminClient.setConfig({
          realmName: targetRealm
        });
      }

      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Keycloak admin authentication failed (attempt ${attempt}/${retries}): ${error.message}`);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

// Function to initialize Keycloak realm
async function initializeKeycloak() {
  try {
    // Always authenticate with Keycloak admin (with retry)
    await authenticateKeycloakAdmin(10, 3000, 'master');

    if (realmInitialized) {
      // Even if realm is initialized, switch to the target realm and re-authenticate
      await authenticateKeycloakAdmin(10, 3000, process.env.KEYCLOAK_REALM);
      return;
    }

    let realmExists = false;
    // Check if realm exists
    try {
      await kcAdminClient.realms.findOne({ realm: process.env.KEYCLOAK_REALM });
      console.log(`Realm ${process.env.KEYCLOAK_REALM} already exists`);
      realmExists = true;
    } catch (error) {
      // Create realm if it doesn't exist
      await kcAdminClient.realms.create({
        realm: process.env.KEYCLOAK_REALM,
        enabled: true
      });
      console.log(`Created realm: ${process.env.KEYCLOAK_REALM}`);
    }

    // Switch to the new realm and re-authenticate
    await authenticateKeycloakAdmin(10, 3000, process.env.KEYCLOAK_REALM);

    // If realm was pre-configured, we don't need to create the client
    if (!realmExists) {
      // Create local-api client if it doesn't exist
      const existingClients = await kcAdminClient.clients.find({ clientId: process.env.KEYCLOAK_CLIENT_ID });
      if (existingClients && existingClients.length > 0) {
        console.log(`Client ${process.env.KEYCLOAK_CLIENT_ID} already exists`);
      } else {
        await kcAdminClient.clients.create({
          clientId: process.env.KEYCLOAK_CLIENT_ID,
          secret: process.env.KEYCLOAK_CLIENT_SECRET,
          serviceAccountsEnabled: true,
          authorizationServicesEnabled: true,
          directAccessGrantsEnabled: false,
          publicClient: false,
          standardFlowEnabled: false,
          implicitFlowEnabled: false,
          enabled: true
        });
        console.log(`Created client: ${process.env.KEYCLOAK_CLIENT_ID}`);
      }
    } else {
      console.log(`Using pre-configured realm and clients`);
    }

    realmInitialized = true;
    console.log('Keycloak initialization completed');
  } catch (error) {
    console.error('Error initializing Keycloak:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Middleware to validate access token
async function validateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const introspectionUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`;

    const params = new URLSearchParams();
    params.append('token', token);
    params.append('client_id', process.env.KEYCLOAK_CLIENT_ID);
    params.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);

    const response = await axios.post(introspectionUrl, params);

    if (!response.data.active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = response.data;
    next();
  } catch (error) {
    console.error('Token validation error:', error.message);
    return res.status(500).json({ error: 'Failed to validate token' });
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Local API is running' });
});

// Protected resource endpoint
app.get('/api/protected-resource', validateToken, (req, res) => {
  res.json({
    message: 'This is a protected resource',
    data: {
      timestamp: new Date().toISOString(),
      resource: process.env.API_RESOURCE_NAME,
      clientId: req.user.client_id || req.user.azp
    }
  });
});

// Create client credentials endpoint
app.post('/api/create-client', async (req, res) => {
  try {
    const { clientName, description } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    try {
      await initializeKeycloak();
    } catch (authError) {
      console.error('Authentication error during client creation:', authError.message);
      return res.status(500).json({ error: 'Failed to authenticate with Keycloak', details: authError.message });
    }

    // initializeKeycloak already switches to the correct realm and authenticates
    // No need to manually set the realm again

    // Check if client already exists
    try {
      const existingClient = await kcAdminClient.clients.find({ clientId: clientName });
      if (existingClient && existingClient.length > 0) {
        return res.status(409).json({ error: 'Client already exists' });
      }
    } catch (error) {
      console.error('Error checking client existence:', error.message);
      // If this is an authentication error, try to re-authenticate and try again
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        try {
          await authenticateKeycloakAdmin(3, 1000, process.env.KEYCLOAK_REALM);
          const retryExistingClient = await kcAdminClient.clients.find({ clientId: clientName });
          if (retryExistingClient && retryExistingClient.length > 0) {
            return res.status(409).json({ error: 'Client already exists' });
          }
        } catch (retryError) {
          console.error('Error after retry for client existence check:', retryError.message);
          return res.status(500).json({ error: 'Failed to check client existence after retry', details: retryError.message });
        }
      }
    }

    // Define clientData before using it
    const clientData = {
      clientId: clientName,
      description: description || `Client for ${clientName}`,
      serviceAccountsEnabled: true,
      authorizationServicesEnabled: false,
      directAccessGrantsEnabled: false,
      publicClient: false,
      standardFlowEnabled: false,
      implicitFlowEnabled: false,
      enabled: true
    };

    // Create new client with retry for authentication errors
    try {
      await kcAdminClient.clients.create(clientData);
    } catch (createError) {
      console.error('Error creating client:', createError.message);
      // If this is an authentication error, try to re-authenticate and try again
      if (createError.message.includes('401') || createError.message.includes('Unauthorized')) {
        console.log('Authentication error detected during client creation, retrying...');
        try {
          await authenticateKeycloakAdmin(3, 1000, process.env.KEYCLOAK_REALM);
          await kcAdminClient.clients.create(clientData);
          console.log('Client creation successful after retry');
        } catch (retryError) {
          console.error('Error after retry for client creation:', retryError.message);
          throw new Error(`Failed to create client after retry: ${retryError.message}`);
        }
      } else {
        // If it's not an authentication error, rethrow
        throw createError;
      }
    }

    // Wait briefly to allow Keycloak to index the new client
    await new Promise(res => setTimeout(res, 1000));

    // Fetch the client to get its ID
    const clients = await kcAdminClient.clients.find({ clientId: clientName });
    if (!clients || clients.length === 0) {
      throw new Error('Could not find client after creation');
    }
    const client = clients[0];

    // Generate client secret with retry for authentication errors
    let clientSecret;
    try {
      clientSecret = await kcAdminClient.clients.generateNewClientSecret({
        id: client.id
      });
    } catch (secretError) {
      console.error('Error generating client secret:', secretError.message);
      // If this is an authentication error, try to re-authenticate and try again
      if (secretError.message.includes('401') || secretError.message.includes('Unauthorized')) {
        console.log('Authentication error detected during secret generation, retrying...');
        try {
          await authenticateKeycloakAdmin(3, 1000, process.env.KEYCLOAK_REALM);
          clientSecret = await kcAdminClient.clients.generateNewClientSecret({
            id: client.id
          });
          console.log('Secret generation successful after retry');
        } catch (retryError) {
          console.error('Error after retry for secret generation:', retryError.message);
          throw new Error(`Failed to generate client secret after retry: ${retryError.message}`);
        }
      } else {
        // If it's not an authentication error, rethrow
        throw secretError;
      }
    }

    // Get the generated secret with retry for authentication errors
    let secretInfo;
    try {
      secretInfo = await kcAdminClient.clients.getClientSecret({
        id: client.id
      });
    } catch (getSecretError) {
      console.error('Error getting client secret:', getSecretError.message);
      // If this is an authentication error, try to re-authenticate and try again
      if (getSecretError.message.includes('401') || getSecretError.message.includes('Unauthorized')) {
        console.log('Authentication error detected during get secret, retrying...');
        try {
          await authenticateKeycloakAdmin(3, 1000, process.env.KEYCLOAK_REALM);
          secretInfo = await kcAdminClient.clients.getClientSecret({
            id: client.id
          });
          console.log('Get secret successful after retry');
        } catch (retryError) {
          console.error('Error after retry for get secret:', retryError.message);
          throw new Error(`Failed to get client secret after retry: ${retryError.message}`);
        }
      } else {
        // If it's not an authentication error, rethrow
        throw getSecretError;
      }
    }

    // Add service account roles to access protected resources
    const serviceAccountUser = client;
    if (serviceAccountUser) {
      // Get service account user
      const serviceAccountUserId = (await kcAdminClient.clients.getServiceAccountUser({
        id: client.id
      })).id;

      // Get client roles for the resource server (local-api)
      const localApiClients = await kcAdminClient.clients.find({
        clientId: process.env.KEYCLOAK_CLIENT_ID
      });

      const localApiClient = localApiClients && localApiClients.length > 0 ? localApiClients[0] : null;
      if (localApiClient) {
        // Check if the role already exists before creating it
        try {
          // Get all roles for the client
          const roles = await kcAdminClient.clients.listRoles({
            id: localApiClient.id
          });

          // Check if the role we need already exists
          const roleExists = roles.some(role => role.name === 'access-protected-resource');

          if (roleExists) {
            console.log('Role access-protected-resource already exists');
          } else {
            console.log('Creating role access-protected-resource');
            try {
              await kcAdminClient.clients.createRole({
                id: localApiClient.id,
                name: 'access-protected-resource',
                description: 'Role for accessing protected resources'
              });
            } catch (createError) {
              console.error('Error creating role:', createError.message);
              if (createError.response) {
                console.error('Response data:', createError.response.data);
              }
              // If we can't create the role, we'll continue and try to use it anyway
              // It might already exist but we couldn't retrieve it for some reason
            }
          }
        } catch (error) {
          console.error('Error checking if role exists:', error.message);
          if (error.response) {
            console.error('Response data:', error.response.data);
          }
        }

        // Assign the role to the service account
        // Get all roles and find the one we need
        const roles = await kcAdminClient.clients.listRoles({
          id: localApiClient.id
        });
        const role = roles.find(r => r.name === 'access-protected-resource');

        if (!role) {
          console.error('Role access-protected-resource not found, cannot assign to service account');
          // Continue without assigning the role
        } else {
          await kcAdminClient.users.addClientRoleMappings({
            id: serviceAccountUserId,
            clientUniqueId: localApiClient.id,
            roles: [
              {
                id: role.id,
                name: role.name
              }
            ]
          });
        }
      }
    }

    res.json({
      success: true,
      client: {
        id: client.id,
        clientId: clientName,
        clientSecret: secretInfo.value
      },
      tokenUrl: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`
    });
  } catch (error) {
    console.error('Error creating client:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to create client', details: error.message });
  }
});

// Initialize Keycloak endpoint
app.post('/api/init-keycloak', async (req, res) => {
  try {
    await initializeKeycloak();
    res.json({ success: true, message: 'Keycloak initialized successfully' });
  } catch (error) {
    console.error('Error initializing Keycloak:', error.message);
    res.status(500).json({ error: 'Failed to initialize Keycloak', details: error.message });
  }
});

// Get Keycloak configuration endpoint
app.get('/api/keycloak-config', (req, res) => {
  res.json({
    realm: process.env.KEYCLOAK_REALM,
    url: process.env.KEYCLOAK_URL,
    tokenUrl: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, async () => {
  console.log(`Local API server running at http://${HOST}:${PORT}`);

  // Try to initialize Keycloak on startup
  try {
    await initializeKeycloak();
  } catch (error) {
    console.error('Failed to initialize Keycloak on startup. Will retry when needed.');
  }
});
