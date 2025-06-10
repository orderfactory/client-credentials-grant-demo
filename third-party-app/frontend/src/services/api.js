import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getCredentials = async () => {
  try {
    const response = await api.get('/credentials');
    return response.data;
  } catch (error) {
    console.error('Error fetching credentials:', error);
    throw error;
  }
};

export const setCredentials = async (credentials) => {
  try {
    const response = await api.post('/credentials', credentials);
    return response.data;
  } catch (error) {
    console.error('Error setting credentials:', error);
    throw error;
  }
};

export const testToken = async () => {
  try {
    const response = await api.get('/test-token');
    return response.data;
  } catch (error) {
    console.error('Error testing token:', error);
    throw error;
  }
};

export const callProtectedResource = async () => {
  try {
    const response = await api.get('/call-protected-resource');
    return response.data;
  } catch (error) {
    console.error('Error calling protected resource:', error);
    throw error;
  }
};

export default api;