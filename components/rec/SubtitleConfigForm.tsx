'use client';

import { useState, useEffect, useRef } from 'react';
import {
  SubtitleSettings,
  defaultSubtitleSettings,
  fontOptions,
  languageOptions,
  Position,
  Animation,
  DisplayMode,
} from '@/lib/subtitle-settings';

interface SubtitleConfigFormProps {
  settings: SubtitleSettings;
  onSettingsChange: (settings: SubtitleSettings) => void;
}

export default function SubtitleConfigForm({
  settings,
  onSettingsChange,
}: SubtitleConfigFormProps) {
  const [localSettings, setLocalSettings] =
    useState<SubtitleSettings>(settings);
  const [activeTab, setActiveTab] = useState<'basic' | 'timing' | 'advanced'>('basic');
  const [mounted, setMounted] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    setLocalSettings(settings);
  }, [settings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Funkcja pomocnicza do bezpiecznego dostępu do wartości (zapobiega błędom hydratacji)
  const getValue = <K extends keyof SubtitleSettings>(key: K): SubtitleSettings[K] => {
    return mounted ? localSettings[key] : settings[key];
  };

  const handleChange = (field: keyof SubtitleSettings, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    
    // Debounce wywołania onSettingsChange - czekaj 150ms przed wysłaniem
    // To zapobiega bombardowaniu przy przesuwaniu sliderów
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      onSettingsChange(newSettings);
    }, 150); // Debounce 150ms
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(localSettings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subtitle-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting settings:', error);
      alert('Error exporting settings');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const imported = JSON.parse(content);
          // Merge with defaults to ensure all fields exist
          const mergedSettings = { ...defaultSubtitleSettings, ...imported };
          setLocalSettings(mergedSettings);
          onSettingsChange(mergedSettings);
          alert('Settings imported successfully');
        } catch (error) {
          console.error('Error importing settings:', error);
          alert('Error importing settings. Check file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Subtitle Settings</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'basic'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveTab('timing')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'timing'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Timing & Animations
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'advanced'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Basic Tab */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Język */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Source Language (Audio)</label>
                <select
                  value={localSettings.language || 'auto'}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Specifies the source language of the audio. The API does not translate - it only transcribes in the detected/explicitly specified source language. 
                  Select "Automatic" for automatic language detection.
                </p>
              </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Text Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-16 h-10 rounded border"
              />
              <input
                type="text"
                value={localSettings.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Font Size: {getValue('fontSize')}px
            </label>
            <input
              type="range"
              min="24"
              max="120"
              value={getValue('fontSize')}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Position</label>
            <select
              value={localSettings.position}
              onChange={(e) => handleChange('position', e.target.value as Position)}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>

          {/* Display Mode */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Display Mode</label>
            <select
              value={localSettings.displayMode}
              onChange={(e) => handleChange('displayMode', e.target.value as DisplayMode)}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
            >
              <option value="centered">Centered</option>
              <option value="sequential">Sequential (from left)</option>
              <option value="scrolling">Scrolling</option>
            </select>
          </div>

          {/* Delay Between Words (sequential) */}
          {mounted && localSettings.displayMode === 'sequential' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">
                Delay Between Words: {getValue('sequentialWordDelay')}ms
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={getValue('sequentialWordDelay')}
                onChange={(e) => handleChange('sequentialWordDelay', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Scroll Speed (scrolling) */}
          {mounted && localSettings.displayMode === 'scrolling' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Scroll Speed: {getValue('scrollSpeed')}px/s
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={getValue('scrollSpeed')}
                  onChange={(e) => handleChange('scrollSpeed', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used when automatic scrolling is disabled
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Max Width Before Scrolling: {getValue('maxScrollWidth')}px
                </label>
                <input
                  type="range"
                  min="500"
                  max="3840"
                  step="100"
                  value={getValue('maxScrollWidth')}
                  onChange={(e) => handleChange('maxScrollWidth', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Separator dla automatycznego przewijania */}
              <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
                <h4 className="text-md font-semibold text-gray-300 mb-4">Automatic Scrolling</h4>
              </div>

              {/* Włącz/Wyłącz automatyczne przewijanie */}
              <div className="flex items-center col-span-full">
                <input
                  type="checkbox"
                  id="autoScrollEnabled"
                  checked={localSettings.autoScrollEnabled}
                  onChange={(e) => handleChange('autoScrollEnabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoScrollEnabled" className="ml-2 text-sm font-medium text-gray-200">
                  Enable automatic speed adjustment (adjusts to text length)
                </label>
              </div>

              {/* Ustawienia automatycznego przewijania */}
              {mounted && localSettings.autoScrollEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">
                      Minimum Speed: {getValue('autoScrollMinSpeed')}px/s
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={getValue('autoScrollMinSpeed')}
                      onChange={(e) => handleChange('autoScrollMinSpeed', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Speed for short texts
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">
                      Maximum Speed: {getValue('autoScrollMaxSpeed')}px/s
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      step="10"
                      value={getValue('autoScrollMaxSpeed')}
                      onChange={(e) => handleChange('autoScrollMaxSpeed', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Speed for long texts
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">
                      Transition Speed (lerp): {Math.round(getValue('autoScrollLerpSpeed') * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={getValue('autoScrollLerpSpeed')}
                      onChange={(e) => handleChange('autoScrollLerpSpeed', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Higher value = faster transition between speeds
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Font */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Font</label>
            <select
              value={localSettings.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Opacity: {Math.round(getValue('opacity') * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={getValue('opacity')}
              onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Border Color */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Border Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.borderColor}
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="w-16 h-10 rounded border"
              />
              <input
                type="text"
                value={localSettings.borderColor}
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Border Width */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Border Width: {getValue('borderWidth')}px
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={getValue('borderWidth')}
              onChange={(e) =>
                handleChange('borderWidth', parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          {/* Włącz/Wyłącz obramowanie */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="outlineEnabled"
              checked={localSettings.outlineEnabled}
              onChange={(e) => handleChange('outlineEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="outlineEnabled" className="ml-2 text-sm font-medium text-gray-200">
              Enable Border
            </label>
          </div>

          {/* Separator dla apli */}
          <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
            <h3 className="text-lg font-semibold text-white mb-4">Background Plate (Underlay)</h3>
          </div>

          {/* Włącz/Wyłącz apli */}
          <div className="flex items-center col-span-full">
            <input
              type="checkbox"
              id="apliEnabled"
              checked={localSettings.apliEnabled}
              onChange={(e) => handleChange('apliEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="apliEnabled" className="ml-2 text-sm font-medium text-gray-200">
              Enable Background Plate
            </label>
          </div>

          {/* Background Plate Color */}
          {mounted && localSettings.apliEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Background Plate Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.apliColor}
                    onChange={(e) => handleChange('apliColor', e.target.value)}
                    className="w-16 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={localSettings.apliColor}
                    onChange={(e) => handleChange('apliColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Opacity apli */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Opacity apli: {Math.round(getValue('apliOpacity') * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={getValue('apliOpacity')}
                  onChange={(e) => handleChange('apliOpacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Corner Roundness apli */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Corner Roundness: {getValue('apliRoundness')}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={getValue('apliRoundness')}
                  onChange={(e) => handleChange('apliRoundness', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Włącz/Wyłącz gradient apli */}
              <div className="flex items-center col-span-full">
                <input
                  type="checkbox"
                  id="apliGradientEnabled"
                  checked={localSettings.apliGradientEnabled}
                  onChange={(e) => handleChange('apliGradientEnabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="apliGradientEnabled" className="ml-2 text-sm font-medium text-gray-200">
                  Enable Gradient
                </label>
              </div>

              {/* Gradient - kolor i kierunek */}
              {mounted && localSettings.apliGradientEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">Second Gradient Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={localSettings.apliGradientColor}
                        onChange={(e) => handleChange('apliGradientColor', e.target.value)}
                        className="w-16 h-10 rounded border"
                      />
                      <input
                        type="text"
                        value={localSettings.apliGradientColor}
                        onChange={(e) => handleChange('apliGradientColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">Gradient Direction</label>
                    <select
                      value={localSettings.apliGradientDirection}
                      onChange={(e) => handleChange('apliGradientDirection', e.target.value as 'linear' | 'radial')}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                    </select>
                  </div>

                  {/* Gradient Angle (tylko dla linear) */}
                  {localSettings.apliGradientDirection === 'linear' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-200">
                        Gradient Angle: {localSettings.apliGradientAngle}°
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={localSettings.apliGradientAngle}
                        onChange={(e) => handleChange('apliGradientAngle', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Separator dla marginesów apli */}
              <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
                <h4 className="text-md font-semibold text-gray-300 mb-4">Size and Margins</h4>
              </div>

              {/* Background Plate Scale względem tekstu */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Background Plate Scale: {Math.round(getValue('apliScale') * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.1"
                  value={getValue('apliScale')}
                  onChange={(e) => handleChange('apliScale', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  100% = normal size, 150% = 50% larger, 200% = 2x larger
                </p>
              </div>

              {/* Padding apli (margines wewnętrzny) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Padding (Internal Margin): {getValue('apliPadding')}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={getValue('apliPadding')}
                  onChange={(e) => handleChange('apliPadding', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">Spacing between text and background plate</p>
              </div>

              {/* Marginy zewnętrzne */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Margin góra: {getValue('apliMarginTop')}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={getValue('apliMarginTop')}
                  onChange={(e) => handleChange('apliMarginTop', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Margin prawo: {getValue('apliMarginRight')}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={getValue('apliMarginRight')}
                  onChange={(e) => handleChange('apliMarginRight', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Margin dół: {getValue('apliMarginBottom')}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={getValue('apliMarginBottom')}
                  onChange={(e) => handleChange('apliMarginBottom', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Margin lewo: {getValue('apliMarginLeft')}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={getValue('apliMarginLeft')}
                  onChange={(e) => handleChange('apliMarginLeft', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Timing Tab */}
      {activeTab === 'timing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display Duration */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Display Duration: {getValue('displayDuration')}s
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={getValue('displayDuration')}
              onChange={(e) => handleChange('displayDuration', parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">0 = no time limit</p>
          </div>

          {/* Fade Out Duration */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Fade Out Duration: {getValue('fadeOutDuration')}s
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={getValue('fadeOutDuration')}
              onChange={(e) => handleChange('fadeOutDuration', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Animation */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Animation</label>
            <select
              value={localSettings.animation}
              onChange={(e) =>
                handleChange('animation', e.target.value as Animation)
              }
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="letter-by-letter">Letter by Letter</option>
            </select>
          </div>

          {/* Animation litera po literze */}
          {mounted && localSettings.animation === 'letter-by-letter' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">
                Delay Between Letters: {getValue('letterDelay')}ms
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={getValue('letterDelay')}
                onChange={(e) => handleChange('letterDelay', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Włącz/Wyłącz animację litera po literze */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="letterByLetter"
              checked={localSettings.letterByLetter}
              onChange={(e) => handleChange('letterByLetter', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="letterByLetter" className="ml-2 text-sm font-medium text-gray-200">
              Animation litera po literze (wymaga animacji "letter-by-letter")
            </label>
          </div>

          {/* Separator dla kontroli długości tekstu */}
          <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
            <h3 className="text-lg font-semibold text-white mb-4">Text Length Control</h3>
          </div>

          {/* Włącz/Wyłącz przycinanie tekstu */}
          <div className="flex items-center col-span-full">
            <input
              type="checkbox"
              id="textTrimEnabled"
              checked={localSettings.textTrimEnabled}
              onChange={(e) => handleChange('textTrimEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="textTrimEnabled" className="ml-2 text-sm font-medium text-gray-200">
              Enable Text Trimming (removes old words)
            </label>
          </div>

          {/* Ustawienia przycinania */}
          {mounted && localSettings.textTrimEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Trim Mode</label>
                <select
                  value={localSettings.trimMode}
                  onChange={(e) => handleChange('trimMode', e.target.value as 'words' | 'characters')}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                >
                  <option value="words">By Words</option>
                  <option value="characters">By Characters</option>
                </select>
              </div>

              {/* Maximum Number of Words */}
              {localSettings.trimMode === 'words' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    Maximum Number of Words: {getValue('maxWords')} (0 = bez limitu)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={getValue('maxWords')}
                    onChange={(e) => handleChange('maxWords', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Maximum Number of Characters */}
              {localSettings.trimMode === 'characters' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    Maximum Number of Characters: {getValue('maxCharacters')} (0 = bez limitu)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={getValue('maxCharacters')}
                    onChange={(e) => handleChange('maxCharacters', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Kierunek przycinania */}
              <div className="flex items-center col-span-full">
                <input
                  type="checkbox"
                  id="trimFromStart"
                  checked={localSettings.trimFromStart}
                  onChange={(e) => handleChange('trimFromStart', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="trimFromStart" className="ml-2 text-sm font-medium text-gray-200">
                  Remove from Start (old words) - if disabled, removes from end
                </label>
              </div>
            </>
          )}

        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cień - Rozmycie */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Shadow Blur: {getValue('shadowBlur')}px
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={getValue('shadowBlur')}
              onChange={(e) => handleChange('shadowBlur', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Cień - Kolor */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Shadow Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.shadowColor}
                onChange={(e) => handleChange('shadowColor', e.target.value)}
                className="w-16 h-10 rounded border"
              />
              <input
                type="text"
                value={localSettings.shadowColor}
                onChange={(e) => handleChange('shadowColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Cień - Przesunięcie X */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Shadow Offset X: {getValue('shadowOffsetX')}px
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              value={getValue('shadowOffsetX')}
              onChange={(e) => handleChange('shadowOffsetX', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Cień - Przesunięcie Y */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Shadow Offset Y: {getValue('shadowOffsetY')}px
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              value={getValue('shadowOffsetY')}
              onChange={(e) => handleChange('shadowOffsetY', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Tło - Kolor */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.backgroundColor === 'transparent' ? '#000000' : localSettings.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                className="w-16 h-10 rounded border"
              />
              <input
                type="text"
                value={localSettings.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                placeholder="transparent"
                className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Tło - Opacity */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Opacity tła: {Math.round(getValue('backgroundOpacity') * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={getValue('backgroundOpacity')}
              onChange={(e) => handleChange('backgroundOpacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Padding */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Padding: {getValue('padding')}px
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={getValue('padding')}
              onChange={(e) => handleChange('padding', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Line Height: {getValue('lineHeight')}
            </label>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={getValue('lineHeight')}
              onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Letter Spacing: {getValue('letterSpacing')}px
            </label>
            <input
              type="range"
              min="-5"
              max="10"
              step="0.5"
              value={getValue('letterSpacing')}
              onChange={(e) => handleChange('letterSpacing', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Przyciski akcji */}
      <div className="pt-4 border-t border-gray-700 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setLocalSettings(defaultSubtitleSettings);
            onSettingsChange(defaultSubtitleSettings);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          Export Settings
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
        >
          Import Settings
        </button>
      </div>
    </div>
  );
}
