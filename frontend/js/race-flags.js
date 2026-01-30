import socket from "./socket.js";

// elements shall be defined here
const elDisplay = document.getElementById("flag-display");
// const elIcon = document.getElementById("flag-icon");
// const elText = document.getElementById("flag-text");
// const elSubtext = document.getElementById("flag-subtext");
const elFullscreen = document.getElementById("flag-fullscreen");

// states shall be defined here
/* TEXT/SUB/ICON will be removed */
const MODES = {
    safe: {
        className: "safe",
        //text: "TRACK CLEAR",
        //sub: "All clear. Can you feel the speed?",
    },
    hazard: {
        className: "hazard",
        //text: "CAUTION!",
        //sub: "Hazard on track. Drive slowly!"
    },
    danger: {
        className: "danger",
        //text: "RED FLAG",
        //sub: "Danger. Stop driving!",
    },
    finish: {
        className: "finish",
        //text: "FINISH",
        //sub: "Session complete. Return to pits, bitch!",
    },
    idle: {
        className: "idle",
        //icon: "⚡",
        //text: "STANDBY",
        //sub: "Waiting for race control...",
    },
};

const EVENTS = {
    STATE_UPDATE: "evt:state:update",
};

function renderFlag(modeKey) {
    // modes are determined by mode key
    const config = MODES[modeKey] || MODES.idle;

    // update container class:
    // first, getting rid of all potential flag classes
    Object.values(MODES).forEach((m) => {
        if (m.className) elDisplay.classList.remove(m.className);
    });

    // second, add new valid class:
    elDisplay.classList.add(config.className);

    /* WILL BE REMOVED */
    // third, update content:
    /*elIcon.textContent = config.icon;
    elIcon.textContent = config.text;
    elSubtext.textContent = config.sub;*/
}

socket.on(EVENTS.STATE_UPDATE, (state) => {
    // check for state existence
    const currentMode = state?.race?.mode?.value;

    // state will default to 'idle' if no mode is stet in state
    renderFlag(currentMode || "idle");
})

// fullscreen toggle v1
elFullscreen?.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
});

// fullscreen toggle v2, needs iPad for testing, probably not needed
/* elFullscreen?.addEventListener("click", () => {
    const elem = document.documentElement;

    if (!document.fullscreenElement && !document.webkitFullScreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
})*/

// render init
renderFlag("idle");