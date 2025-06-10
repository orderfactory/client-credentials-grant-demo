import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const initializeKeycloak = async () => {
  try {
    const response = await api.post('/init-keycloak');
    return response.data;
  } catch (error) {
    console.error('Error initializing Keycloak:', error);
    throw error;
  }
};

export const getKeycloakConfig = async () => {
  try {
    const response = await api.get('/keycloak-config');
    return response.data;
  } catch (error) {
    console.error('Error fetching Keycloak config:', error);
    throw error;
  }
};

export const createClient = async (clientData) => {
  try {
    const response = await api.post('/create-client', clientData);
    return response.data;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

export default api;