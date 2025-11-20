'use client';

import { useState, useEffect, useRef } from 'react';
import SubtitleConfigForm from '@/components/rec/SubtitleConfigForm';
import MicrophoneRecorder from '@/components/rec/MicrophoneRecorder';
import { SubtitleSettings, defaultSubtitleSettings } from '@/lib/subtitle-settings';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY = 'subtitle-settings';

export default function RecPage() {
  const [settings, setSettings] = useState<SubtitleSettings>(defaultSubtitleSettings);
  const socketRef = useRef<Socket | null>(null);
  const lastSentSettingsRef = useRef<string>(''); // Zapamiętaj ostatnie wysłane settings (jako JSON)
  const settingsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from localStorage on client mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all fields exist
        setSettings((prev) => ({ ...defaultSubtitleSettings, ...parsed }));
      } catch (e) {
        console.error('Error loading settings from localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io('http://localhost:4639', {
      path: '/api/ws',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected from /rec');
      // Send initial settings
      const settingsJson = JSON.stringify(settings);
      lastSentSettingsRef.current = settingsJson;
      socket.emit('settings', {
        type: 'settings',
        settings: settings,
      });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected from /rec');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current);
      }
    };
  }, []);

  const handleSettingsChange = (newSettings: SubtitleSettings) => {
    setSettings(newSettings);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.error('Error saving settings to localStorage:', e);
      }
    }
    
    // Debounce wysyłania settings - czekaj 100ms przed wysłaniem
    // i sprawdź czy settings faktycznie się zmieniły
    if (settingsTimeoutRef.current) {
      clearTimeout(settingsTimeoutRef.current);
    }
    
    settingsTimeoutRef.current = setTimeout(() => {
      const newSettingsJson = JSON.stringify(newSettings);
      
      // Wysyłaj TYLKO jeśli settings się faktycznie zmieniły
      if (newSettingsJson !== lastSentSettingsRef.current && socketRef.current?.connected) {
        lastSentSettingsRef.current = newSettingsJson;
        socketRef.current.emit('settings', {
          type: 'settings',
          settings: newSettings,
        });
      }
    }, 100); // Debounce 100ms
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Configuration and Recording Panel
        </h1>

        <SubtitleConfigForm
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />

        <MicrophoneRecorder language={settings.language} />
      </div>
    </div>
  );
}
