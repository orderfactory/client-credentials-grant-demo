import { useState } from 'react'
import { Link } from 'react-router-dom'

function CallProtectedResource({ credentials }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tokenResponse, setTokenResponse] = useState(null)
  const [resourceResponse, setResourceResponse] = useState(null)

  const testToken = async () => {
    setLoading(true)
    setError(null)
    setTokenResponse(null)
    setResourceResponse(null)

    try {
      const response = await fetch('/api/test-token')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get token')
      }

      setTokenResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const callProtectedResource = async () => {
    setLoading(true)
    setError(null)
    setResourceResponse(null)

    try {
      const response = await fetch('/api/call-protected-resource')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to call protected resource')
      }

      setResourceResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!credentials.configured) {
    return (
      <div className="card">
        <h2>Call Protected Resource</h2>
        <p>
          You need to configure your client credentials before you can call the protected resource.
        </p>
        <Link to="/credentials">
          <button>Configure Credentials</button>
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Call Protected Resource</h2>
      <p>
        Test your client credentials by obtaining an access token and calling the protected resource.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Step 1: Test Token</h3>
        <p>First, test that you can obtain an access token using your client credentials.</p>
        <button onClick={testToken} disabled={loading}>
          {loading && !tokenResponse ? 'Getting Token...' : 'Get Access Token'}
        </button>

        {tokenResponse && (
          <div className="response-data">
            <h4>Token Response:</h4>
            <p>Status: {tokenResponse.success ? 'Success' : 'Failed'}</p>
            <p>Message: {tokenResponse.message}</p>
            {tokenResponse.tokenInfo && (
              <>
                <p>Token: {tokenResponse.tokenInfo.token}</p>
                <p>Expires At: {tokenResponse.tokenInfo.expiresAt}</p>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Step 2: Call Protected Resource</h3>
        <p>Now, use the access token to call the protected resource.</p>
        <button
          onClick={callProtectedResource}
          disabled={loading || !tokenResponse}
        >
          {loading && tokenResponse ? 'Calling Resource...' : 'Call Protected Resource'}
        </button>

        {resourceResponse && (
          <div className="response-data">
            <h4>Resource Response:</h4>
            <p>Status: {resourceResponse.success ? 'Success' : 'Failed'}</p>
            <p>Message: {resourceResponse.message}</p>
            {resourceResponse.data && (
              <div>
                <h5>Data from Protected Resource:</h5>
                <pre>{JSON.stringify(resourceResponse.data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="response-data" style={{ color: 'red', marginTop: '1rem' }}>
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  )
}

export default CallProtectedResource