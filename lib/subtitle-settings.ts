export type Position = 'top' | 'center' | 'bottom';
export type Animation = 'fade' | 'slide' | 'none' | 'letter-by-letter';
export type DisplayMode = 'centered' | 'sequential' | 'scrolling';

export interface SubtitleSettings {
  color: string;
  fontSize: number;
  position: Position;
  animation: Animation;
  fontFamily: string;
  opacity: number;
  borderColor: string;
  borderWidth: number;
  displayDuration: number; // czas wyświetlania w sekundach
  fadeOutDuration: number; // czas zanikania w sekundach
  letterByLetter: boolean; // animacja litera po literze
  displayMode: DisplayMode; // tryb prezentacji: centered lub sequential
  letterDelay: number; // opóźnienie między literami w ms (dla letter-by-letter)
  shadowBlur: number; // rozmycie cienia
  shadowColor: string; // kolor cienia
  shadowOffsetX: number; // przesunięcie cienia X
  shadowOffsetY: number; // przesunięcie cienia Y
  outlineEnabled: boolean; // włącz/wyłącz obramowanie
  backgroundColor: string; // kolor tła napisów
  backgroundOpacity: number; // przezroczystość tła
  padding: number; // padding wokół tekstu
  lineHeight: number; // wysokość linii
  letterSpacing: number; // odstęp między literami
  sequentialWordDelay: number; // opóźnienie między słowami w trybie sequential (ms)
  scrollSpeed: number; // prędkość przewijania w px/s (dla trybu scrolling)
  maxScrollWidth: number; // maksymalna szerokość przed rozpoczęciem przewijania (px)
  autoScrollEnabled: boolean; // włącz automatyczne dostosowanie prędkości przewijania
  autoScrollMinSpeed: number; // minimalna prędkość przy automatycznym przewijaniu (px/s)
  autoScrollMaxSpeed: number; // maksymalna prędkość przy automatycznym przewijaniu (px/s)
  autoScrollLerpSpeed: number; // szybkość lerpowania prędkości (0-1, wyższa = szybsze przejście)
  // Apli (podkładka pod napisami)
  apliEnabled: boolean; // włącz/wyłącz apli
  apliColor: string; // kolor apli
  apliOpacity: number; // przezroczystość apli (0-1)
  apliRoundness: number; // zaokrąglenie rogów apli (px)
  apliGradientEnabled: boolean; // włącz gradient
  apliGradientColor: string; // drugi kolor gradientu
  apliGradientDirection: 'linear' | 'radial'; // kierunek gradientu
  apliGradientAngle: number; // kąt gradientu (stopnie, dla linear)
  apliPadding: number; // margines wewnętrzny apli (px) - odstęp między tekstem a apli
  apliMarginTop: number; // margines zewnętrzny góra (px)
  apliMarginRight: number; // margines zewnętrzny prawo (px)
  apliMarginBottom: number; // margines zewnętrzny dół (px)
  apliMarginLeft: number; // margines zewnętrzny lewo (px)
  apliScale: number; // powiększenie apli względem tekstu (1.0 = 100%, 1.5 = 150% itd.)
  // Kontrola długości tekstu
  textTrimEnabled: boolean; // włącz/wyłącz przycinanie tekstu
  maxWords: number; // maksymalna liczba słów (0 = bez limitu)
  maxCharacters: number; // maksymalna liczba znaków (0 = bez limitu)
  trimMode: 'words' | 'characters'; // sposób przycinania
  trimFromStart: boolean; // true = usuwa od początku (stare słowa), false = usuwa od końca
  smartSplitLimit: number; // limit znaków, po którym szukamy interpunkcji do przełamania (0 = wyłączone)
  // Automatyczne czyszczenie po pauzie
  autoClearEnabled: boolean; // włącz/wyłącz automatyczne czyszczenie po pauzie
  autoClearDelay: number; // czas pauzy w sekundach po którym tekst jest czyszczony
  // Język
  language: string; // język transkrypcji (auto lub kod języka)
}

export const defaultSubtitleSettings: SubtitleSettings = {
  color: '#ffffff',
  fontSize: 48,
  position: 'bottom',
  animation: 'fade',
  fontFamily: 'Arial',
  opacity: 1,
  borderColor: '#000000',
  borderWidth: 2,
  displayDuration: 5,
  fadeOutDuration: 0.5,
  letterByLetter: false,
  displayMode: 'centered',
  letterDelay: 50,
  shadowBlur: 0,
  shadowColor: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  outlineEnabled: true,
  backgroundColor: 'transparent',
  backgroundOpacity: 0,
  padding: 10,
  lineHeight: 1.2,
  letterSpacing: 0,
  sequentialWordDelay: 200,
  scrollSpeed: 50,
  maxScrollWidth: 1920,
  autoScrollEnabled: false,
  autoScrollMinSpeed: 30,
  autoScrollMaxSpeed: 150,
  autoScrollLerpSpeed: 0.1,
  apliEnabled: false,
  apliColor: '#000000',
  apliOpacity: 0.7,
  apliRoundness: 8,
  apliGradientEnabled: false,
  apliGradientColor: '#333333',
  apliGradientDirection: 'linear',
  apliGradientAngle: 90,
  apliPadding: 10,
  apliMarginTop: 0,
  apliMarginRight: 0,
  apliMarginBottom: 0,
  apliMarginLeft: 0,
  apliScale: 1.0,
  textTrimEnabled: true,
  maxWords: 20,
  maxCharacters: 0,
  trimMode: 'words',
  trimFromStart: true,
  smartSplitLimit: 0,
  autoClearEnabled: true,
  autoClearDelay: 3,
  language: 'auto',
};

export const languageOptions = [
  { value: 'auto', label: 'Automatic (Auto)' },
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'hi', label: 'Hindi' },
];

export const fontOptions = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact',
  'Lucida Console',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Raleway',
  'Poppins',
  'Oswald',
  'Source Sans Pro',
  'Playfair Display',
  'Merriweather',
  'Ubuntu',
  'Dancing Script',
  'Pacifico',
  'Bebas Neue',
  'Futura',
  'Gill Sans',
  'Tahoma',
  'Calibri',
  'Century Gothic',
  'Franklin Gothic Medium',
  'Book Antiqua',
  'Cambria',
  'Consolas',
  'Monaco',
  'Menlo',
  'Courier',
  'Lucida Sans Unicode',
  'Segoe UI',
];
