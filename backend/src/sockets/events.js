/**
 * Events name structure - <domain>:<entity>:<action>
 * Associated with sockets/state.js
 *
 * This file is a CONTRACT.
 * No logic, no socket.io code, no side effects.
 */

export const EVENTS = {
    // front-desk user (Receptionist)
    RECEPTION: {
        /**
         * Session lifecycle control
         *
         * Associated with:
         *  - state.sessions.upcoming
         *  - state.meta.updatedAt
         *
         * Emitted when receptionist manages race sessions.
         */
        SESSION_ADD: "reception:session:add",
        SESSION_UPDATE: "reception:session:update",
        SESSION_REMOVE: "reception:session:remove",

        /**
         * Drivers control inside a session
         *
         * Associated with:
         *  - state.sessions.upcoming[n].drivers
         *  - state.meta.updatedAt
         *
         * Emitted when receptionist manages drivers in a session.
         */
        DRIVER_ADD: "reception:driver:add",
        DRIVER_UPDATE: "reception:driver:update",
        DRIVER_REMOVE: "reception:driver:remove",
    },

    // race-control user (Safety Official)
    SAFETY: {
        /**
         * RACE_START starts the race
         *
         * Associated with:
         *  - state.sessions.current
         *  - state.sessions.upcoming
         *  - state.race.mode
         *  - state.timer
         *
         * Triggers:
         *  - public:session:current
         *  - public:timer:start
         *  - public:mode:update
         */
        RACE_START: "safety:race:start",

        /**
         * MODE_SET changes current race mode / flag
         *
         * Associated with:
         *  - state.race.mode
         *  - state.race.flag
         *
         * Triggers:
         *  - public:mode:update
         */
        MODE_SET: "safety:mode:set",

        /**
         * RACE_FINISH switches race into finish state
         *
         * Associated with:
         *  - state.race.mode
         *  - state.timer.status
         *
         * Triggers:
         *  - public:mode:update
         *  - public:timer:end
         */
        RACE_FINISH: "safety:race:finish",

        /**
         * SESSION_END окончательно завершает сессию
         *
         * Associated with:
         *  - state.sessions.lastResult
         *  - state.sessions.current
         *  - state.race
         *  - state.timer
         *
         * Triggers:
         *  - public:leaderboard:update
         *  - public:session:ended
         */
        SESSION_END: "safety:session:end",
    },

    // lap-line observer
    OBSERVER: {
        /**
         * LAP_RECORD фиксирует пересечение линии круга
         *
         * Reads:
         *  - state.sessions.current
         *  - state.timer.status
         *
         * Updates:
         *  - state.sessions.current.laps
         *  - state.sessions.current.fastestLaps
         *
         * Triggers:
         *  - public:leaderboard:update
         */
        LAP_RECORD: "observer:lap:record",

        /**
         * LAP_REJECTED emitted when lap input is not accepted
         * (e.g. race already ended)
         *
         * Used mainly for observer UI feedback.
         */
        LAP_REJECTED: "observer:lap:rejected",
    },

    // public screens (read-only)
    PUBLIC: {
        /**
         * Leaderboard data update
         *
         * Reads:
         *  - state.sessions.current
         *  - state.sessions.lastResult
         */
        LEADERBOARD_UPDATE: "public:leaderboard:update",

        /**
         * Timer state updates
         *
         * Reads:
         *  - state.timer
         */
        TIMER_UPDATE: "public:timer:update",
        TIMER_START: "public:timer:start",
        TIMER_END: "public:timer:end",

        /**
         * Race mode / flag update
         *
         * Reads:
         *  - state.race.mode
         *  - state.race.flag
         */
        MODE_UPDATE: "public:mode:update",

        /**
         * Next race information update
         *
         * Associated with:
         *  - state.sessions.upcoming[0]
         *  - reception events
         */
        NEXT_RACE_UPDATE: "public:next-race:update",

        /**
         * Session окончательно завершена
         *
         * Signal-only event for public screens.
         */
        SESSION_ENDED: "public:session:ended",
    },
};
