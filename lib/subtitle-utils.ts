import { SubtitleSettings } from './subtitle-settings';

/**
 * Normalizuje tekst - usuwa zbędne spacje i trimuje
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Normalizuje tekst do porównywania (usuwa interpunkcję, małe litery)
 */
export function normalizeForComparison(text: string): string {
  if (!text) return '';
  // Zachowuje tylko litery i cyfry, zamienia na małe
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Sprawdza czy tekst jest halucynacją modelu (np. szum interpretowany jako egzotyczny język)
 */
export function isHallucination(text: string): boolean {
  if (!text) return false;

  // 1. Sprawdź występowanie skryptu Ol Chiki (częsta halucynacja w Scribe v2)
  // Zakres Unicode: U+1C50 do U+1C7F
  if (/[\u1C50-\u1C7F]/.test(text)) {
    console.log('[FILTER] 🚫 Detected Ol Chiki script (likely hallucination)');
    return true;
  }

  // 2. Sprawdź występowanie znaku Replacement Character (\uFFFD)
  if (text.includes('\uFFFD')) {
     console.log('[FILTER] 🚫 Detected replacement character (likely encoding error/noise)');
     return true;
  }

  // 3. Sprawdź nadmierne powtórzenia (np. "Bang bang bang bang...")
  // Jeśli tekst jest długi (>50 znaków) i ma bardzo niski stosunek unikalnych słów
  const words = getWords(text);
  if (words.length > 10) {
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const ratio = uniqueWords / words.length;
    
    // Jeśli mniej niż 20% słów jest unikalnych przy długim tekście
    if (ratio < 0.2 && words.length > 15) {
       console.log('[FILTER] 🚫 Detected excessive repetition (spam/noise)');
       return true;
    }
  }

  return false;
}

/**
 * Znajduje nową część tekstu, usuwając część historyczną
 * Obsługuje "fuzzy matching" ignorując interpunkcję i wielkość liter
 */
export function findNewTextSegment(historyText: string, currentText: string): string {
  if (!historyText) return currentText;
  if (!currentText) return '';

  const historyNorm = normalizeForComparison(historyText);
  const currentNorm = normalizeForComparison(currentText);

  // Debug logowania (opcjonalne, ale pomocne przy problemach)
  // console.log('[DIFF] Comparing:', { historyNorm, currentNorm });

  // Jeśli historia jest pusta po normalizacji, zwróć całość
  if (!historyNorm) return currentText;

  // Jeśli znormalizowany tekst nie zaczyna się od historii, to jest to nowa sekwencja
  if (!currentNorm.startsWith(historyNorm)) {
    // console.log('[DIFF] Mismatch - new sequence');
    return currentText;
  }

  // Znajdź punkt podziału w oryginalnym tekście
  let historyIdx = 0;
  let currentIdx = 0;
  
  // Przechodzimy przez oryginalny currentText, dopasowując go do historyNorm
  while (historyIdx < historyNorm.length && currentIdx < currentText.length) {
    const charNorm = normalizeForComparison(currentText[currentIdx]);
    
    if (charNorm.length > 0) {
      // To jest znaczący znak (litera/cyfra)
      if (charNorm === historyNorm[historyIdx]) {
        historyIdx++;
      } else {
        // Nieoczekiwana niezgodność (nie powinno się zdarzyć przy startsWith)
        break;
      }
    }
    // Znaki nieznaczące (interpunkcja) w currentText po prostu pomijamy w dopasowaniu,
    // ale zwiększamy currentIdx, żeby znaleźć koniec historii w currentText
    currentIdx++;
  }
  
  // Jeśli nie udało się dopasować całej historii
  if (historyIdx < historyNorm.length) {
    return currentText;
  }
  
  // Zwróć pozostałą część tekstu
  // currentIdx wskazuje na pierwszy znak PO dopasowanej historii
  return currentText.slice(currentIdx);
}

/**
 * Sprawdza czy tekst składa się tylko z interpunkcji lub spacji
 */
export function isPunctuationOnly(text: string): boolean {
  if (!text) return true;
  // Sprawdza czy po usunięciu interpunkcji i spacji coś zostaje (np. litery, cyfry)
  const normalized = normalizeForComparison(text);
  return normalized.length === 0;
}

/**
 * Usuwa wiodące znaki interpunkcyjne, spacje oraz specyficzne znaki jak %, # itp.
 * które mogą pojawić się przy rozpoczęciu nowego zdania z API.
 */
export function removeLeadingPunctuation(text: string): string {
  if (!text) return '';
  // Usuwa spacje oraz . , ; : - ! ? % # @ & * ( ) [ ] { } / \ | < > z początku stringa
  return text.replace(/^[\s.,;:!?-]+/, '');
}

/**
 * Bezpiecznie dzieli tekst na słowa, obsługując wielokrotne spacje
 */
export function getWords(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeText(text);
  return normalized.split(' ').filter(word => word.length > 0);
}

/**
 * Sprawdza czy nowy tekst jest rozszerzeniem starego (zawiera go na początku)
 */
export function isTextExtension(newText: string, oldText: string): boolean {
  if (!oldText || !newText) return false;
  const normalizedNew = normalizeText(newText);
  const normalizedOld = normalizeText(oldText);
  return normalizedNew.startsWith(normalizedOld);
}

/**
 * Przycina tekst zgodnie z ustawieniami
 */
export function trimText(text: string, settings: SubtitleSettings): string {
  if (!text || !settings.textTrimEnabled) {
    if (!text) {
      console.log('[TEXT_TRIM] 📝 No text provided');
    } else if (!settings.textTrimEnabled) {
      console.log('[TEXT_TRIM] ⏸️ Trimming disabled - returning original text:', {
        length: text.length,
        preview: text,
      });
    }
    return text || '';
  }

  const normalized = normalizeText(text);
  console.log('[TEXT_TRIM] 🔍 Starting trim:', {
    originalLength: text.length,
    normalizedLength: normalized.length,
    trimMode: settings.trimMode,
    trimFromStart: settings.trimFromStart,
  });

  if (settings.trimMode === 'words') {
    if (settings.maxWords > 0) {
      const words = getWords(normalized);
      console.log('[TEXT_TRIM] 📊 Word analysis:', {
        wordCount: words.length,
        maxWords: settings.maxWords,
        needsTrimming: words.length > settings.maxWords,
      });
      if (words.length > settings.maxWords) {
        if (settings.trimFromStart) {
          // Usuń najstarsze słowa od początku (zostaw ostatnie maxWords)
          const trimmed = words.slice(-settings.maxWords).join(' ');
          console.log('[TEXT_TRIM] ✂️ Trimmed from start (kept last words):', {
            removedWords: words.length - settings.maxWords,
            keptWords: settings.maxWords,
            resultLength: trimmed.length,
            result: trimmed,
          });
          return trimmed;
        } else {
          // Usuń najnowsze słowa od końca (zostaw pierwsze maxWords)
          const trimmed = words.slice(0, settings.maxWords).join(' ');
          console.log('[TEXT_TRIM] ✂️ Trimmed from end (kept first words):', {
            removedWords: words.length - settings.maxWords,
            keptWords: settings.maxWords,
            resultLength: trimmed.length,
            result: trimmed,
          });
          return trimmed;
        }
      }
    }
  } else if (settings.trimMode === 'characters') {
    if (settings.maxCharacters > 0 && normalized.length > settings.maxCharacters) {
      console.log('[TEXT_TRIM] 📊 Character analysis:', {
        characterCount: normalized.length,
        maxCharacters: settings.maxCharacters,
        needsTrimming: normalized.length > settings.maxCharacters,
      });
      if (settings.trimFromStart) {
        // Usuń najstarsze znaki od początku (zostaw ostatnie maxCharacters)
        const trimmed = normalized.slice(-settings.maxCharacters);
        console.log('[TEXT_TRIM] ✂️ Trimmed from start (kept last characters):', {
          removedChars: normalized.length - settings.maxCharacters,
          keptChars: settings.maxCharacters,
          result: trimmed,
        });
        return trimmed;
      } else {
        // Usuń najnowsze znaki od końca (zostaw pierwsze maxCharacters)
        const trimmed = normalized.slice(0, settings.maxCharacters);
        console.log('[TEXT_TRIM] ✂️ Trimmed from end (kept first characters):', {
          removedChars: normalized.length - settings.maxCharacters,
          keptChars: settings.maxCharacters,
          result: trimmed,
        });
        return trimmed;
      }
    }
  }

  console.log('[TEXT_TRIM] ✅ No trimming needed - returning normalized text:', {
    length: normalized.length,
    preview: normalized,
  });
  return normalized;
}

/**
 * Konwertuje hex na rgba
 */
export function hexToRgba(hex: string, opacity: number): string {
  const hexMatch = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1], 16);
    const g = parseInt(hexMatch[2], 16);
    const b = parseInt(hexMatch[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hex;
}

/**
 * Generuje text-shadow dla obramowania tekstu
 */
export function getTextShadow(settings: SubtitleSettings): string {
  if (!settings.outlineEnabled || settings.borderWidth === 0) {
    return '';
  }
  const { borderWidth, borderColor } = settings;
  return `${borderWidth}px ${borderWidth}px 0 ${borderColor}, -${borderWidth}px -${borderWidth}px 0 ${borderColor}, ${borderWidth}px -${borderWidth}px 0 ${borderColor}, -${borderWidth}px ${borderWidth}px 0 ${borderColor}`;
}

/**
 * Generuje box-shadow dla cienia
 */
export function getBoxShadow(settings: SubtitleSettings): string {
  if (settings.shadowBlur === 0) {
    return '';
  }
  const { shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor } = settings;
  return `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;
}

/**
 * Generuje kolor tła tekstu
 */
export function getBackgroundColor(settings: SubtitleSettings): string {
  if (settings.backgroundColor === 'transparent' || settings.backgroundOpacity === 0) {
    return 'transparent';
  }
  
  // Sprawdź czy to kolor hex
  const hexMatch = settings.backgroundColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    if (settings.backgroundOpacity < 1) {
      return hexToRgba(settings.backgroundColor, settings.backgroundOpacity);
    }
    return settings.backgroundColor.startsWith('#') ? settings.backgroundColor : `#${settings.backgroundColor}`;
  }
  
  // Jeśli to już rgba/rgb, zwróć jak jest
  if (settings.backgroundColor.startsWith('rgba') || settings.backgroundColor.startsWith('rgb')) {
    return settings.backgroundColor;
  }
  
  return settings.backgroundColor;
}

/**
 * Generuje tło apli (podkładki pod napisami)
 */
export function getApliBackground(settings: SubtitleSettings): string {
  if (!settings.apliEnabled) {
    return 'transparent';
  }

  const color1 = hexToRgba(settings.apliColor, settings.apliOpacity);
  
  if (settings.apliGradientEnabled) {
    const color2 = hexToRgba(settings.apliGradientColor, settings.apliOpacity);
    
    if (settings.apliGradientDirection === 'radial') {
      return `radial-gradient(circle, ${color1}, ${color2})`;
    } else {
      // linear gradient
      return `linear-gradient(${settings.apliGradientAngle}deg, ${color1}, ${color2})`;
    }
  }
  
  return color1;
}

/**
 * Waliduje i normalizuje ustawienia
 */
export function validateSettings(settings: SubtitleSettings): SubtitleSettings {
  const validated = { ...settings };

  // Normalizacja wartości liczbowych
  validated.fontSize = Math.max(12, Math.min(200, validated.fontSize));
  validated.opacity = Math.max(0, Math.min(1, validated.opacity));
  validated.borderWidth = Math.max(0, Math.min(20, validated.borderWidth));
  validated.displayDuration = Math.max(0, Math.min(60, validated.displayDuration));
  validated.fadeOutDuration = Math.max(0, Math.min(10, validated.fadeOutDuration));
  validated.letterDelay = Math.max(10, Math.min(500, validated.letterDelay));
  validated.sequentialWordDelay = Math.max(50, Math.min(2000, validated.sequentialWordDelay));
  validated.scrollSpeed = Math.max(10, Math.min(500, validated.scrollSpeed));
  validated.maxScrollWidth = Math.max(100, Math.min(7680, validated.maxScrollWidth));
  validated.backgroundOpacity = Math.max(0, Math.min(1, validated.backgroundOpacity));
  validated.padding = Math.max(0, Math.min(100, validated.padding));
  validated.lineHeight = Math.max(0.5, Math.min(3, validated.lineHeight));
  validated.letterSpacing = Math.max(-10, Math.min(20, validated.letterSpacing));
  validated.apliOpacity = Math.max(0, Math.min(1, validated.apliOpacity));
  validated.apliRoundness = Math.max(0, Math.min(100, validated.apliRoundness));
  validated.apliPadding = Math.max(0, Math.min(100, validated.apliPadding));
  validated.apliMarginTop = Math.max(0, Math.min(200, validated.apliMarginTop));
  validated.apliMarginRight = Math.max(0, Math.min(200, validated.apliMarginRight));
  validated.apliMarginBottom = Math.max(0, Math.min(200, validated.apliMarginBottom));
  validated.apliMarginLeft = Math.max(0, Math.min(200, validated.apliMarginLeft));
  validated.apliScale = Math.max(0.5, Math.min(10, validated.apliScale));
  validated.maxWords = Math.max(0, Math.min(500, validated.maxWords));
  validated.maxCharacters = Math.max(0, Math.min(2000, validated.maxCharacters));
  validated.autoClearDelay = Math.max(0.5, Math.min(60, validated.autoClearDelay));
  validated.autoScrollMinSpeed = Math.max(10, Math.min(200, validated.autoScrollMinSpeed));
  validated.autoScrollMaxSpeed = Math.max(50, Math.min(500, validated.autoScrollMaxSpeed));
  validated.autoScrollLerpSpeed = Math.max(0.01, Math.min(1, validated.autoScrollLerpSpeed));
  validated.apliGradientAngle = Math.max(0, Math.min(360, validated.apliGradientAngle));

  // Sprawdzenie konfliktów
  // Jeśli letterByLetter jest włączone, displayMode powinien być centered
  if (validated.letterByLetter && validated.animation === 'letter-by-letter') {
    // To jest OK - letterByLetter działa z centered
  }

  // Jeśli displayMode to sequential lub scrolling, letterByLetter nie powinno działać
  if (validated.displayMode === 'sequential' || validated.displayMode === 'scrolling') {
    if (validated.letterByLetter && validated.animation === 'letter-by-letter') {
      // Wyłącz letterByLetter dla sequential/scrolling
      validated.letterByLetter = false;
    }
  }

  return validated;
}
