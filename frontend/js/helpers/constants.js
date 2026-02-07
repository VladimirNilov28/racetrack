/**
 * Constants for public-facing page scripts will be moved here
 */

export const EVENTS = Object.freeze({
  CMD: Object.freeze({
    LAP_RECORD: "cmd:lap:record",
  }),
  EVT: Object.freeze({
    STATE_UPDATE: "evt:state:update",
    CMD_REJECTED: "evt:cmd:rejected",
  }),
});

export const validModes = ["safe", "hazard", "danger", "finish"];
