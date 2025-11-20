import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { SubtitleSettings } from './subtitle-settings';

export interface TranscriptMessage {
  type: 'partial' | 'committed';
  text: string;
}

export interface SettingsMessage {
  type: 'settings';
  settings: SubtitleSettings;
}

export type SocketMessage = TranscriptMessage | SettingsMessage;

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
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

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Broadcast messages from rec clients to display clients
    socket.on('transcript', (data: TranscriptMessage) => {
      socket.broadcast.emit('transcript', data);
    });

    socket.on('settings', (data: SettingsMessage) => {
      socket.broadcast.emit('settings', data);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

