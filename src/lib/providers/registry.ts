// Central registry — swap these exports when real APIs are wired up.
// Example: `export const hotelProvider = bookingHotelProvider;`
// The UI only calls `getProviders()` and stays untouched.

import type { FlightProvider, HotelProvider, PackageProvider } from "./types";
import { mockFlightProvider, mockHotelProvider, mockPackageProvider } from "./mock";

export function getProviders(): {
  hotels: HotelProvider;
  flights: FlightProvider;
  packages: PackageProvider;
} {
  return {
    hotels: mockHotelProvider,
    flights: mockFlightProvider,
    packages: mockPackageProvider,
  };
}
