import { describe, it, expect } from "vitest";
import { createInitialState } from "../state-init.js";
import { setRaceMode } from "./set-mode.js";

describe("setRaceMode", () => {

  it("sets race mode to the given value", () => {
    const state = createInitialState();

    const next = setRaceMode(state, "hazard");

    expect(next.race.mode.value).toBe("hazard");
  });

  it("updates race mode timestamp", () => {
    const state = createInitialState();

    const next = setRaceMode(state, "danger");

    expect(next.race.mode.updatedAt).not.toBeNull();
  });

  it("does not allow changing mode after finish", () => {
    const state = createInitialState();
    state.race.mode.value = "finish";

    const next = setRaceMode(state, "safe");

    expect(next.race.mode.value).toBe("finish");
  });

  it("throws if mode is invalid", () => {
    const state = createInitialState();

    expect(() => setRaceMode(state, "purple")).toThrow();
  });

  it("does not mutate original state", () => {
    const state = createInitialState();

    const next = setRaceMode(state, "hazard");

    expect(next).not.toBe(state);
    expect(state.race.mode.value).toBe("safe");
  });

});
