# Orchestra GitHub Integration Test Page

This is a test page for the Orchestra GitHub App integration. It allows you to test the complete flow from authentication to GitHub App installation and repository access.

## Prerequisites

1. **ACS Server Running**: The Orchestra ACS server must be running and accessible via ngrok
2. **Supabase Account**: You need access to the Orchestra Supabase instance
3. **GitHub Account**: For installing the Orchestra GitHub App

## Setup Instructions

### 1. Set ACS Server URL

The test page is currently configured to use:
```
ACS Server URL: https://9f681973b181.ngrok-free.app
```

If your ngrok URL is different, update the `ACS_SERVER_URL` variable in `index.html`:
```javascript
const ACS_SERVER_URL = 'https://your-ngrok-url.ngrok-free.app';
```

### 2. Start Local Web Server

Serve the HTML page using any static file server:

**Option A: Python**
```bash
cd /path/to/web/folder
python3 -m http.server 8765
```
Then open: http://localhost:8765

**Option B: Node.js**
```bash
cd /path/to/web/folder
npx serve . -p 8765
# or
npx http-server . -p 8765
```

**Option C: VS Code Live Server**
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"

### 3. Testing Flow

Follow these steps **in order**:

#### Step 1: Supabase Authentication
1. Open the test page in your browser
2. Try **Login** first (if you have an existing account)
3. If login fails, try **Register** (may not work depending on Supabase settings)
4. You should see a success message if authentication works

#### Step 2: Exchange for ACS Cookies ⚠️ **CRITICAL STEP**
1. **MUST CLICK** the "Exchange for ACS Cookies" button
2. This converts your Supabase JWT to ACS session cookies
3. Without this step, GitHub integration will fail with authentication errors
4. You should see a success message confirming cookie exchange

#### Step 3: Connect GitHub
1. Click "Connect GitHub (Install App)"
2. You'll be redirected to GitHub's OAuth flow
3. Authorize the "Orchestra Agents" GitHub App
4. Select which repositories to grant access to
5. You'll be redirected back to the test page
6. Check the browser console for callback processing logs

#### Step 4: Test GitHub Integration
1. Click "List My Installations" - should show your GitHub installations
2. Click "List My Repos" - should show repositories you've granted access to
3. Check browser console and network tab for any errors

## Troubleshooting

### Authentication Issues
- **401 Unauthorized**: Make sure you completed Step 2 (Exchange for ACS Cookies)
- **CORS Errors**: Ensure your local server is running on an allowed origin (localhost:8765, localhost:3000, etc.)
- **No user found**: Try the login/register flow again

### GitHub Integration Issues
- **Callback fails**: Check that the ngrok URL is correct and the ACS server is running
- **No installations/repos**: Verify you completed the GitHub App installation flow
- **Permission errors**: Make sure you granted the necessary repository permissions

### Network Issues
- **Connection refused**: Verify the ACS server is running and ngrok tunnel is active
- **Timeout errors**: Check if the ngrok URL has changed (ngrok URLs change on restart)

## Development Notes

### CORS Configuration
The ACS server is configured to allow requests from:
- `http://localhost:8765`
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:3003`
- `http://localhost:5173`
- `http://localhost:5174`

### GitHub App Configuration
- **App Name**: Orchestra Agents
- **App Slug**: `orchestra-agents`
- **Webhook URL**: `https://your-ngrok-url.ngrok-free.app/api/v1/github/webhooks`
- **Callback URL**: `https://your-ngrok-url.ngrok-free.app/api/v1/github/install/callback`

### API Endpoints Used
- `POST /api/v1/auth/oauth/exchange` - Exchange Supabase JWT for ACS cookies
- `GET /api/v1/github/install/url` - Get GitHub App installation URL
- `GET /api/v1/github/install/callback` - Handle GitHub installation callback
- `GET /api/v1/github/installations` - List user's GitHub installations
- `GET /api/v1/github/repos` - List user's accessible repositories

## File Structure

```
web/
├── README.md           # This file
├── index.html          # Main test page
└── styles.css          # Basic styling (if present)
```

## Security Notes

- This is a **test page only** - not for production use
- Supabase credentials are embedded in the client-side code
- GitHub App installation requires real GitHub permissions
- Always use HTTPS in production (ngrok provides this automatically)