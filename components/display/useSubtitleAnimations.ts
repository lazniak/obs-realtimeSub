import { useState, useEffect, useRef, useMemo } from 'react';
import { SubtitleSettings } from '@/lib/subtitle-settings';
import { normalizeText, trimText, getWords, findNewTextSegment, isHallucination, isPunctuationOnly, removeLeadingPunctuation } from '@/lib/subtitle-utils';

// --- Helper Hooks ---

export function useTextTrimming(text: string, settings: SubtitleSettings): string {
  const trimmed = trimText(text, settings);
  return trimmed;
}

/**
 * Zintegrowany hook zarządzający całym flow napisów (Lifecycle + LetterByLetter + Sequential).
 */
export function useSmartSubtitleFlow(
  rawInputText: string,
  settings: SubtitleSettings,
  lastUpdateTimestamp: number | undefined,
  onClearExternal: (() => void) | undefined
) {
  type Phase = 'IDLE' | 'PRINTING' | 'WAITING' | 'FADING';

  // --- State ---
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [visibleText, setVisibleText] = useState<string>('');
  const [opacity, setOpacity] = useState<number>(0);
  
  // --- Refs ---
  const committedHistoryRef = useRef<string>(''); 
  const targetTextRef = useRef<string>(''); 
  
  // Animation State
  const animationIndexRef = useRef<number>(0); // Dla letter-by-letter (index znaku) ORAZ sequential (index słowa)
  
  const printingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearAllTimers = () => {
    if (printingIntervalRef.current) clearInterval(printingIntervalRef.current);
    if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    printingIntervalRef.current = null;
    displayTimerRef.current = null;
    fadeTimerRef.current = null;
  };

  const startFadingOut = () => {
    console.log('[FLOW] 🌅 Timer expired -> Fading out');
    setPhase('FADING');
    setOpacity(0);
    
    const duration = (settings.fadeOutDuration > 0 ? settings.fadeOutDuration : 0.1) * 1000;
    fadeTimerRef.current = setTimeout(() => {
      console.log('[FLOW] 🏁 Fade complete -> Committing text to history');
      setPhase('IDLE');
      // Dodajemy aktualnie wyświetlony tekst do historii
      committedHistoryRef.current += targetTextRef.current;
      
      setVisibleText('');
      targetTextRef.current = '';
      animationIndexRef.current = 0;
      if (onClearExternal) onClearExternal();
    }, duration);
  };

  const startDisplayTimer = () => {
    if (settings.displayDuration <= 0) return;
    
    console.log('[FLOW] ⏱️ Animation finished -> Starting display timer:', settings.displayDuration, 's');
    setPhase('WAITING');
    
    if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    displayTimerRef.current = setTimeout(() => {
      startFadingOut();
    }, settings.displayDuration * 1000);
  };

  // --- Effect: Input Processing ---
  useEffect(() => {
    if (!rawInputText) return;

    // FILTER HALLUCINATIONS
    // Używamy fuzzy matchingu do znalezienia nowej treści
    let effectiveText = findNewTextSegment(committedHistoryRef.current, rawInputText);
    
    // Filtrujemy nową część
    if (isHallucination(effectiveText)) {
        console.log('[FLOW] 🚫 Ignored hallucination update:', effectiveText);
        return;
    }
    
    // Jeśli jesteśmy w IDLE i dostajemy tylko interpunkcję (np. kropkę) to ignorujemy
    // Zapobiega to wyświetlaniu samej kropki/spacji po zniknięciu napisu
    if (phase === 'IDLE' && isPunctuationOnly(effectiveText)) {
       console.log('[FLOW] 🙈 Ignored punctuation-only update in IDLE phase:', effectiveText);
       return;
    }

    // Jeśli otrzymaliśmy pusty string (brak nowej treści) i nie jest to całkowicie nowy tekst
    // (czyli rawInputText == committedHistoryRef), to ignorujemy
    if (!effectiveText && rawInputText.length > 0 && phase !== 'IDLE') {
         // Może się zdarzyć, że API wyśle update, który nic nie zmienia
         return;
    }

    // Jeśli effectiveText jest identyczny jak rawInputText, oznacza to, że
    // nie znaleziono dopasowania w historii (nowe zdanie lub duża zmiana)
    // W takim przypadku resetujemy historię
    if (effectiveText === rawInputText && committedHistoryRef.current.length > 0) {
        // Sprawdź czy to nie jest po prostu pusta historia (np. po F5)
        console.log('[FLOW] 🔄 New independent sequence detected (or history mismatch) -> Resetting history');
        committedHistoryRef.current = '';
    }

    // CLEANUP: ZAWSZE usuwamy wiodącą interpunkcję z nowego segmentu
    const cleanText = removeLeadingPunctuation(effectiveText);
    if (cleanText !== effectiveText) {
        effectiveText = cleanText;
    }

    // Jeśli po wyczyszczeniu tekst jest pusty
    if (!effectiveText) {
        if (phase === 'IDLE' || committedHistoryRef.current.length === 0) {
             return;
        }
    }

    if (effectiveText === targetTextRef.current) {
      return;
    }

    if (phase === 'FADING') {
       console.log('[FLOW] ⚡ New text during FADE -> Hard cut to new text');
       clearAllTimers();
       
       // Commitujemy to, co zanikało
       committedHistoryRef.current += targetTextRef.current;
       
       // Ponownie obliczamy effectiveText względem zaktualizowanej historii
       effectiveText = findNewTextSegment(committedHistoryRef.current, rawInputText);
       
       // CLEANUP (Ponownie): Czyszczenie po przeliczeniu
       effectiveText = removeLeadingPunctuation(effectiveText);
       
       // Filtrujemy (ponownie, bo kontekst się zmienił)
       if (isHallucination(effectiveText) || !effectiveText) {
           // Jeśli po update zostaje tylko interpunkcja/nic, kończymy fade i idziemy do IDLE
           console.log('[FLOW] 🚫 Ignored hallucination/empty during fade interrupt');
           setPhase('IDLE');
           setVisibleText('');
           targetTextRef.current = '';
           if (onClearExternal) onClearExternal();
           return;
       }
       
       // Jeśli po commicie okazuje się, że nie ma nic nowego (bo update był tylko powtórzeniem tego co znika),
       // to effectiveText będzie pusty.
       // Ale jeśli to jest zupełnie nowe zdanie, to effectiveText = rawInputText.
       if (effectiveText === rawInputText) {
           committedHistoryRef.current = '';
       }

       // CLEANUP (Ponownie): Jeśli resetujemy historię, usuń interpunkcję
       if (committedHistoryRef.current.length === 0) {
          const cleanText = removeLeadingPunctuation(effectiveText);
          if (cleanText !== effectiveText) {
             console.log('[FLOW] 🧹 Removed leading punctuation (during fade cut):', { original: effectiveText, cleaned: cleanText });
             effectiveText = cleanText;
             
             // Po usunięciu znaków, tekst może być pusty - wtedy nie wyświetlamy
             if (!effectiveText) {
                 console.log('[FLOW] 🛑 Text became empty after cleanup - returning to IDLE');
                 setPhase('IDLE');
                 setVisibleText('');
                 targetTextRef.current = '';
                 if (onClearExternal) onClearExternal();
                 return;
             }
          }
       }
       
       setPhase('PRINTING');
       setOpacity(settings.opacity);
       targetTextRef.current = effectiveText;
       setVisibleText(''); // Start fresh
       animationIndexRef.current = 0;
    } 
    else {
       console.log('[FLOW] 📝 Update received. Target:', effectiveText);
       
       if (phase === 'WAITING') {
         console.log('[FLOW] ⏸️ Waiting interrupted -> Back to PRINTING');
         if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
         setPhase('PRINTING');
       }
       
       if (phase === 'IDLE') {
          setPhase('PRINTING');
          setOpacity(settings.opacity);
       }

       targetTextRef.current = effectiveText;
       // Animation loop will handle the update
    }

  }, [rawInputText, settings.opacity, settings.displayDuration, settings.fadeOutDuration]);

  // --- Effect: Animation Loop (Unified Writer) ---
  useEffect(() => {
    if (phase !== 'PRINTING') return;

    // 1. Tryb natychmiastowy (brak animacji)
    const isLetterMode = settings.letterByLetter && settings.animation === 'letter-by-letter';
    const isSequentialMode = settings.displayMode === 'sequential';
    
    // Jeśli żaden tryb animacji nie jest aktywny -> pokaż od razu
    if (!isLetterMode && !isSequentialMode) {
       setVisibleText(targetTextRef.current);
       animationIndexRef.current = targetTextRef.current.length;
       startDisplayTimer();
       return;
    }

    if (printingIntervalRef.current) clearInterval(printingIntervalRef.current);

    // 2. Tryb Sekwencyjny (Słowo po słowie)
    if (isSequentialMode) {
        const words = getWords(targetTextRef.current);
        // animationIndexRef is now word index
        
        printingIntervalRef.current = setInterval(() => {
            const currentIdx = animationIndexRef.current;
            
            if (currentIdx < words.length) {
                animationIndexRef.current += 1;
                setVisibleText(words.slice(0, animationIndexRef.current).join(' '));
            } else if (currentIdx > words.length) {
                // Correction (words removed)
                animationIndexRef.current = words.length;
                setVisibleText(targetTextRef.current);
            } else {
                if (printingIntervalRef.current) clearInterval(printingIntervalRef.current);
                startDisplayTimer();
            }
        }, settings.sequentialWordDelay);
    } 
    // 3. Tryb Letter-by-Letter
    else {
        printingIntervalRef.current = setInterval(() => {
            const target = targetTextRef.current;
            const currentLen = animationIndexRef.current;

            if (currentLen < target.length) {
                animationIndexRef.current += 1;
                setVisibleText(target.slice(0, animationIndexRef.current));
            } else if (currentLen > target.length) {
                animationIndexRef.current = target.length;
                setVisibleText(target);
            } else {
                if (printingIntervalRef.current) clearInterval(printingIntervalRef.current);
                startDisplayTimer();
            }
        }, settings.letterDelay);
    }

    return () => {
      if (printingIntervalRef.current) clearInterval(printingIntervalRef.current);
    };
  }, [phase, settings.letterByLetter, settings.animation, settings.displayMode, settings.letterDelay, settings.sequentialWordDelay, settings.displayDuration, targetTextRef.current]); 
  // Added targetTextRef.current to deps to restart animation on text change

  // --- Effect: Auto-Clear Safety (Removed as per user request - redundant with displayDuration) ---
  // useEffect(() => {
  //   if (!settings.autoClearEnabled || settings.autoClearDelay <= 0) return;
  //
  //   if (lastUpdateTimestamp) {
  //       lastInputTimestampRef.current = lastUpdateTimestamp;
  //   }
  //
  //   autoClearIntervalRef.current = setInterval(() => {
  //     if (phase === 'IDLE' || phase === 'FADING') return;
  //
  //     const timeSinceInput = (Date.now() - lastInputTimestampRef.current) / 1000;
  //     
  //     if (timeSinceInput >= settings.autoClearDelay) {
  //        console.log('[FLOW] 🛑 Auto-clear triggered (silence)');
  //        clearAllTimers();
  //        startFadingOut();
  //     }
  //   }, 500);
  //
  //   return () => {
  //     if (autoClearIntervalRef.current) clearInterval(autoClearIntervalRef.current);
  //   };
  // }, [settings.autoClearEnabled, settings.autoClearDelay, phase, lastUpdateTimestamp]);

  return {
    text: visibleText,
    opacity,
    phase,
    isFadingOut: phase === 'FADING'
  };
}

// --- Placeholders ---
export function useScrollingAnimation(
  text: string,
  settings: SubtitleSettings,
  containerRef: React.RefObject<HTMLDivElement>,
  textRef: React.RefObject<HTMLDivElement>
): number {
  const [offset, setOffset] = useState(0);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    setOffset(0);
    lastTimeRef.current = 0;
  }, [text, settings.displayMode]);

  useEffect(() => {
    if (settings.displayMode !== 'scrolling' || !text) return;

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const deltaTime = time - lastTimeRef.current;
      const moveAmount = settings.scrollSpeed * (deltaTime / 1000);
      
      setOffset(prev => prev - moveAmount);
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [text, settings.displayMode, settings.scrollSpeed]);

  return offset;
}

export function useSubtitleLifecycle(rawText: string, settings: SubtitleSettings, ts: number | undefined, cb: any) {
    return useSmartSubtitleFlow(rawText, settings, ts, cb);
}

export function useLetterByLetterAnimation(text: string, settings: SubtitleSettings) {
    return text; 
}

export function useSequentialAnimation(text: string, settings: SubtitleSettings) {
    return text; 
}
