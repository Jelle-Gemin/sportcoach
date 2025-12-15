# Authentication Specification: Strava OAuth 2.0

## Overview

This document specifies the authentication flow for a React application using Strava's OAuth 2.0 implementation. Users will be able to sign up and log in using their Strava accounts.

## Prerequisites

- Strava API application credentials (Client ID and Client Secret)
- Redirect URI registered in Strava API settings
- Backend server capable of handling OAuth token exchange

## Environment Variables

```
VITE_STRAVA_CLIENT_ID=<your_client_id>
VITE_STRAVA_REDIRECT_URI=<your_redirect_uri>
STRAVA_CLIENT_SECRET=<your_client_secret> # Backend only
```

## Authentication Flow

### 1. Initial Authorization Request

When a user clicks "Login with Strava", redirect them to Strava's authorization endpoint.

**Endpoint:** `https://www.strava.com/oauth/authorize`

**Parameters:**

- `client_id`: Your application's Client ID
- `redirect_uri`: The URI to redirect to after authorization
- `response_type`: Must be `code`
- `approval_prompt`: `auto` (re-prompts if permissions changed) or `force` (always prompt)
- `scope`: Comma-separated list of requested permissions (e.g., `read,activity:read_all`)

**Example URL:**

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&approval_prompt=auto&scope=read,activity:read_all
```

### 2. Authorization Callback

After the user authorizes your application, Strava redirects back to your `redirect_uri` with an authorization code.

**Callback URL format:**

```
YOUR_REDIRECT_URI?state=&code=AUTHORIZATION_CODE&scope=read,activity:read_all
```

**Error handling:**
If the user denies access, the callback includes an error:

```
YOUR_REDIRECT_URI?error=access_denied
```

### 3. Token Exchange

Exchange the authorization code for access and refresh tokens by making a POST request to Strava's token endpoint.

**Endpoint:** `https://www.strava.com/oauth/token`

**Method:** POST

**Parameters:**

- `client_id`: Your application's Client ID
- `client_secret`: Your application's Client Secret (backend only)
- `code`: The authorization code from step 2
- `grant_type`: Must be `authorization_code`

**Example request:**

```javascript
POST https://www.strava.com/oauth/token
Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "grant_type": "authorization_code"
}
```

**Response:**

```json
{
  "token_type": "Bearer",
  "expires_at": 1568775134,
  "expires_in": 21600,
  "refresh_token": "REFRESH_TOKEN",
  "access_token": "ACCESS_TOKEN",
  "athlete": {
    "id": 123456,
    "username": "athlete_username",
    "firstname": "John",
    "lastname": "Doe",
    "profile": "https://dgalywyr863hv.cloudfront.net/pictures/athletes/123456/123456/1/large.jpg"
  }
}
```

## Token Management

### Access Token Storage

Store the access token securely:

- **Frontend:** Use httpOnly cookies or secure session storage
- **Backend:** Store in database associated with user session
- Never store tokens in localStorage for production applications

### Token Expiration

Access tokens expire after 6 hours (`expires_in: 21600` seconds). The `expires_at` field contains the Unix timestamp when the token expires.

### Token Refresh

When the access token expires, use the refresh token to obtain a new access token.

**Endpoint:** `https://www.strava.com/oauth/token`

**Method:** POST

**Parameters:**

- `client_id`: Your application's Client ID
- `client_secret`: Your application's Client Secret
- `grant_type`: Must be `refresh_token`
- `refresh_token`: The refresh token from the initial authorization

**Example request:**

```javascript
POST https://www.strava.com/oauth/token
Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "grant_type": "refresh_token",
  "refresh_token": "REFRESH_TOKEN"
}
```

**Response:**

```json
{
  "token_type": "Bearer",
  "access_token": "NEW_ACCESS_TOKEN",
  "expires_at": 1568862534,
  "expires_in": 21600,
  "refresh_token": "NEW_REFRESH_TOKEN"
}
```

## React Implementation Specification

### Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginButton.tsx
│   │   ├── LogoutButton.tsx
│   │   └── AuthCallback.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   └── useAuth.ts
├── services/
│   └── stravaAuth.ts
└── utils/
    └── tokenManager.ts
```

### AuthContext Interface

```typescript
interface AuthContextType {
  user: StravaAthlete | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile: string;
}
```

### Login Flow

1. User clicks "Login with Strava" button
2. `login()` function redirects to Strava authorization URL
3. User authorizes on Strava
4. Strava redirects to callback route with authorization code
5. Callback component extracts code and sends to backend
6. Backend exchanges code for tokens
7. Backend returns tokens and athlete data
8. Frontend stores tokens and updates auth state
9. User is redirected to application home

### Logout Flow

1. User clicks "Logout" button
2. `logout()` function clears tokens from storage
3. Clear auth state
4. Redirect to login page

### Protected Routes

Implement route guards that check authentication status:

```typescript
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
};
```

### API Request Interceptor

Automatically attach access token to API requests and handle token refresh on 401 responses:

```typescript
// Pseudo-code
axios.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      // Retry original request
    }
    return Promise.reject(error);
  }
);
```

## Security Considerations

### PKCE (Proof Key for Code Exchange)

While not required by Strava, consider implementing PKCE for enhanced security in public clients.

### State Parameter

Include a `state` parameter in the authorization URL to prevent CSRF attacks:

1. Generate random string before redirect
2. Store in session
3. Verify it matches on callback

### Token Storage

- **Never** expose Client Secret in frontend code
- Store tokens securely (httpOnly cookies preferred)
- Implement token encryption at rest in database
- Use HTTPS for all requests

### Scope Permissions

Request only the minimum scopes needed:

- `read`: Read public profile data
- `read_all`: Read private profile data
- `profile:read_all`: Read all profile information
- `profile:write`: Update profile
- `activity:read`: Read activity data
- `activity:read_all`: Read private activities
- `activity:write`: Create and update activities

## Error Handling

### Common Errors

- **access_denied**: User denied authorization
- **invalid_grant**: Authorization code expired or invalid
- **invalid_client**: Invalid client credentials
- **rate_limit_exceeded**: Too many requests

### Error Response Format

```json
{
  "message": "Error description",
  "errors": [
    {
      "resource": "Application",
      "field": "client_id",
      "code": "invalid"
    }
  ]
}
```

## Rate Limits

- 100 requests per 15 minutes, 1000 per day
- Monitor `X-RateLimit-Limit` and `X-RateLimit-Usage` headers
- Implement exponential backoff for retries

## Testing Checklist

- [ ] Successful login flow
- [ ] User denial of authorization
- [ ] Expired authorization code handling
- [ ] Access token refresh
- [ ] Logout functionality
- [ ] Protected route access
- [ ] Token expiration handling
- [ ] Network error handling
- [ ] Rate limit handling

## References

- [Strava OAuth 2.0 Documentation](https://developers.strava.com/docs/authentication/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
