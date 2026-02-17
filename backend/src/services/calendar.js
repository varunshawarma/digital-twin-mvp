import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Load or create OAuth2 client
 */
async function authorize() {
  try {
    // Read from env variables (Railway) or fall back to files (local)
    let credentials, token;

    if (process.env.GOOGLE_CREDENTIALS) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } else {
      credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
    }

    if (process.env.GOOGLE_TOKEN) {
      token = JSON.parse(process.env.GOOGLE_TOKEN);
    } else {
      token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf-8'));
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    oAuth2Client.setCredentials(token);
    return oAuth2Client;

  } catch (error) {
    console.log('!!! Calendar auth failed:', error.message);
    return null;
  }
}

/**
 * Fetch calendar events from specific calendar
 */
export async function fetchCalendarEvents(calendarId = 'primary', windowDays = 14) {
  try {
    const auth = await authorize();
    if (!auth) return [];

    const calendar = google.calendar({ version: 'v3', auth });
    
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 1);  // Yesterday
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + windowDays);  // Dynamic window
    
    console.log(`📅 Fetching calendar: ${calendarId} (${windowDays} day window)`);
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 100,        // Increased for longer windows
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`Loaded ${events.length} events (${windowDays} day window)`);
    
    return events.map(event => formatCalendarEvent(event));
  } catch (error) {
    console.log('!!! Could not load calendar:', error.message);
    return [];
  }
}

/**
 * Fetch events from multiple calendars
 */
export async function fetchMultipleCalendars(calendarIds = ['primary'], windowDays = 14) {
  const allEvents = [];
  
  for (const calendarId of calendarIds) {
    const events = await fetchCalendarEvents(calendarId, windowDays);  // ← Pass windowDays
    allEvents.push(...events);
  }
  
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  return allEvents;
}

/**
 * List all available calendars
 */
export async function listCalendars() {
  try {
    const auth = await authorize();
    if (!auth) {
      return [];
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.calendarList.list();
    
    return response.data.items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false
    }));
  } catch (error) {
    console.log('Could not list calendars:', error.message);
    return [];
  }
}

/**
 * Format event into standard data structure
 */
function formatCalendarEvent(event) {
  const parts = [];
  
  parts.push(`Event: ${event.summary}`);
  
  // Time
  const start = new Date(event.start.dateTime || event.start.date);
  const end = new Date(event.end.dateTime || event.end.date);
  
  const options = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric',
    hour: event.start.dateTime ? 'numeric' : undefined,
    minute: event.start.dateTime ? '2-digit' : undefined
  };
  parts.push(`When: ${start.toLocaleString('en-US', options)}`);
  
  if (event.start.dateTime && event.end.dateTime) {
    const duration = Math.round((end - start) / (1000 * 60));
    parts.push(`Duration: ${duration} minutes`);
  }
  
  // Location
  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }
  
  // Attendees (redact for privacy)
  if (event.attendees && event.attendees.length > 0) {
    parts.push(`Attendees: ${event.attendees.length} people`);
  }
  
  // Description
  if (event.description) {
    parts.push(`Description: ${event.description}`);
  }
  
  // Meeting link
  if (event.hangoutLink) {
    parts.push(`Meeting Link: Available`);
  }
  
  // Recurrence
  if (event.recurringEventId) {
    parts.push(`Recurring: Yes`);
  }
  
  return {
    id: `calendar_${event.id}`,
    type: 'calendar',
    event: event.summary,
    date: event.start.dateTime || event.start.date,
    content: parts.join('. ')
  };
}

export { authorize };