const socket = io({
  auth: {
    role: location.pathname.slice(1)
    
  }
});

export default socket;