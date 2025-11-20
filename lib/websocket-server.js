const { Server: SocketIOServer } = require('socket.io');

let io = null;
let lastSettings = null; // Store the last settings received

function initializeWebSocket(server) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/api/ws',
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send last known settings to new client (if available)
    // This ensures display page gets current settings even if it connects after rec page
    if (lastSettings) {
      console.log('Sending last known settings to new client:', socket.id);
      socket.emit('settings', lastSettings);
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Broadcast messages from rec clients to display clients
    socket.on('transcript', (data) => {
      socket.broadcast.emit('transcript', data);
    });

    socket.on('settings', (data) => {
      // Store the last settings
      lastSettings = data;
      console.log('Settings received and stored, broadcasting to other clients');
      // Broadcast to all other clients
      socket.broadcast.emit('settings', data);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initializeWebSocket, getIO };

