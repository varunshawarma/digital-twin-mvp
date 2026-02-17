import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { batchGenerateEmbeddings } from './openai.js';
import { fetchMultipleCalendars, listCalendars } from './calendar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../../../data/personal_data.json');
const EMBEDDINGS_PATH = path.join(__dirname, '../../../data/embeddings.json');

// cache structure 
let cachedData = null;
let calendarCacheTime = null;
let cacheWindowDays = 0;  // track how far we've fetched

const CALENDAR_CACHE_DURATION = 5 * 60 * 1000;        // 5 min for 14-day cache
const EXTENDED_CACHE_DURATION = 30 * 60 * 1000; // 30 min for 60-day cache

export async function loadPersonalData(requestedWindowDays = 14) {
  const now = Date.now();
  const cacheDuration = cacheWindowDays >= 60 ? EXTENDED_CACHE_DURATION : CALENDAR_CACHE_DURATION;
  const cacheExpired = !calendarCacheTime || (now - calendarCacheTime > cacheDuration);
  const cacheCoversWindow = cacheWindowDays >= requestedWindowDays;

  if (cachedData && !cacheExpired && cacheCoversWindow) {
    console.log(`--- Using cached data (${cacheWindowDays}-day window)`);
    return cachedData;
  }

  console.log(`Fetching calendar (requested: ${requestedWindowDays} days, cached: ${cacheWindowDays} days)`);

  try {
    const staticData = await loadRawData();
    
    let staticDataWithEmbeddings;
    const embeddingsExist = await fileExists(EMBEDDINGS_PATH);
    
    if (embeddingsExist) {
      staticDataWithEmbeddings = JSON.parse(await fs.readFile(EMBEDDINGS_PATH, 'utf-8'));
      console.log(`Loaded ${staticDataWithEmbeddings.length} documents with embeddings`);
    } else {
      console.log('Generating embeddings for personal data...');
      staticDataWithEmbeddings = await generateAndSaveEmbeddings(staticData);
    }
    
    const calendarIds = await getCalendarIds();
    const calendarData = await fetchMultipleCalendars(calendarIds, requestedWindowDays);

    let calendarWithEmbeddings = [];
    if (calendarData.length > 0) {
      console.log(`Generating embeddings for ${calendarData.length} calendar events...`);
      calendarWithEmbeddings = await generateEmbeddingsForDocs(calendarData);
      calendarCacheTime = now;
      cacheWindowDays = requestedWindowDays;
    }
    
    cachedData = [...staticDataWithEmbeddings, ...calendarWithEmbeddings];
    console.log(`Total: ${cachedData.length} documents (${staticDataWithEmbeddings.length} static + ${calendarWithEmbeddings.length} calendar)`);
    
    return cachedData;
    
  } catch (error) {
    console.error('Error loading personal data:', error);
    try {
      const embeddingsExist = await fileExists(EMBEDDINGS_PATH);
      if (embeddingsExist) {
        return JSON.parse(await fs.readFile(EMBEDDINGS_PATH, 'utf-8'));
      }
    } catch (e) {
      return [];
    }
  }
}

async function getCalendarIds() {
  try {
    const calendars = await listCalendars();
    
    if (calendars.length > 0) {
      console.log('\nAvailable Calendars:');
      calendars.forEach(cal => {
        console.log(`  - ${cal.summary}${cal.primary ? ' [PRIMARY]' : ''}`);
      });
      
      // find your Digital Twin calendar
      const digitalTwinCal = calendars.find(cal => 
        cal.summary && (
          cal.summary.toLowerCase().includes("digital twin") ||
          cal.summary.toLowerCase().includes("varun")
        )
      );
      
      const ids = []; 
      if (digitalTwinCal) {
        ids.push(digitalTwinCal.id);
      } else {
        ids.push('primary');  // Fallback to primary if Digital Twin not found
      }

      return ids;
    }
  } catch (error) {
    console.error('Error getting calendar IDs:', error);
    return ['primary'];
  }
}

async function loadRawData() {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading raw data:', error);
    return [];
  }
}

async function generateEmbeddingsForDocs(docs) {
  const texts = docs.map(doc => doc.content);
  const embeddings = await batchGenerateEmbeddings(texts);
  
  return docs.map((doc, idx) => ({
    ...doc,
    embedding: embeddings[idx]
  }));
}

async function generateAndSaveEmbeddings(rawData) {
  const dataWithEmbeddings = await generateEmbeddingsForDocs(rawData);
  
  await fs.writeFile(
    EMBEDDINGS_PATH,
    JSON.stringify(dataWithEmbeddings, null, 2)
  );
  
  console.log(`Generated and saved ${dataWithEmbeddings.length} embeddings`);
  
  return dataWithEmbeddings;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function refreshEmbeddings() {
  cachedData = null;
  calendarCacheTime = null;
  const rawData = await loadRawData();
  return await generateAndSaveEmbeddings(rawData);
}