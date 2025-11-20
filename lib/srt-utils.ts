/**
 * Interfejs dla pojedynczej transkrypcji z timestampem
 */
export interface TranscriptEntry {
  text: string;
  startTime: number; // czas w sekundach od startu nagrywania
  endTime: number; // czas w sekundach od startu nagrywania
}

/**
 * Konwertuje czas w sekundach na format SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Generuje plik SRT z historii transkrypcji
 */
export function generateSRT(transcripts: TranscriptEntry[]): string {
  if (transcripts.length === 0) {
    return '';
  }

  let srtContent = '';
  
  transcripts.forEach((entry, index) => {
    const subtitleNumber = index + 1;
    const startTime = formatSRTTime(entry.startTime);
    const endTime = formatSRTTime(entry.endTime);
    
    // Usuń puste transkrypcje
    if (!entry.text || entry.text.trim().length === 0) {
      return;
    }
    
    // Format SRT:
    // 1
    // 00:00:00,000 --> 00:00:05,000
    // Tekst napisu
    // (pusta linia)
    srtContent += `${subtitleNumber}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${entry.text.trim()}\n\n`;
  });

  return srtContent;
}

/**
 * Pobiera nazwę pliku SRT z aktualną datą i czasem
 */
export function getSRTFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2024-01-15T14-30-45
  return `transcription-${dateStr}.srt`;
}

