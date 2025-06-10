import { Link } from 'react-router-dom'

function Home({ credentials }) {
  return (
    <div className="card">
      <h2>Welcome to the Third-Party Application</h2>
      <p>
        This application demonstrates how to use the OAuth 2.0 Client Credentials Grant flow
        to access protected resources from another application.
      </p>

      {!credentials.configured ? (
        <div>
          <p>
            To get started, you need to configure your client credentials.
            These credentials should be provided by the local application.
          </p>
          <Link to="/credentials">
            <button>Configure Credentials</button>
          </Link>
        </div>
      ) : (
        <div>
          <p>
            Your client credentials are configured. You can now call the protected resource.
          </p>
          <Link to="/call-resource">
            <button>Call Protected Resource</button>
          </Link>
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'left' }}>
        <h3>How it works:</h3>
        <ol>
          <li>Configure the client credentials provided by the local application</li>
          <li>The application uses these credentials to obtain an access token from the authorization server</li>
          <li>The access token is used to access the protected resource on the local application</li>
        </ol>
      </div>
    </div>
  )
}

export default Home