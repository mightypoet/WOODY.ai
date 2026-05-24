import { getAccessToken } from './googleAuth';

// Generic fetcher with Auth
async function fetchGoogleAPI(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("No Google access token available");

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Google API Error:", res.status, res.statusText, errorBody);
    throw new Error(`Google API request failed: ${res.status} ${res.statusText} - ${errorBody}`);
  }

  // Some operations (like DELETE) may return empty responses
  if (res.status === 204) return null;
  return await res.json();
}

// ==========================
// CALENDAR
// ==========================
export const calendarService = {
  getUpcomingEvents: async (maxResults = 10) => {
    const timeMin = new Date().toISOString();
    return fetchGoogleAPI(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`);
  },
  createEvent: async (summary: string, description: string, startTimeIso: string, endTimeIso: string) => {
    const event = {
      summary,
      description,
      start: { dateTime: startTimeIso },
      end: { dateTime: endTimeIso },
    };
    return fetchGoogleAPI('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }
};

// ==========================
// MEET
// ==========================
export const meetService = {
  createMeetingSpace: async () => {
    return fetchGoogleAPI('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      body: JSON.stringify({}) // Basic empty payload
    });
  }
};

// ==========================
// GMAIL
// ==========================
export const gmailService = {
  getRecentEmails: async (maxResults = 10) => {
    return fetchGoogleAPI(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`);
  },
  sendEmail: async (to: string, subject: string, body: string) => {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');
    
    // Base64Url encode
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    return fetchGoogleAPI('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encodedMessage })
    });
  }
};

// ==========================
// TASKS
// ==========================
export const tasksService = {
  getTaskLists: async () => {
    return fetchGoogleAPI('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  },
  getTasks: async (taskListId: string = '@default') => {
    return fetchGoogleAPI(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`);
  },
  createTask: async (title: string, notes?: string, taskListId: string = '@default') => {
    return fetchGoogleAPI(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, notes })
    });
  }
};

// ==========================
// DOCS & SHEETS
// ==========================
export const docsService = {
  createDocument: async (title: string) => {
    return fetchGoogleAPI('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }
};

export const sheetsService = {
  createSpreadsheet: async (title: string) => {
    return fetchGoogleAPI('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      body: JSON.stringify({ properties: { title } })
    });
  },
  getFirstSheetName: async (spreadsheetId: string) => {
    const data = await fetchGoogleAPI(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`);
    return data.sheets[0].properties.title;
  },
  getSpreadsheetValues: async (spreadsheetId: string, range: string) => {
    return fetchGoogleAPI(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  }
};
