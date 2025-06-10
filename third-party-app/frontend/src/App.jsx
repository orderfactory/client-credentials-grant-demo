import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './components/Home'
import CredentialsForm from './components/CredentialsForm'
import CallProtectedResource from './components/CallProtectedResource'
import './App.css'

function App() {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    tokenUrl: '',
    configured: false
  })

  useEffect(() => {
    // Check if credentials are configured on component mount
    fetch('/api/credentials')
      .then(response => response.json())
      .then(data => {
        console.log('Credentials status:', data)
        setCredentials(data)
      })
      .catch(error => {
        console.error('Error fetching credentials:', error)
      })
  }, [])

  return (
    <div className="container">
      <header>
        <h1>Third-Party Application</h1>
        <p>Client Credentials Grant Demo</p>
        <nav>
          <Link to="/">Home</Link> | <Link to="/credentials">Configure Credentials</Link> | <Link to="/call-resource">Call Protected Resource</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home credentials={credentials} />} />
          <Route path="/credentials" element={<CredentialsForm credentials={credentials} setCredentials={setCredentials} />} />
          <Route path="/call-resource" element={<CallProtectedResource credentials={credentials} />} />
        </Routes>
      </main>

      <footer>
        <p>
          {credentials.configured
            ? '✅ Client credentials are configured'
            : '⚠️ Client credentials are not configured'}
        </p>
      </footer>
    </div>
  )
}

export default App