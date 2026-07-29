export interface CreateEventParams {
  summary: string;
  description: string;
  attendees: { email: string }[];
  startDateTime: string;
  endDateTime: string;
  addGoogleMeetLink: boolean;
}

export const calendarService = {
  async createEvent(params: CreateEventParams) {
    const providerToken = localStorage.getItem('google_provider_token');
        
    if (!providerToken) {
      throw new Error("No Google provider token found. Please sign in with Google again.");
    }

    const event: any = {
      summary: params.summary,
      description: params.description,
      attendees: params.attendees,
      start: { dateTime: params.startDateTime },
      end: { dateTime: params.endDateTime }
    };

    if (params.addGoogleMeetLink) {
      event.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      };
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Calendar API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to create calendar event");
    }

    return await response.json();
  }
};
