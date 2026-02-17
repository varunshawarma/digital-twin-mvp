import { fetchMultipleCalendars, listCalendars } from './src/services/calendar.js';

async function debugCalendar() {
  console.log('🔍 Debugging Calendar Integration\n');
  console.log('=' .repeat(70));
  
  // 1. List all calendars
  console.log('\n📅 Step 1: Available Calendars');
  const calendars = await listCalendars();
  calendars.forEach(cal => {
    console.log(`  - ${cal.summary} (${cal.id})`);
  });
  
  // 2. Fetch events from Spring'26 calendar
  const spring26 = calendars.find(c => c.summary.includes('Digital Twin'));
  const calendarIds = ['primary'];
  if (spring26) calendarIds.push(spring26.id);
  
  console.log('\n Step 2: Fetching Events from:', calendarIds);
  const events = await fetchMultipleCalendars(calendarIds);
  
  console.log(`\n✅ Total events fetched: ${events.length}\n`);
  
  // 3. Show events with "class" or "ECE" in the name
  console.log('🎓 Step 3: Class/Course Events:');
  console.log('=' .repeat(70));
  
  const classEvents = events.filter(e => 
    e.event.t().includes('class') || 
    e.event.toLowerCase().includes('ece') ||
    e.event.toLowerCase().includes('llm') ||
    e.event.toLowerCase().includes('algorithm') ||
    e.event.toLowerCase().includes('design')
  );
  
  classEvents.forEach((event, idx) => {
    console.log(`\n[Event ${idx + 1}]`);
    console.log(`ID: ${event.id}`);
    console.log(`Type: ${event.type}`);
    console.log(`Event Name: ${event.event}`);
    console.log(`Date: ${event.date}`);
    console.log(`Day of Week: ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long' 
})}`);
    console.log(`Content: ${event.content.substring(0, 300)}...`);
    console.log('-'.repeat(70));
  });
  
  // 4. Show Tuesday events specifically
  console.log('\n\n📌 Step 4: Tuesday Events Specifically:');
  console.log('=' .repeat(70));
  
  const tuesdayEvents = events.filter(e => {
    const dayOfWeek = new Date(e.date).getDay();
    return dayOfWeek === 2; // Tuesday = 2
  });
  
  tuesdayEvents.forEach((event, idx) => {
    console.log(`\n[Tuesday Event ${idx + 1}]`);
    console.log(`Event: ${event.event}`);
    console.log(`Date: ${event.date}`);
    console.log(`Content snippet: ${event.content.substring(0, 200)}...`);
  });
  
  console.log(`\nTotal Tuesday events: ${tuesdayEvents.length}`);
}

debugCalendar().catch(console.error);

