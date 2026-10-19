import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router'
import ClientCreationForm from './components/ClientCreationForm'
import Home from './components/Home'
import './App.css'

function App() {
  const [keycloakInitialized, setKeycloakInitialized] = useState(false)
  const [keycloakError, setKeycloakError] = useState(null)

  useEffect(() => {
    // Check if Keycloak is initialized on component mount
    const initializeKeycloak = async () => {
      try {
        const configResponse = await fetch('/api/keycloak-config')
        if (!configResponse.ok) {
          throw new Error(`Local API is not available (HTTP ${configResponse.status})`)
        }
        console.log('Keycloak config:', await configResponse.json())

        // Initialize Keycloak if needed
        const response = await fetch('/api/init-keycloak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json().catch(() => ({}))
        console.log('Keycloak initialization:', data)

        if (!response.ok) {
          throw new Error(data.details || `HTTP ${response.status}`)
        }
        setKeycloakInitialized(true)
      } catch (error) {
        console.error('Error initializing Keycloak:', error)
        setKeycloakError(error.message)
      }
    }

    initializeKeycloak()
  }, [])

  return (
    <div className="container">
      <header>
        <h1>Local Application</h1>
        <p>Client Credentials Grant Demo</p>
        <nav>
          <Link to="/">Home</Link> | <Link to="/create-client">Create Client</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-client" element={<ClientCreationForm />} />
        </Routes>
      </main>

      <footer>
        <p>
          {keycloakInitialized
            ? '✅ Keycloak is initialized and ready'
            : keycloakError
              ? `❌ Keycloak initialization failed: ${keycloakError}`
              : '⏳ Initializing Keycloak...'}
        </p>
      </footer>
    </div>
  )
}

export default App