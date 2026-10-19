import express from 'express';
import cors from 'cors';
import KcAdminClient from '@keycloak/keycloak-admin-client';

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Keycloak Admin Client setup. The client stays bound to the master realm, where the admin
// user lives, so it can refresh its own token; demo realm operations pass `realm` explicitly.
const kcAdminClient = new KcAdminClient({
  baseUrl: process.env.KEYCLOAK_URL,
  realmName: 'master'
});
const realm = process.env.KEYCLOAK_REALM;

// Initialize Keycloak realm and clients
let realmInitialized = false;

// Function to authenticate with retry
async function authenticateKeycloakAdmin(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await kcAdminClient.auth({
        username: process.env.KEYCLOAK_ADMIN_USERNAME,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli'
      });
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
    await authenticateKeycloakAdmin();

    if (realmInitialized) {
      return;
    }

    // Check if realm exists (findOne resolves to null when it doesn't)
    const realmExists = Boolean(await kcAdminClient.realms.findOne({ realm }));
    if (realmExists) {
      console.log(`Realm ${realm} already exists`);
    } else {
      // Create realm if it doesn't exist
      await kcAdminClient.realms.create({
        realm,
        enabled: true
      });
      console.log(`Created realm: ${realm}`);
    }

    // If realm was pre-configured, we don't need to create the client
    if (!realmExists) {
      // Create local-api client if it doesn't exist
      const existingClients = await kcAdminClient.clients.find({ realm, clientId: process.env.KEYCLOAK_CLIENT_ID });
      if (existingClients && existingClients.length > 0) {
        console.log(`Client ${process.env.KEYCLOAK_CLIENT_ID} already exists`);
      } else {
        await kcAdminClient.clients.create({
          realm,
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
    if (error.responseData) {
      console.error('Response data:', error.responseData);
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

    const response = await fetch(introspectionUrl, { method: 'POST', body: params });
    if (!response.ok) {
      throw new Error(`Token introspection failed with status code ${response.status}`);
    }
    const tokenInfo = await response.json();

    if (!tokenInfo.active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = tokenInfo;
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
    const { clientName, description } = req.body ?? {};

    if (!clientName) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    // Authenticate with a fresh admin token (and make sure the realm exists). The admin
    // client refreshes the token itself if it nears expiry, so calls below need no retries.
    await initializeKeycloak();

    // Check if client already exists
    const existingClients = await kcAdminClient.clients.find({ realm, clientId: clientName });
    if (existingClients && existingClients.length > 0) {
      return res.status(409).json({ error: 'Client already exists' });
    }

    // Create new client
    await kcAdminClient.clients.create({
      realm,
      clientId: clientName,
      description: description || `Client for ${clientName}`,
      serviceAccountsEnabled: true,
      authorizationServicesEnabled: false,
      directAccessGrantsEnabled: false,
      publicClient: false,
      standardFlowEnabled: false,
      implicitFlowEnabled: false,
      enabled: true
    });

    // Wait briefly to allow Keycloak to index the new client
    await new Promise(res => setTimeout(res, 1000));

    // Fetch the client to get its ID
    const clients = await kcAdminClient.clients.find({ realm, clientId: clientName });
    if (!clients || clients.length === 0) {
      throw new Error('Could not find client after creation');
    }
    const client = clients[0];

    // Generate client secret
    await kcAdminClient.clients.generateNewClientSecret({
      realm,
      id: client.id
    });

    // Get the generated secret
    const secretInfo = await kcAdminClient.clients.getClientSecret({
      realm,
      id: client.id
    });

    // Add service account roles to access protected resources
    // Get service account user
    const serviceAccountUser = await kcAdminClient.clients.getServiceAccountUser({
      realm,
      id: client.id
    });

    // Get client roles for the resource server (local-api)
    const localApiClients = await kcAdminClient.clients.find({
      realm,
      clientId: process.env.KEYCLOAK_CLIENT_ID
    });

    const localApiClient = localApiClients && localApiClients.length > 0 ? localApiClients[0] : null;
    if (localApiClient) {
      // Check if the role already exists before creating it
      try {
        // Get all roles for the client
        const roles = await kcAdminClient.clients.listRoles({
          realm,
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
              realm,
              id: localApiClient.id,
              name: 'access-protected-resource',
              description: 'Role for accessing protected resources'
            });
          } catch (createError) {
            console.error('Error creating role:', createError.message);
            if (createError.responseData) {
              console.error('Response data:', createError.responseData);
            }
            // If we can't create the role, we'll continue and try to use it anyway
            // It might already exist but we couldn't retrieve it for some reason
          }
        }
      } catch (error) {
        console.error('Error checking if role exists:', error.message);
        if (error.responseData) {
          console.error('Response data:', error.responseData);
        }
      }

      // Assign the role to the service account
      // Get all roles and find the one we need
      const roles = await kcAdminClient.clients.listRoles({
        realm,
        id: localApiClient.id
      });
      const role = roles.find(r => r.name === 'access-protected-resource');

      if (!role) {
        console.error('Role access-protected-resource not found, cannot assign to service account');
        // Continue without assigning the role
      } else {
        await kcAdminClient.users.addClientRoleMappings({
          realm,
          id: serviceAccountUser.id,
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
    if (error.responseData) {
      console.error('Response data:', error.responseData);
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

app.listen(PORT, HOST, async (error) => {
  // Express 5 reports listen errors (e.g. port already in use) here instead of crashing
  if (error) throw error;

  console.log(`Local API server running at http://${HOST}:${PORT}`);

  // Try to initialize Keycloak on startup
  try {
    await initializeKeycloak();
  } catch {
    console.error('Failed to initialize Keycloak on startup. Will retry when needed.');
  }
});
