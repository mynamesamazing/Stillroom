import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DayDial } from "@/components/DayDial";
import { DAY_DIAL_LOCATION_STORAGE_KEY } from "@/lib/dayDialLocation";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(DAY_DIAL_LOCATION_STORAGE_KEY);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Day Dial location preference", () => {
  it("does not ask for location until the user chooses the explicit action", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 12));
    const position = {
      coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    } as GeolocationPosition;
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<DayDial data={seedData} spaces={seedData.spaces} selectedDate="2026-06-21" onSelectDate={vi.fn()} onOpenCalendar={vi.fn()}/>);
    expect(getCurrentPosition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();

    expect(JSON.parse(window.localStorage.getItem(DAY_DIAL_LOCATION_STORAGE_KEY) ?? "{}")).toEqual({
      kind: "device",
      latitude: 37.7749,
      longitude: -122.4194,
      timeZone: expect.any(String),
    });
    expect(screen.getByRole("status").textContent).toContain("not sent to a server");
    expect(window.localStorage.getItem("stillroom-data-v1")).toBeNull();
  });

  it("labels the fallback when location permission is denied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 12));
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<DayDial data={seedData} spaces={seedData.spaces} selectedDate="2026-06-21" onSelectDate={vi.fn()} onOpenCalendar={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));

    expect(screen.getByRole("status").textContent).toContain("Location permission was denied");
    expect(screen.getByText(/Using default fallback: London, United Kingdom/)).toBeTruthy();
    expect(window.localStorage.getItem(DAY_DIAL_LOCATION_STORAGE_KEY)).toBeNull();
  });
});
