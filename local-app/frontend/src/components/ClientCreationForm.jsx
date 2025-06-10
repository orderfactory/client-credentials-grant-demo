import { useState } from 'react'

function ClientCreationForm() {
  const [clientName, setClientName] = useState('')
  const [description, setDescription] = useState('')
  const [clientInfo, setClientInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setClientInfo(null)

    try {
      const response = await fetch('/api/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientName, description })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create client')
      }

      setClientInfo(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Create Client Credentials</h2>
      <p>
        Create client credentials for a third-party application to access your protected resources.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="clientName">Client Name:</label>
          <input
            type="text"
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            placeholder="e.g., third-party-app"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional):</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose of this client"
            rows="3"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Client'}
        </button>
      </form>

      {error && (
        <div className="client-info" style={{ color: 'red' }}>
          <p>Error: {error}</p>
        </div>
      )}

      {clientInfo && (
        <div className="client-info">
          <h3>Client Created Successfully!</h3>
          <p>Share these credentials with the third-party application:</p>

          <div>
            <strong>Client ID:</strong>
            <pre>{clientInfo.client.clientId}</pre>
          </div>

          <div>
            <strong>Client Secret:</strong>
            <pre>{clientInfo.client.clientSecret}</pre>
          </div>

          <div>
            <strong>Token URL:</strong>
            <pre>{clientInfo.tokenUrl}</pre>
          </div>

          <p><strong>Note:</strong> Store the client secret securely. It cannot be retrieved later.</p>
        </div>
      )}
    </div>
  )
}

export default ClientCreationForm