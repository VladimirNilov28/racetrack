export const EVENTS = Object.freeze({
    CMD: Object.freeze({
        SESSION_ADD: "cmd:session:add",
        SESSION_REMOVE: "cmd:session:remove",

        DRIVER_ADD: "cmd:driver:add",
        DRIVER_UPDATE: "cmd:driver:update",
        DRIVER_REMOVE: "cmd:driver:remove",

        RACE_START: "cmd:race:start",
        RACE_SET_MODE: "cmd:race:set-mode",
        RACE_FINISH: "cmd:race:finish",
        SESSION_END: "cmd:session:end",

        LAP_RECORD: "cmd:lap:record",
        
        AUTO_START: "cmd:race:auto-start:set"
    }),

    EVT: Object.freeze({
        STATE_UPDATE: "evt:state:update", // full state snapshot
        CMD_REJECTED: "evt:cmd:rejected", // { event, reason }

        // reserved for future UI hints (not used in MVP)
        AUTH_REQUIRED: "evt:auth:required",
        AUTH_REJECTED: "evt:auth:rejected",
    }),
});
