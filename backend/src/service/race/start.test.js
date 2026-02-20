import { describe, it, expect } from "vitest";
import { createInitialState } from "../state-init.js";
import { startRace } from "./start.js";

describe("startRace", () => {

  it("moves first upcoming session to current", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const next = startRace(state);

    expect(next.sessions.current.id).toBe("s1");
  });

  it("removes started session from upcoming list", () => {
    const state = createInitialState();
    state.sessions.upcoming.push(
      { id: "s1", drivers: [] },
      { id: "s2", drivers: [] }
    );

    const next = startRace(state);

    expect(next.sessions.upcoming.length).toBe(1);
    expect(next.sessions.upcoming[0].id).toBe("s2");
  });

  it("sets race mode to safe", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const next = startRace(state);

    expect(next.race.mode.value).toBe("safe");
  });

  it("starts the race timer", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const next = startRace(state);

    expect(next.timer.status).toBe("running");
    expect(next.timer.startedAt).not.toBeNull();
    expect(next.timer.endsAt).not.toBeNull();
  });

  it("throws if there is no upcoming session", () => {
    const state = createInitialState();

    expect(() => startRace(state)).toThrow();
  });

  it("does not mutate original state object", () => {
    const state = createInitialState();
    state.sessions.upcoming.push({ id: "s1", drivers: [] });

    const next = startRace(state);

    expect(next).not.toBe(state);
    expect(state.sessions.current).toBeNull();
  });

});
