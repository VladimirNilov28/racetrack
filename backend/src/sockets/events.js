// events.js
// Minimal Socket.IO event contract for MVP (state-push architecture).
// Client sends COMMANDS, server responds by broadcasting full state.

export const EVENTS = Object.freeze({
  // Client -> Server (commands)
  CMD: Object.freeze({
    // Receptionist (Front Desk)
    SESSION_ADD: "cmd:session:add",
    SESSION_UPDATE: "cmd:session:update",
    SESSION_REMOVE: "cmd:session:remove",

    DRIVER_ADD: "cmd:driver:add",
    DRIVER_UPDATE: "cmd:driver:update",
    DRIVER_REMOVE: "cmd:driver:remove",

    // Safety Official (Race Control)
    RACE_START: "cmd:race:start",
    RACE_SET_MODE: "cmd:race:set-mode",
    RACE_FINISH: "cmd:race:finish",
    SESSION_END: "cmd:session:end",

    // Lap-line Observer
    LAP_RECORD: "cmd:lap:record",
  }),

  // Server -> Client (broadcast / responses)
  EVT: Object.freeze({
    STATE_UPDATE: "evt:state:update",      // full state snapshot
    CMD_REJECTED: "evt:cmd:rejected",      // { event, reason }
    AUTH_REQUIRED: "evt:auth:required",    // optional UI hint
    AUTH_REJECTED: "evt:auth:rejected",    // optional UI hint
  }),
});
