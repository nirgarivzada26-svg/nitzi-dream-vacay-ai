// Airline registry + route-operation table.
//
// A carrier may only be offered on a route it actually operates. The table
// below is the demo stand-in for a supplier's schedule feed; a live adapter
// replaces `operatesRoute` with the carrier list returned by the provider.

export interface Airline {
  code: string;
  name: string;
  alliance: "star" | "skyteam" | "oneworld" | null;
  lowCost: boolean;
  /** ISO-2 country codes served non-stop or with own-metal connections from TLV. */
  serves: string[] | "*";
  aircraft: string[];
}

export const AIRLINES: Airline[] = [
  {
    code: "LY",
    name: "אל על",
    alliance: null,
    lowCost: false,
    serves: "*",
    aircraft: ["Boeing 737-900", "Boeing 787-9"],
  },
  {
    code: "IZ",
    name: "ארקיע",
    alliance: null,
    lowCost: false,
    serves: ["GR", "CY", "IT", "ES", "HR", "ME", "GE"],
    aircraft: ["Embraer 195", "Boeing 737-800"],
  },
  {
    code: "6H",
    name: "ישראייר",
    alliance: null,
    lowCost: false,
    serves: ["GR", "CY", "IT", "ES", "FR", "GE", "AE", "PT"],
    aircraft: ["Airbus A320", "Airbus A321neo"],
  },
  {
    code: "LH",
    name: "לופטהנזה",
    alliance: "star",
    lowCost: false,
    serves: ["DE", "FR", "GB", "PT", "ES", "IT", "CZ", "US"],
    aircraft: ["Airbus A320neo", "Airbus A321"],
  },
  {
    code: "TK",
    name: "טורקיש איירליינס",
    alliance: "star",
    lowCost: false,
    serves: ["TR", "GR", "IT", "ES", "PT", "FR", "GB", "CZ", "HR", "GE", "TH"],
    aircraft: ["Airbus A321neo", "Boeing 737 MAX 8"],
  },
  {
    code: "AF",
    name: "אייר פראנס",
    alliance: "skyteam",
    lowCost: false,
    serves: ["FR", "ES", "PT", "IT", "GB"],
    aircraft: ["Airbus A320", "Airbus A321"],
  },
  {
    code: "W6",
    name: "וויז אייר",
    alliance: null,
    lowCost: true,
    serves: ["GR", "IT", "CY", "HU", "CZ", "PL", "RO", "GE", "AE", "ES", "PT", "HR", "ME"],
    aircraft: ["Airbus A321neo", "Airbus A320"],
  },
  {
    code: "FR",
    name: "ריינאייר",
    alliance: null,
    lowCost: true,
    serves: ["IT", "GR", "ES", "CY", "HU", "PL"],
    aircraft: ["Boeing 737-800"],
  },
  {
    code: "A3",
    name: "אג'יאן",
    alliance: "star",
    lowCost: false,
    serves: ["GR", "CY", "IT"],
    aircraft: ["Airbus A320neo", "Airbus A321"],
  },
  {
    code: "EK",
    name: "אמירייטס",
    alliance: null,
    lowCost: false,
    serves: ["AE", "TH", "MV", "SC"],
    aircraft: ["Boeing 777-300ER", "Airbus A380"],
  },
  {
    code: "BA",
    name: "בריטיש איירווייז",
    alliance: "oneworld",
    lowCost: false,
    serves: ["GB", "US"],
    aircraft: ["Airbus A320neo", "Boeing 787-8"],
  },
];

const byCode = new Map(AIRLINES.map((a) => [a.code, a]));

export function getAirline(code: string): Airline | null {
  return byCode.get(code) ?? null;
}

/** Airline brand mark. Returns null when we have no verified logo. */
export function airlineLogo(code: string): string | null {
  return byCode.has(code) ? `https://images.kiwi.com/airlines/64/${code}.png` : null;
}

/** True only when the carrier actually operates to that country. */
export function operatesRoute(airline: Airline, destinationCountryCode: string): boolean {
  if (airline.serves === "*") return true;
  return airline.serves.includes(destinationCountryCode.toUpperCase());
}

/** Carriers legitimately bookable on TLV -> <country>. Never returns others. */
export function carriersForRoute(destinationCountryCode: string): Airline[] {
  return AIRLINES.filter((a) => operatesRoute(a, destinationCountryCode));
}
