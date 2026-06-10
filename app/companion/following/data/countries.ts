// Static World Cup 2026 country directory used by the country picker.
// Local copy — keeps the picker decoupled from the world-cup-app monolith.
// Code is the ESPN/FIFA abbreviation. Group letters A–L map to WC_GROUPS.

export type CountryEntry = {
  id: string;    // "BIH"
  name: string;  // "Bosnia & Herzegovina"
  group: string; // "B"
  flag: string;  // 🇧🇦 (emoji for v1 — no licensed image)
};

export const WC_COUNTRIES: CountryEntry[] = [
  // Group A
  { id: "MEX", name: "Mexico",        group: "A", flag: "🇲🇽" },
  { id: "CZE", name: "Czechia",       group: "A", flag: "🇨🇿" },
  { id: "KOR", name: "South Korea",   group: "A", flag: "🇰🇷" },
  { id: "RSA", name: "South Africa",  group: "A", flag: "🇿🇦" },
  // Group B
  { id: "CAN", name: "Canada",                group: "B", flag: "🇨🇦" },
  { id: "BIH", name: "Bosnia & Herzegovina",  group: "B", flag: "🇧🇦" },
  { id: "SUI", name: "Switzerland",           group: "B", flag: "🇨🇭" },
  { id: "QAT", name: "Qatar",                 group: "B", flag: "🇶🇦" },
  // Group C
  { id: "BRA", name: "Brazil",   group: "C", flag: "🇧🇷" },
  { id: "SCO", name: "Scotland", group: "C", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "HAI", name: "Haiti",    group: "C", flag: "🇭🇹" },
  { id: "MAR", name: "Morocco",  group: "C", flag: "🇲🇦" },
  // Group D
  { id: "PAR", name: "Paraguay",       group: "D", flag: "🇵🇾" },
  { id: "TUR", name: "Türkiye",        group: "D", flag: "🇹🇷" },
  { id: "AUS", name: "Australia",      group: "D", flag: "🇦🇺" },
  { id: "USA", name: "United States",  group: "D", flag: "🇺🇸" },
  // Group E
  { id: "ECU", name: "Ecuador",        group: "E", flag: "🇪🇨" },
  { id: "GER", name: "Germany",        group: "E", flag: "🇩🇪" },
  { id: "CIV", name: "Côte d'Ivoire",  group: "E", flag: "🇨🇮" },
  { id: "CUW", name: "Curaçao",        group: "E", flag: "🇨🇼" },
  // Group F
  { id: "NED", name: "Netherlands",  group: "F", flag: "🇳🇱" },
  { id: "SWE", name: "Sweden",       group: "F", flag: "🇸🇪" },
  { id: "JPN", name: "Japan",        group: "F", flag: "🇯🇵" },
  { id: "TUN", name: "Tunisia",      group: "F", flag: "🇹🇳" },
  // Group G
  { id: "BEL", name: "Belgium",      group: "G", flag: "🇧🇪" },
  { id: "IRN", name: "Iran",         group: "G", flag: "🇮🇷" },
  { id: "EGY", name: "Egypt",        group: "G", flag: "🇪🇬" },
  { id: "NZL", name: "New Zealand",  group: "G", flag: "🇳🇿" },
  // Group H
  { id: "ESP", name: "Spain",         group: "H", flag: "🇪🇸" },
  { id: "URU", name: "Uruguay",       group: "H", flag: "🇺🇾" },
  { id: "KSA", name: "Saudi Arabia",  group: "H", flag: "🇸🇦" },
  { id: "CPV", name: "Cape Verde",    group: "H", flag: "🇨🇻" },
  // Group I
  { id: "NOR", name: "Norway",  group: "I", flag: "🇳🇴" },
  { id: "FRA", name: "France",  group: "I", flag: "🇫🇷" },
  { id: "SEN", name: "Senegal", group: "I", flag: "🇸🇳" },
  { id: "IRQ", name: "Iraq",    group: "I", flag: "🇮🇶" },
  // Group J
  { id: "ARG", name: "Argentina", group: "J", flag: "🇦🇷" },
  { id: "AUT", name: "Austria",   group: "J", flag: "🇦🇹" },
  { id: "ALG", name: "Algeria",   group: "J", flag: "🇩🇿" },
  { id: "JOR", name: "Jordan",    group: "J", flag: "🇯🇴" },
  // Group K
  { id: "COL", name: "Colombia",     group: "K", flag: "🇨🇴" },
  { id: "POR", name: "Portugal",     group: "K", flag: "🇵🇹" },
  { id: "UZB", name: "Uzbekistan",   group: "K", flag: "🇺🇿" },
  { id: "COD", name: "DR Congo",     group: "K", flag: "🇨🇩" },
  // Group L
  { id: "ENG", name: "England",  group: "L", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "CRO", name: "Croatia",  group: "L", flag: "🇭🇷" },
  { id: "PAN", name: "Panama",   group: "L", flag: "🇵🇦" },
  { id: "GHA", name: "Ghana",    group: "L", flag: "🇬🇭" },
];

export function getCountry(id: string): CountryEntry | undefined {
  return WC_COUNTRIES.find((c) => c.id === id);
}

export function countryDisplayName(id: string): string {
  return getCountry(id)?.name ?? id;
}
