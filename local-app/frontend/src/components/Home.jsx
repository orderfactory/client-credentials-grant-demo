import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="card">
      <h2>Welcome to the Client Credentials Grant Demo</h2>
      <p>
        This application demonstrates the OAuth 2.0 Client Credentials Grant flow.
      </p>
      <p>
        As the local application, you can create client credentials for third-party applications
        to access your protected resources.
      </p>
      <div>
        <h3>How it works:</h3>
        <ol style={{ textAlign: 'left' }}>
          <li>You create client credentials for a third-party application</li>
          <li>The third-party application uses these credentials to obtain an access token</li>
          <li>The third-party application uses the access token to access your protected resources</li>
        </ol>
      </div>
      <p>
        <Link to="/create-client">
          <button>Create Client Credentials</button>
        </Link>
      </p>
    </div>
  )
}

export default Home