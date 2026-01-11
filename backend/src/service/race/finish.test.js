import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { startRace } from "./start.js";
import { finishRace } from "./finish.js";

describe("finishRace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets race mode to "finish"', () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const running = startRace(state);
    const next = finishRace(running);

    expect(next.race.mode.value).toBe("finish");
  });

  it("updates race mode timestamp", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const running = startRace(state);
    const next = finishRace(running);

    expect(next.race.mode.updatedAt).not.toBeNull();
  });

  it('marks the timer as "ended"', () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const running = startRace(state);
    const next = finishRace(running);

    expect(next.timer.status).toBe("ended");
  });

  it("sets timer.endsAt to now if race is finished early", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const running = startRace(state);

    // endsAt likely in the future (1m/10m). We finish immediately.
    const next = finishRace(running);

    expect(next.timer.endsAt).toBe(Date.now());
  });

  it("does not change anything if race is already finished", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const running = startRace(state);
    const finished = finishRace(running);

    const next = finishRace(finished);

    expect(next.race.mode.value).toBe("finish");
    expect(next.timer.status).toBe("ended");
  });

  it("does not mutate original state object", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const running = startRace(state);
    const next = finishRace(running);

    expect(next).not.toBe(running);
    expect(running.race.mode.value).toBe("safe");
    expect(running.timer.status).toBe("running");
  });

  it("throws if there is no running race", () => {
    const state = createInitialState();

    expect(() => finishRace(state)).toThrow();
  });
});
