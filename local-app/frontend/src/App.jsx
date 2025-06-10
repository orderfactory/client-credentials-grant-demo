import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ClientCreationForm from './components/ClientCreationForm'
import Home from './components/Home'
import './App.css'

function App() {
  const [keycloakInitialized, setKeycloakInitialized] = useState(false)

  useEffect(() => {
    // Check if Keycloak is initialized on component mount
    fetch('/api/keycloak-config')
      .then(response => response.json())
      .then(data => {
        console.log('Keycloak config:', data)
        // Initialize Keycloak if needed
        fetch('/api/init-keycloak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(response => response.json())
          .then(data => {
            console.log('Keycloak initialization:', data)
            setKeycloakInitialized(true)
          })
          .catch(error => {
            console.error('Error initializing Keycloak:', error)
          })
      })
      .catch(error => {
        console.error('Error fetching Keycloak config:', error)
      })
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
            : '⏳ Initializing Keycloak...'}
        </p>
      </footer>
    </div>
  )
}

export default App