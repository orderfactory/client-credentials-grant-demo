import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CredentialsForm({ credentials, setCredentials }) {
  const [clientId, setClientId] = useState(credentials.clientId || '')
  const [clientSecret, setClientSecret] = useState('')
  const [tokenUrl, setTokenUrl] = useState(credentials.tokenUrl || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientId, clientSecret, tokenUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save credentials')
      }

      // Update credentials in parent component
      setCredentials({
        clientId,
        clientSecret: '********', // Don't store actual secret in state
        tokenUrl,
        configured: true
      })

      setSuccess(true)

      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Configure Client Credentials</h2>
      <p>
        Enter the client credentials provided by the local application.
        These credentials will be used to obtain access tokens for calling protected resources.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="clientId">Client ID:</label>
          <input
            type="text"
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            placeholder="Enter your client ID"
          />
        </div>

        <div className="form-group">
          <label htmlFor="clientSecret">Client Secret:</label>
          <input
            type="password"
            id="clientSecret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            required
            placeholder="Enter your client secret"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tokenUrl">Token URL:</label>
          <input
            type="text"
            id="tokenUrl"
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            required
            placeholder="Enter the token URL"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Credentials'}
        </button>
      </form>

      {error && (
        <div className="response-data" style={{ color: 'red', marginTop: '1rem' }}>
          <p>Error: {error}</p>
        </div>
      )}

      {success && (
        <div className="response-data" style={{ color: 'green', marginTop: '1rem' }}>
          <p>Credentials saved successfully! Redirecting to home...</p>
        </div>
      )}
    </div>
  )
}

export default CredentialsForm