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

- [Node.js](https://nodejs.org/) 24 LTS or newer (see `.nvmrc`; npm is included with Node.js)
- [Docker](https://www.docker.com/) with Docker Compose v2, for example Docker Desktop or Rancher Desktop

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/orderfactory/client-credentials-grant-demo.git
   cd client-credentials-grant-demo
   ```

2. Install the dependencies. The four apps are [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces), so a single install from the repository root covers all of them:
   ```
   npm install
   ```

3. Start the demo:
   ```
   npm start
   ```

   This will:
   - Start Keycloak in a Docker container, import the demo realm, and wait until Keycloak's health check reports it ready
   - Start the Local App API and Frontend
   - Start the Third-Party App API and Frontend

   The output of all four apps appears in the same terminal, with each line prefixed by the app's name.

   On Windows, you can use the PowerShell script instead. It checks the prerequisites, installs the dependencies, and runs the same steps:
   ```
   .\start-demo.ps1
   ```

4. Once started, the following services will be available:

   | Service                | URL                      |
   |------------------------|--------------------------|
   | Keycloak               | http://localhost:8080    |
   | Local API              | http://localhost:3001    |
   | Local Frontend         | http://localhost:5173    |
   | Third-Party API        | http://localhost:3002    |
   | Third-Party Frontend   | http://localhost:5174    |

   These ports are fixed. If one is already in use, the affected app reports an error and the other apps are stopped.

5. Keycloak Admin Credentials:
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

The Third-Party API saves the credentials in `third-party-app/api/.env` so they survive a restart. Revert that file (`git checkout third-party-app/api/.env`) instead of committing the generated secret.

### 4. Explore Keycloak Configuration

Access the Keycloak Admin Console at http://localhost:8080 using the admin credentials to explore:
- The configured realm (`client-credentials-demo`)
- Client configurations
- Role mappings
- Service accounts

## Technologies Used

### Backend
- **Node.js**: Runtime for the APIs, using its built-in `fetch` for HTTP requests and `--env-file` for loading `.env` files
- **Express 5**: Web framework for the APIs
- **Keycloak 26**: OAuth 2.0 authorization server
- **Keycloak Admin Client** (`@keycloak/keycloak-admin-client`): For programmatic client management
- **CORS**: Cross-Origin Resource Sharing middleware

### Frontend
- **React 19**: UI library
- **React Router 8**: For navigation
- **Vite 8**: Build tool and development server

### Tooling and Infrastructure
- **npm workspaces**: One install and one lockfile for all four apps
- **concurrently**: Runs the APIs and frontends side by side
- **Oxlint**: Linting for all apps
- **Docker Compose**: Runs the Keycloak container, with a health check so startup waits until Keycloak is ready
- **PowerShell**: Optional startup script for Windows

## Project Structure

```
client-credentials-grant-demo/
├── keycloak/                  # Keycloak configuration
│   ├── compose.yaml           # Docker Compose configuration for Keycloak
│   └── import/                # Realm import files
│       └── client-credentials-demo-realm.json
│
├── local-app/                 # Local application (resource server)
│   ├── api/                   # Backend API
│   │   ├── .env               # Configuration (Keycloak URL, realm, client)
│   │   ├── server.js          # Express server with protected resources
│   │   └── package.json       # Dependencies
│   └── frontend/              # Frontend application
│       ├── public/            # Static assets
│       ├── src/               # React source code
│       └── package.json       # Dependencies
│
├── third-party-app/           # Third-party application (client)
│   ├── api/                   # Backend API
│   │   ├── .env               # Configuration and saved client credentials
│   │   ├── server.js          # Express server
│   │   └── package.json       # Dependencies
│   └── frontend/              # Frontend application
│       ├── public/            # Static assets
│       ├── src/               # React source code
│       └── package.json       # Dependencies
│
├── package.json               # Workspace definition and scripts for running the demo
├── package-lock.json          # Lockfile for all workspaces
├── .nvmrc                     # Node.js version
├── .oxlintrc.json             # Lint configuration
├── start-demo.ps1             # PowerShell script to start all components
└── README.md                  # This documentation
```

## Development

Run these scripts from the repository root:

| Command                    | Description                                                      |
|----------------------------|------------------------------------------------------------------|
| `npm start`                | Start Keycloak, then all four apps                               |
| `npm stop`                 | Stop and remove the Keycloak container                           |
| `npm run dev`              | Start the four apps only (Keycloak must already be running)      |
| `npm run keycloak:up`      | Start Keycloak only and wait until it is ready                   |
| `npm run keycloak:down`    | Stop and remove the Keycloak container (same as `npm stop`)      |
| `npm run lint`             | Lint all apps with Oxlint                                        |
| `npm run build`            | Build both frontends for production                              |

To run a single app, target its workspace, for example `npm start -w local-api` or `npm run dev -w third-party-frontend`.

## Stopping the Demo

Press `Ctrl+C` to stop the apps, then run `npm stop` to stop and remove the Keycloak container. Keycloak does not persist data between runs: the realm is imported again on the next start, and clients created during the demo are discarded.

When you started the demo with `start-demo.ps1`, pressing `Ctrl+C` stops everything, including the Keycloak container.

## Additional Resources

- [OAuth 2.0 Client Credentials Grant](https://oauth.net/2/grant-types/client-credentials/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Vite Documentation](https://vite.dev/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
