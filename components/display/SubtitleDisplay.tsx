'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SubtitleSettings } from '@/lib/subtitle-settings';
import { validateSettings, getTextShadow, getBoxShadow, getBackgroundColor, getApliBackground } from '@/lib/subtitle-utils';
import {
  useTextTrimming,
  useSubtitleLifecycle,
  useLetterByLetterAnimation,
  useSequentialAnimation,
  useScrollingAnimation,
} from './useSubtitleAnimations';

interface SubtitleDisplayProps {
  text: string;
  settings: SubtitleSettings;
  lastUpdateTimestamp?: number;
  onClear?: () => void;
}

export default function SubtitleDisplay({
  text,
  settings,
  lastUpdateTimestamp,
  onClear: onClearProp,
}: SubtitleDisplayProps) {
  
  // 1. Walidacja ustawień
  const validatedSettings = useMemo(() => validateSettings(settings), [settings]);

  // 2. Przygotowanie tekstu
  // UWAGA: Nie trimujemy tekstu PRZED przekazaniem do cyklu życia.
  // useSubtitleLifecycle musi widzieć pełną historię, żeby poprawnie wykrywać zmiany.
  // Trimming aplikujemy dopiero do tekstu, który ma zostać wyświetlony.

  // 3. CENTRALNE ZARZĄDZANIE CYKLEM ŻYCIA
  // To jest serce nowego algorytmu. Decyduje co wyświetlać i z jaką przezroczystością.
  const { 
    text: lifecycleText, // Tekst, który ma być wyświetlony (animowany)
    opacity,             // Przezroczystość (0 lub 1, CSS transition robi resztę)
    phase,               // Faza: IDLE, VISIBLE, FADING_OUT
    isFadingOut          // Czy aktualnie znika
  } = useSubtitleLifecycle(
    text, // Przekazujemy PEŁNY tekst, nie przycięty
    validatedSettings, 
    lastUpdateTimestamp, 
    onClearProp
  );

  // 4. Aplikacja trimmingu do tekstu wyjściowego
  // Dzięki temu animacja "pisania" działa na pełnym tekście, a użytkownik widzi "okno" (jeśli trim włączony)
  const trimmedDisplayText = useTextTrimming(lifecycleText, validatedSettings);

  // 5. Animacje dodatkowe (tylko transformacja string -> offset/inne)
  
  // Refs dla scrolla
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll potrzebuje oryginalnej logiki
  const scrollOffset = useScrollingAnimation(trimmedDisplayText, validatedSettings, containerRef, textRef); 

  // 6. Wybór ostatecznego tekstu do wyświetlenia
  const finalDisplayText = useMemo(() => {
    // W obecnej architekturze useSubtitleLifecycle (useSmartSubtitleFlow) obsługuje już 
    // animacje letter-by-letter i sequential wewnętrznie.
    // Więc po prostu zwracamy przycięty tekst z cyklu życia.
    return trimmedDisplayText;
  }, [trimmedDisplayText]);

  // 6. Style
  const positionStyles = useMemo(() => {
    const { position, apliMarginTop, apliMarginRight, apliMarginBottom, apliMarginLeft, apliScale } = validatedSettings;
    const isLeftAligned = ['sequential', 'scrolling'].includes(validatedSettings.displayMode);

    const baseStyles: React.CSSProperties = {};
    
    // Pozycja Y
    if (position === 'top') baseStyles.top = `${10 + apliMarginTop * apliScale}px`;
    else if (position === 'bottom') baseStyles.bottom = `${10 + apliMarginBottom * apliScale}px`;
    else baseStyles.top = '50%'; // Center Y

    // Pozycja X
    if (isLeftAligned) {
        baseStyles.left = `${5 + apliMarginLeft * apliScale}%`;
        baseStyles.right = `${5 + apliMarginRight * apliScale}%`;
    } else {
        baseStyles.left = '50%';
    }

    // Transform
    let transform = '';
    if (position === 'center') transform += 'translateY(-50%) ';
    if (!isLeftAligned) transform += 'translateX(-50%) ';
    
    baseStyles.transform = transform.trim();
    
    return baseStyles;
  }, [validatedSettings]);

  const containerStyles = useMemo((): React.CSSProperties => {
    // Kluczowa zmiana: Transition jest ZAWSZE włączony dla opacity
    // Czas trwania zależy od tego czy znikamy czy się pojawiamy
    const transitionDuration = isFadingOut 
      ? (validatedSettings.fadeOutDuration > 0 ? validatedSettings.fadeOutDuration : 0.01) 
      : 0.1; // Szybkie pojawienie się

    return {
      position: 'absolute',
      opacity: opacity,
      transition: `opacity ${transitionDuration}s ease-in-out`, // CSS transition robi całą robotę
      
      padding: `${validatedSettings.padding * validatedSettings.apliScale}px`,
      zIndex: 1000,
      backgroundColor: getBackgroundColor(validatedSettings),
      borderRadius: `${validatedSettings.apliRoundness * validatedSettings.apliScale}px`,
      overflow: 'hidden',
      ...(validatedSettings.displayMode === 'scrolling' && {
        width: `calc(100% - ${validatedSettings.padding * 2 * validatedSettings.apliScale}px)`,
        maxWidth: `${validatedSettings.maxScrollWidth}px`,
      }),
      ...positionStyles,
    };
  }, [validatedSettings, opacity, isFadingOut, positionStyles]);

  const textStyles = useMemo((): React.CSSProperties => {
    return {
      color: validatedSettings.color,
      fontSize: `${validatedSettings.fontSize}px`,
      fontFamily: validatedSettings.fontFamily,
      textShadow: getTextShadow(validatedSettings),
      boxShadow: getBoxShadow(validatedSettings),
      textAlign: ['sequential', 'scrolling'].includes(validatedSettings.displayMode) ? 'left' : 'center',
      whiteSpace: ['sequential', 'scrolling'].includes(validatedSettings.displayMode) ? 'nowrap' : 'pre-wrap',
      wordWrap: ['sequential', 'scrolling'].includes(validatedSettings.displayMode) ? 'normal' : 'break-word',
      lineHeight: validatedSettings.lineHeight,
      letterSpacing: `${validatedSettings.letterSpacing}px`,
      display: 'inline-block',
      ...(validatedSettings.displayMode === 'scrolling' && {
        transform: `translateX(${scrollOffset}px)`,
        willChange: 'transform',
      }),
    };
  }, [validatedSettings, scrollOffset]);

  const apliStyles = useMemo((): React.CSSProperties => {
    const scale = validatedSettings.apliScale;
    return {
      position: 'absolute',
      top: -validatedSettings.apliMarginTop * scale,
      left: -validatedSettings.apliMarginLeft * scale,
      right: -validatedSettings.apliMarginRight * scale,
      bottom: -validatedSettings.apliMarginBottom * scale,
      backgroundColor: getApliBackground(validatedSettings),
      borderRadius: `${validatedSettings.apliRoundness * scale}px`,
      zIndex: -1,
      pointerEvents: 'none',
    };
  }, [validatedSettings]);

  // Debug
  useEffect(() => {
    if (phase !== 'IDLE') {
      console.log(`[DISPLAY] 🎥 Phase: ${phase}, Text: "${finalDisplayText}", Opacity: ${opacity}`);
    }
  }, [phase, finalDisplayText, opacity]);

  // Render
  if (phase === 'IDLE' && !isFadingOut) return null; // Nie renderuj jeśli nic nie ma i nie znika

  return (
    <div ref={containerRef} style={containerStyles}>
      {validatedSettings.apliEnabled && <div style={apliStyles} />}
      <div ref={textRef} style={textStyles}>
        {finalDisplayText}
      </div>
    </div>
  );
}
