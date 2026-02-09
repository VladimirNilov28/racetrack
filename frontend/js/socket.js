const socket = io({
  auth: {
    role: location.pathname.slice(1),
  },
  autoConnect: false
});

export default socket;