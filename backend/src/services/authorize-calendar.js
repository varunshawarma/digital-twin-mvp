import { google } from 'googleapis';
import fs from 'fs/promises';
import http from 'http';
import url from 'url';
import open from 'open';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = './token.json';
const CREDENTIALS_PATH = './credentials.json';

async function authorize() {
  try {
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      'http://localhost:3000'  // Redirect URI
    );

    // Create a local server to receive the OAuth callback
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/?code=') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');
          
          res.end('Authentication successful! You can close this window.');
          server.close();
          
          // Exchange code for token
          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          
          // Save token
          await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
          console.log('\nAuthorization successful!');
          console.log('Token saved to', TOKEN_PATH);
          console.log('\nYou can now use calendar integration!');
          console.log('Restart your backend server to load calendar data.\n');
          
          process.exit(0);
        }
      } catch (e) {
        console.error('Error during auth:', e);
        process.exit(1);
      }
    }).listen(3000, () => {
      // Generate auth URL
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      
      console.log('\nCalendar Authorization');
      console.log('========================');
      console.log('\nOpening browser for authorization...');
      console.log('If browser does not open, visit this URL:\n');
      console.log(authUrl);
      console.log('\n');
      
      // Open browser automatically
      open(authUrl);
    });
  } catch (error) {
    console.error('Error loading credentials:', error);
    console.log('\nMake sure you have credentials.json in the backend directory!');
    process.exit(1);
  }
}

authorize();