const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

type ESPNDebugCompetitor = {
  homeAway?: string;
  score?: string;
  team?: {
    displayName?: string;
    abbreviation?: string;
    logo?: string;
    logos?: {
      href?: string;
    }[];
  };
  records?: unknown[];
};

type ESPNDebugEvent = {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  status?: unknown;
  competitions?: {
    notes?: unknown[];
    series?: unknown;
    competitors?: ESPNDebugCompetitor[];
  }[];
};

function formatDateForESPN(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getWeekDates() {
  const today = new Date();

  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  startOfWeek.setDate(today.getDate() - daysSinceMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date;
  });
}

export async function GET() {
  const weekDates = getWeekDates();

  const responses = await Promise.all(
    weekDates.map((date) => {
      const espnDate = formatDateForESPN(date);

      return fetch(`${ESPN_SCOREBOARD_URL}?dates=${espnDate}`, {
        next: {
          revalidate: 30,
        },
      });
    })
  );

  const payloads = await Promise.all(
    responses.map(async (response) => {
      if (!response.ok) return { events: [] as ESPNDebugEvent[] };
      return response.json() as Promise<{ events?: ESPNDebugEvent[] }>;
    })
  );

  const events = payloads.flatMap((payload) => payload.events || []);

  return Response.json({
    week: weekDates.map(formatDateForESPN),
    eventCount: events.length,
    events: events.map((event) => {
      const competition = event.competitions?.[0];

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        status: event.status,
        notes: competition?.notes || [],
        series: competition?.series || null,
        competitors:
          competition?.competitors?.map((competitor: ESPNDebugCompetitor) => ({
            homeAway: competitor.homeAway,
            score: competitor.score,
            team: {
              displayName: competitor.team?.displayName,
              abbreviation: competitor.team?.abbreviation,
              logo: competitor.team?.logo,
              logos: competitor.team?.logos,
            },
            records: competitor.records || [],
          })) || [],
      };
    }),
  });
}