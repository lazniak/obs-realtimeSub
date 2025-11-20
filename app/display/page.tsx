'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SubtitleDisplay from '@/components/display/SubtitleDisplay';
import { SubtitleSettings, defaultSubtitleSettings } from '@/lib/subtitle-settings';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY = 'subtitle-settings';

export default function DisplayPage() {
  console.log('[DISPLAY_PAGE] 🎬 Component render');
  
  const [settings, setSettings] = useState<SubtitleSettings>(() => {
    // Load from localStorage on init (same as /rec page)
    console.log('[DISPLAY_PAGE] 🎯 Initializing settings state');
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all fields exist
          const loadedSettings = { ...defaultSubtitleSettings, ...parsed };
          console.log('[DISPLAY_PAGE] ✅ Loaded settings from localStorage:', {
            fontSize: loadedSettings.fontSize,
            autoClearEnabled: loadedSettings.autoClearEnabled,
            displayMode: loadedSettings.displayMode,
          });
          return loadedSettings;
        } catch (e) {
          console.error('[DISPLAY_PAGE] ❌ Error loading settings from localStorage:', e);
        }
      } else {
        console.log('[DISPLAY_PAGE] ℹ️ No settings found in localStorage, using defaults');
      }
    }
    console.log('[DISPLAY_PAGE] 🎯 Using default settings');
    return defaultSubtitleSettings;
  });
  const [transcript, setTranscript] = useState<string>(() => {
    console.log('[DISPLAY_PAGE] 🎯 Initializing transcript state (empty)');
    return '';
  });
  const [transcriptTimestamp, setTranscriptTimestamp] = useState<number>(() => {
    const now = Date.now();
    console.log('[DISPLAY_PAGE] 🎯 Initializing transcriptTimestamp:', new Date(now).toISOString());
    return now;
  });
  const socketRef = useRef<Socket | null>(null);
  const lastSettingsJsonRef = useRef<string>(''); // Debug: zapamiętaj ostatnie settings
  const lastTranscriptRef = useRef<string>(''); // Debug: zapamiętaj ostatni transcript
  const renderCountRef = useRef<number>(0);

  // Log render count
  useEffect(() => {
    renderCountRef.current += 1;
    console.log('[DISPLAY_PAGE] 🔄 Render #' + renderCountRef.current, {
      hasSettings: !!settings,
      transcriptLength: transcript.length,
      transcriptTimestamp: new Date(transcriptTimestamp).toISOString(),
      socketConnected: socketRef.current?.connected || false,
    });
  });

  useEffect(() => {
    console.log('[DISPLAY_PAGE] 🚀 Component mounted - initializing');
    // Set transparent background for html and body
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    console.log('[DISPLAY_PAGE] 🎨 Set transparent background for html and body');

    // Initialize Socket.IO connection
    console.log('[DISPLAY_PAGE] 🔌 Initializing Socket.IO connection to http://localhost:4639/api/ws');
    const socket = io('http://localhost:4639', {
      path: '/api/ws',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[DISPLAY_PAGE] ✅ WebSocket connected from /display', {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[DISPLAY_PAGE] ❌ WebSocket disconnected from /display', {
        reason,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('connect_error', (error) => {
      console.error('[DISPLAY_PAGE] ⚠️ WebSocket connection error:', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    });

    // Listen for settings updates
    socket.on('settings', (data: { type: 'settings'; settings: SubtitleSettings }) => {
      const settingsJson = JSON.stringify(data.settings);
      const settingsChanged = settingsJson !== lastSettingsJsonRef.current;
      
      console.log('[DISPLAY_PAGE] 📥 Settings received:', {
        changed: settingsChanged,
        timestamp: new Date().toISOString(),
        fontSize: data.settings.fontSize,
        autoClearEnabled: data.settings.autoClearEnabled,
        autoClearDelay: data.settings.autoClearDelay,
        displayDuration: data.settings.displayDuration,
        fadeOutDuration: data.settings.fadeOutDuration,
        displayMode: data.settings.displayMode,
        animation: data.settings.animation,
        letterByLetter: data.settings.letterByLetter,
        textTrimEnabled: data.settings.textTrimEnabled,
        apliEnabled: data.settings.apliEnabled,
      });
      
      if (settingsChanged) {
        console.log('[DISPLAY_PAGE] ✅ Settings changed - updating state');
        lastSettingsJsonRef.current = settingsJson;
        
        // Save to localStorage so they're available on next page load
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, settingsJson);
            console.log('[DISPLAY_PAGE] 💾 Settings saved to localStorage');
          } catch (e) {
            console.error('[DISPLAY_PAGE] ❌ Error saving settings to localStorage:', e);
          }
        }
        
        setSettings((prevSettings) => {
          console.log('[DISPLAY_PAGE] 🔄 setSettings called:', {
            prevFontSize: prevSettings.fontSize,
            newFontSize: data.settings.fontSize,
            prevAutoClear: prevSettings.autoClearEnabled,
            newAutoClear: data.settings.autoClearEnabled,
          });
          return data.settings;
        });
      } else {
        console.log('[DISPLAY_PAGE] ⚠️ Settings received but unchanged - ignoring');
      }
    });

    // Listen for transcript updates
    socket.on('transcript', (data: { type: 'partial' | 'committed'; text: string }) => {
      const now = Date.now();
      const textChanged = data.text !== lastTranscriptRef.current;
      const isEmpty = !data.text || data.text.trim().length === 0;
      const timeSinceLastUpdate = lastTranscriptRef.current 
        ? ((now - transcriptTimestamp) / 1000).toFixed(2) + 's'
        : 'N/A';
      
      console.log('[DISPLAY_PAGE] 📥 Transcript received:', {
        type: data.type,
        text: data.text,
        textLength: data.text.length,
        isEmpty,
        textChanged,
        timestamp: new Date().toISOString(),
        timeSinceLastUpdate,
        previousText: lastTranscriptRef.current,
      });
      
      // Ignoruj puste committed transcripts (to są artefakty z VAD)
      if (data.type === 'committed' && isEmpty) {
        console.log('[DISPLAY_PAGE] ⚠️ Ignoring empty committed transcript');
        return;
      }
      
      // Ignoruj partial transcripts z tym samym tekstem (już filtrowane po stronie rec, ale na wszelki wypadek)
      if (data.type === 'partial' && !textChanged) {
        console.log('[DISPLAY_PAGE] ⚠️ Ignoring duplicate partial transcript');
        return;
      }
      
      console.log('[DISPLAY_PAGE] ✅ Transcript accepted - updating state');
      lastTranscriptRef.current = data.text;
      setTranscript((prevTranscript) => {
        console.log('[DISPLAY_PAGE] 🔄 setTranscript called:', {
          prevLength: prevTranscript.length,
          newLength: data.text.length,
          prevText: prevTranscript,
          newText: data.text,
        });
        return data.text;
      });
      
      // WAŻNE: Resetuj timestamp przy KAŻDYM transcript (partial i committed)
      // Partial transcripts oznaczają, że użytkownik nadal mówi, więc timestamp
      // powinien się resetować, żeby AUTO_CLEAR i fade-out działały poprawnie
      const newTimestamp = Date.now();
      if (data.type === 'committed') {
        console.log('[DISPLAY_PAGE] ✅ Committed transcript - resetting timestamp:', {
          oldTimestamp: new Date(transcriptTimestamp).toISOString(),
          newTimestamp: new Date(newTimestamp).toISOString(),
          timeSinceLastCommit: `${((newTimestamp - transcriptTimestamp) / 1000).toFixed(2)}s`,
        });
      } else {
        console.log('[DISPLAY_PAGE] 📝 Partial transcript - resetting timestamp:', {
          oldTimestamp: new Date(transcriptTimestamp).toISOString(),
          newTimestamp: new Date(newTimestamp).toISOString(),
          timeSinceLastUpdate: `${((newTimestamp - transcriptTimestamp) / 1000).toFixed(2)}s`,
        });
      }
      setTranscriptTimestamp((prevTimestamp) => {
        console.log('[DISPLAY_PAGE] 🔄 setTranscriptTimestamp called:', {
          prevTimestamp: new Date(prevTimestamp).toISOString(),
          newTimestamp: new Date(newTimestamp).toISOString(),
          timeDiff: `${((newTimestamp - prevTimestamp) / 1000).toFixed(2)}s`,
        });
        return newTimestamp;
      });
    });

    socketRef.current = socket;

    return () => {
      console.log('[DISPLAY_PAGE] 🛑 Component unmounting - cleaning up');
      socket.disconnect();
      // Reset background colors on unmount
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      console.log('[DISPLAY_PAGE] 🧹 Cleanup complete');
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('[DISPLAY_PAGE] 📊 Settings state changed:', {
      fontSize: settings.fontSize,
      autoClearEnabled: settings.autoClearEnabled,
      autoClearDelay: settings.autoClearDelay,
      displayDuration: settings.displayDuration,
      fadeOutDuration: settings.fadeOutDuration,
    });
  }, [settings]);

  useEffect(() => {
    console.log('[DISPLAY_PAGE] 📊 Transcript state changed:', {
      length: transcript.length,
      text: transcript,
      isEmpty: !transcript || transcript.trim().length === 0,
    });
  }, [transcript]);

  useEffect(() => {
    console.log('[DISPLAY_PAGE] 📊 TranscriptTimestamp state changed:', {
      timestamp: new Date(transcriptTimestamp).toISOString(),
      age: `${((Date.now() - transcriptTimestamp) / 1000).toFixed(2)}s`,
    });
  }, [transcriptTimestamp]);

  console.log('[DISPLAY_PAGE] 🎨 Rendering SubtitleDisplay with props:', {
    textLength: transcript.length,
    textPreview: transcript,
    settingsFontSize: settings.fontSize,
    lastUpdateTimestamp: new Date(transcriptTimestamp).toISOString(),
  });

  // Callback do czyszczenia tekstu (używany przez auto-clear)
  const handleClearText = useCallback(() => {
    console.log('[DISPLAY_PAGE] 🧹 handleClearText called - clearing transcript state');
    // Wyczyść ostatni transcript ref natychmiast, żeby zapobiec ponownemu czyszczeniu
    lastTranscriptRef.current = '';
    setTranscript('');
    // Reset timestamp po wyczyszczeniu - to zapewni że nowy tekst zacznie się od nowa
    setTranscriptTimestamp(Date.now());
    console.log('[DISPLAY_PAGE] ✅ Transcript state cleared - ready for new text');
  }, []);

  return (
    <div className="fixed inset-0 bg-transparent overflow-hidden">
      <SubtitleDisplay 
        text={transcript} 
        settings={settings} 
        lastUpdateTimestamp={transcriptTimestamp}
        onClear={handleClearText}
      />
    </div>
  );
}

