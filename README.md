# OAuth 2.0 Client Credentials Grant Demo

A comprehensive demonstration of the OAuth 2.0 Client Credentials Grant flow using Keycloak as the authorization server. This project showcases how to implement machine-to-machine authentication and authorization in a microservices architecture.

## Project Overview

This demo consists of three main components:

1. **Keycloak Server**: Acts as the OAuth 2.0 authorization server
2. **Local Application**: A service that provides protected resources and client management
3. **Third-Party Application**: A client application that demonstrates how to obtain and use access tokens

The demo illustrates the complete OAuth 2.0 Client Credentials Grant flow, including:
- Setting up Keycloak as an authorization server
- Creating OAuth clients programmatically
- Obtaining access tokens using client credentials
- Validating tokens and protecting resources
- Accessing protected resources with valid tokens

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Third-Party    │     │    Keycloak     │     │     Local       │
│  Application    │     │    Server       │     │   Application   │
│                 │     │                 │     │                 │
│  - Frontend     │     │  - Auth Server  │     │  - Frontend     │
│    (React)      │     │  - User Mgmt    │     │    (React)      │
│  - API          │◄────┼─►- Token Issuer │◄────┼─►- Protected API│
│    (Express)    │     │  - Client Mgmt  │     │    (Express)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Flow Diagram

1. Third-Party requests client credentials from the Local App user
2. Local App creates a new client in Keycloak
3. Third-Party App uses client credentials to request an access token from Keycloak
4. Keycloak validates credentials and issues an access token
5. Third-Party App uses the access token to access protected resources in Local App
6. Local App validates the token with Keycloak and serves the protected resource

## Prerequisites

- [Node.js](https://nodejs.org/) (v22.16.0 recommended)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/)

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/orderfactory/client-credentials-grant-demo.git
   cd client-credentials-grant-demo
   ```

2. Start the demo using the provided PowerShell script:
   ```
   .\start-demo.ps1
   ```

   This script will:
   - Start Keycloak in a Docker container
   - Initialize the Local App API and Frontend
   - Initialize the Third-Party App API and Frontend
   - Wait for all services to be ready

3. Once started, the following services will be available:

   | Service                | URL                      |
   |------------------------|--------------------------|
   | Keycloak               | http://localhost:8080    |
   | Local API              | http://localhost:3001    |
   | Local Frontend         | http://localhost:5173    |
   | Third-Party API        | http://localhost:3002    |
   | Third-Party Frontend   | http://localhost:5174    |

4. Keycloak Admin Credentials:
   - Username: `admin`
   - Password: `admin`

## Usage Guide

### 1. Access the Local Application

Open your browser and navigate to http://localhost:5173

The Local Application allows you to:
- View the status of the protected resources
- Create new OAuth clients for third-party applications

### 2. Access the Third-Party Application

Open your browser and navigate to http://localhost:5174

The Third-Party Application allows you to:
- Enter client credentials (client ID and secret)
- Obtain an access token from Keycloak
- Access protected resources from the Local Application

### 3. Explore the Client Credentials Flow

1. In the Local Application, create a new client
2. Copy the generated client ID and secret
3. In the Third-Party Application, paste the client credentials
4. Request an access token
5. Use the token to access the protected resource

### 4. Explore Keycloak Configuration

Access the Keycloak Admin Console at http://localhost:8080 using the admin credentials to explore:
- The configured realm (`client-credentials-demo`)
- Client configurations
- Role mappings
- Service accounts

## Technologies Used

### Backend
- **Express.js**: Web framework for the APIs
- **Keycloak**: OAuth 2.0 authorization server
- **Keycloak Admin Client**: For programmatic client management
- **Axios**: HTTP client for API requests
- **CORS**: Cross-Origin Resource Sharing middleware
- **dotenv**: Environment variable management

### Frontend
- **React**: UI library
- **Vite**: Build tool and development server
- **Axios**: HTTP client for API requests
- **React Router**: For navigation

### Infrastructure
- **Docker**: For containerizing Keycloak
- **Docker Compose**: For managing the Keycloak container
- **PowerShell**: For orchestrating the demo startup

## Project Structure

```
client-credentials-grant-demo/
├── keycloak/                  # Keycloak configuration
│   ├── docker-compose.yml     # Docker configuration for Keycloak
│   └── import/                # Realm import files
│       └── client-credentials-demo-realm.json
│
├── local-app/                 # Local application (resource server)
│   ├── api/                   # Backend API
│   │   ├── server.js          # Express server with protected resources
│   │   └── package.json       # Dependencies
│   └── frontend/              # Frontend application
│       ├── src/               # React source code
│       └── package.json       # Dependencies
│
├── third-party-app/           # Third-party application (client)
│   ├── api/                   # Backend API
│   │   ├── server.js          # Express server
│   │   └── package.json       # Dependencies
│   └── frontend/              # Frontend application
│       ├── src/               # React source code
│       └── package.json       # Dependencies
│
├── start-demo.ps1             # PowerShell script to start all components
└── README.md                  # This documentation
```

## Stopping the Demo

To stop all services, press `Ctrl+C` in the PowerShell window running the `start-demo.ps1` script. The script will gracefully shut down all components, including the Docker containers.

## Additional Resources

- [OAuth 2.0 Client Credentials Grant](https://oauth.net/2/grant-types/client-credentials/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)

## License

This project is licensed under the MIT License - see the LICENSE file for details.