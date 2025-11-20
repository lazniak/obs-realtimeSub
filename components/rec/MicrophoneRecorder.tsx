'use client';

import { useEffect, useRef, useState } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { io, Socket } from 'socket.io-client';
import { TranscriptEntry, generateSRT, getSRTFilename } from '@/lib/srt-utils';

/**
 * Formatuje czas w sekundach na czytelny format (MM:SS lub HH:MM:SS)
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface MicrophoneRecorderProps {
  onTranscript?: (text: string, type: 'partial' | 'committed') => void;
  language?: string;
}

export default function MicrophoneRecorder({
  onTranscript,
  language = 'auto',
}: MicrophoneRecorderProps) {
  const socketRef = useRef<Socket | null>(null);
  const lastPartialTextRef = useRef<string>(''); // Zapamiętaj ostatni wysłany partial transcript
  const lastPartialTimestampRef = useRef<number>(0); // Zapamiętaj timestamp ostatniego partial transcript
  const recordingStartTimeRef = useRef<number | null>(null); // Czas startu nagrywania
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]); // Historia transkrypcji
  const currentSegmentStartRef = useRef<number | null>(null); // Czas startu aktualnego segmentu
  const lastCommittedTextRef = useRef<string>(''); // Ostatni committed text (do obliczania czasu końca)
  const [recordWithOBS, setRecordWithOBS] = useState<boolean>(false); // Checkbox dla nagrywania z OBS
  const obsRecordingActiveRef = useRef<boolean>(false); // Czy nagrywanie OBS jest aktywne
  
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      const now = Date.now();
      
      // Jeśli to pierwszy partial transcript po starcie nagrywania, zapisz czas startu segmentu
      if (recordingStartTimeRef.current !== null && currentSegmentStartRef.current === null) {
        currentSegmentStartRef.current = (now - recordingStartTimeRef.current) / 1000; // w sekundach
      }
      
      // Wysyłamy każdy partial transcript natychmiast, aby zapewnić maksymalną responsywność
      // Eliminujemy sztuczne opóźnienia po stronie klienta
      const textChanged = data.text !== lastPartialTextRef.current;
      
      if (true) { // Zawsze wysyłaj
        lastPartialTextRef.current = data.text;
        lastPartialTimestampRef.current = now;
        
        if (socketRef.current?.connected) {
          socketRef.current.emit('transcript', {
            type: 'partial',
            text: data.text,
          });
        }
        onTranscript?.(data.text, 'partial');
      }
    },
    onCommittedTranscript: (data) => {
      // Committed transcripts zawsze wysyłamy (oznaczają zakończenie segmentu)
      if (socketRef.current?.connected) {
        socketRef.current.emit('transcript', {
          type: 'committed',
          text: data.text,
        });
      }
      
      // Dodaj do historii transkrypcji z timestampami
      // WAŻNE: Używamy czasu ostatniego partial transcript jako endTime,
      // ponieważ committed przychodzi z opóźnieniem (VAD ~1.5s),
      // a chcemy znaczniki czasowe zgodne z wypowiadanymi słowami
      if (recordingStartTimeRef.current !== null) {
        // Użyj czasu ostatniego partial transcript jako endTime (moment faktycznego zakończenia mowy)
        // Jeśli nie mamy partial timestamp, użyj czasu obecnego (fallback)
        const endTimestamp = lastPartialTimestampRef.current > 0 
          ? lastPartialTimestampRef.current 
          : Date.now();
        const endTime = (endTimestamp - recordingStartTimeRef.current) / 1000; // w sekundach
        
        // Jeśli nie mamy czasu startu segmentu (np. committed bez partial),
        // użyj czasu końca poprzedniego segmentu lub czasu obecnego minus 1 sekunda
        let startTime = currentSegmentStartRef.current;
        if (startTime === null) {
          // Oblicz startTime na podstawie poprzednich transkrypcji
          setTranscriptHistory((prev) => {
            if (prev.length > 0) {
              startTime = prev[prev.length - 1].endTime;
            } else {
              // Jeśli to pierwsza transkrypcja, użyj czasu obecnego minus 1 sekunda
              startTime = Math.max(0, endTime - 1);
            }
            
            // Dodaj tylko jeśli tekst nie jest pusty
            if (data.text && data.text.trim().length > 0) {
              // Upewnij się, że endTime >= startTime (zabezpieczenie przed błędami)
              const finalEndTime = Math.max(endTime, startTime + 0.1); // minimum 100ms różnicy
              return [
                ...prev,
                {
                  text: data.text,
                  startTime: startTime,
                  endTime: finalEndTime,
                },
              ];
            }
            return prev;
          });
        } else {
          // Mamy startTime z partial transcript
          // Dodaj tylko jeśli tekst nie jest pusty
          if (data.text && data.text.trim().length > 0) {
            // Upewnij się, że endTime >= startTime (zabezpieczenie przed błędami)
            const finalEndTime = Math.max(endTime, startTime + 0.1); // minimum 100ms różnicy
            setTranscriptHistory((prev) => [
              ...prev,
              {
                text: data.text,
                startTime: startTime,
                endTime: finalEndTime,
              },
            ]);
          }
        }
        
        // Resetuj czas startu segmentu dla następnego
        currentSegmentStartRef.current = null;
      }
      
      lastCommittedTextRef.current = data.text;
      // Resetuj lastPartialTextRef i timestamp po committed transcript
      lastPartialTextRef.current = '';
      lastPartialTimestampRef.current = 0;
      onTranscript?.(data.text, 'committed');
    },
  });

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io('http://localhost:4639', {
      path: '/api/ws',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleStart = async () => {
    try {
      // Resetuj historię transkrypcji i zapisz czas startu
      setTranscriptHistory([]);
      recordingStartTimeRef.current = Date.now();
      currentSegmentStartRef.current = null;
      lastCommittedTextRef.current = '';
      
      // Startuj nagrywanie w OBS jeśli checkbox jest zaznaczony
      if (recordWithOBS) {
        try {
          const obsResponse = await fetch('/api/obs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'startRecording' }),
          });

          if (obsResponse.ok) {
            obsRecordingActiveRef.current = true;
            console.log('OBS recording started');
          } else {
            const errorData = await obsResponse.json();
            console.error('Failed to start OBS recording:', errorData);
            alert(`Failed to start OBS recording: ${errorData.details || errorData.error}\n\nMake sure OBS is running and WebSocket Server is enabled (Tools > WebSocket Server Settings).`);
          }
        } catch (obsError) {
          console.error('Error starting OBS recording:', obsError);
          alert('Error connecting to OBS. Make sure OBS is running and WebSocket Server is enabled.');
        }
      }
      
      // Fetch token from server
      const response = await fetch('/api/scribe-token', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const { token } = await response.json();

      const connectionConfig: any = {
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        // Włącz VAD (Voice Activity Detection) - automatycznie wykrywa pauzy
        // i commituje transkrypcje gdy wykryje ciszę
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 1.5, // Pauza 1.5 sekundy = commit
        vadThreshold: 0.4, // Próg wykrywania mowy (0-1)
        minSpeechDurationMs: 100, // Minimalna długość mowy
        minSilenceDurationMs: 100, // Minimalna długość ciszy
      };

      // Dodaj język tylko jeśli nie jest 'auto'
      // UWAGA: Parametr 'language' w API ElevenLabs określa język ŹRÓDŁOWY (audio),
      // nie język docelowy. API nie tłumaczy - tylko transkrybuje w wykrytym/jasno określonym języku źródłowym.
      if (language && language !== 'auto') {
        connectionConfig.language = language;
      }

      await scribe.connect(connectionConfig);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording. Check API key configuration.');
      recordingStartTimeRef.current = null;
      
      // Jeśli OBS nagrywanie zostało uruchomione, zatrzymaj je
      if (obsRecordingActiveRef.current) {
        try {
          await fetch('/api/obs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'stopRecording' }),
          });
          obsRecordingActiveRef.current = false;
        } catch (e) {
          // Ignore errors when stopping OBS
        }
      }
    }
  };

  const handleStop = async () => {
    scribe.disconnect();
    // Opcjonalnie: zakończ ostatni segment jeśli jest otwarty
    if (currentSegmentStartRef.current !== null && recordingStartTimeRef.current !== null) {
      const now = Date.now();
      const endTime = (now - recordingStartTimeRef.current) / 1000;
      const startTime = currentSegmentStartRef.current;
      
      // Jeśli mamy ostatni partial text, dodaj go jako committed
      if (lastPartialTextRef.current && lastPartialTextRef.current.trim().length > 0) {
        setTranscriptHistory((prev) => [
          ...prev,
          {
            text: lastPartialTextRef.current,
            startTime: startTime,
            endTime: endTime,
          },
        ]);
      }
    }
    recordingStartTimeRef.current = null;
    currentSegmentStartRef.current = null;

    // Zatrzymaj nagrywanie w OBS jeśli było aktywne
    if (obsRecordingActiveRef.current) {
      try {
        const obsResponse = await fetch('/api/obs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'stopRecording' }),
        });

        if (obsResponse.ok) {
          console.log('OBS recording stopped');
        } else {
          console.error('Failed to stop OBS recording');
        }
        obsRecordingActiveRef.current = false;
      } catch (obsError) {
        console.error('Error stopping OBS recording:', obsError);
        obsRecordingActiveRef.current = false;
      }
    }
  };

  const handleExportSRT = () => {
    if (transcriptHistory.length === 0) {
      alert('No transcripts to export. Start recording and wait for transcripts.');
      return;
    }

    try {
      const srtContent = generateSRT(transcriptHistory);
      const filename = getSRTFilename();
      
      // Create blob and download file
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting SRT:', error);
      alert('Error exporting SRT file');
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Recording</h2>

      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap items-center">
          <button
            onClick={handleStart}
            disabled={scribe.isConnected}
            className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {scribe.isConnected ? 'Recording...' : 'Start Recording'}
          </button>
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={recordWithOBS}
              onChange={(e) => setRecordWithOBS(e.target.checked)}
              disabled={scribe.isConnected}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={scribe.isConnected ? 'opacity-50' : ''}>
              Also record in OBS
            </span>
          </label>
          <button
            onClick={handleStop}
            disabled={!scribe.isConnected}
            className="px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Stop
          </button>
          <button
            onClick={handleExportSRT}
            disabled={transcriptHistory.length === 0}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            title={`Export ${transcriptHistory.length} transcripts to SRT file`}
          >
            Export SRT ({transcriptHistory.length})
          </button>
        </div>

        {scribe.isConnected && (
          <div className="p-4 bg-green-900/30 border border-green-700 rounded">
            <p className="text-green-300 font-medium">
              Status: Recording active {language !== 'auto' ? `(${language})` : '(auto)'}
            </p>
            {scribe.partialTranscript && (
              <p className="text-sm text-green-200 mt-2">
                Live: {scribe.partialTranscript}
              </p>
            )}
          </div>
        )}

        {!scribe.isConnected && (
          <div className="p-4 bg-gray-700 rounded">
            <p className="text-gray-300">Click "Start Recording" to begin</p>
          </div>
        )}

        {transcriptHistory.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2 text-gray-200">
              Transcript History ({transcriptHistory.length}):
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-700 p-3 rounded">
              {transcriptHistory.map((entry, index) => (
                <div key={index} className="text-sm text-gray-300 border-b border-gray-600 pb-2 last:border-b-0">
                  <div className="text-xs text-gray-400 mb-1">
                    {formatTime(entry.startTime)} → {formatTime(entry.endTime)}
                  </div>
                  <div>{entry.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
