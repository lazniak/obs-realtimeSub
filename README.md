# OBS Realtime Subtitle Generator

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)

A powerful web application for generating real-time subtitles using **ElevenLabs Scribe-v2** realtime speech-to-text API. Perfect for live streaming, recording, and content creation with OBS Studio integration.

## ✨ Features

- 🎤 **Real-time Speech-to-Text** - Live transcription using ElevenLabs Scribe-v2 API
- 🎨 **Highly Customizable Subtitles** - Full control over appearance, animations, and positioning
- 📹 **OBS Studio Integration** - Synchronized recording with OBS via WebSocket
- 📝 **SRT Export** - Export transcripts with accurate timestamps for video editing
- 🌐 **Multi-language Support** - Automatic language detection or manual selection
- 🎬 **Live Display Client** - Separate display page for OBS Browser Source integration
- ⚡ **Real-time Updates** - WebSocket-based communication for instant subtitle updates

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **ElevenLabs API Key** ([Get one here](https://elevenlabs.io))
- **OBS Studio** (optional, for recording integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lazniak/obs-realtimeSub.git
   cd obs-realtimeSub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   ELEVENLABS_API_KEY=your_api_key_here
   ```
   
   Optional OBS WebSocket configuration:
   ```env
   OBS_WEBSOCKET_ADDRESS=localhost:4455
   OBS_WEBSOCKET_PASSWORD=your_obs_password
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Configuration & Recording: `http://localhost:4639/rec`
   - Subtitle Display: `http://localhost:4639/display`

## 📖 Usage Guide

### Basic Workflow

1. **Open the Recording Panel** (`/rec`)
   - Configure subtitle appearance, colors, fonts, and animations
   - Adjust timing and display settings
   - Set source language (or use auto-detection)

2. **Start Recording**
   - Click "Start Recording" to begin transcription
   - Optionally enable "Also record in OBS" for synchronized video recording
   - Speak into your microphone - subtitles appear in real-time

3. **Display Subtitles**
   - Open the Display Panel (`/display`) in a separate window or OBS Browser Source
   - Subtitles update automatically via WebSocket

4. **Export SRT File**
   - After recording, click "Export SRT" to download subtitle file
   - SRT files include accurate timestamps synchronized with your recording

### OBS Studio Integration

1. **Enable OBS WebSocket Server**
   - Open OBS Studio
   - Go to `Tools > WebSocket Server Settings`
   - Enable WebSocket server (default port: 4455)
   - Set password if desired

2. **Add Browser Source**
   - In OBS, add a new Browser Source
   - Set URL to: `http://localhost:4639/display`
   - Configure width/height as needed
   - Enable "Shutdown source when not visible" for better performance

3. **Synchronized Recording**
   - Check "Also record in OBS" before starting recording
   - Both transcription and OBS recording start simultaneously
   - SRT timestamps are synchronized with OBS video recording

## 🎨 Customization

The application offers extensive customization options:

### Basic Settings
- Text color, font size, font family
- Position (top, center, bottom)
- Display modes (centered, sequential, scrolling)
- Opacity and transparency

### Advanced Features
- **Background Plate (Apli)** - Customizable underlay with gradients
- **Animations** - Fade, slide, letter-by-letter effects
- **Text Trimming** - Automatic text length control
- **Shadow & Border** - Professional styling options
- **Auto-clear** - Automatic subtitle clearing after pause

### Export/Import Settings
- Save your subtitle configurations as JSON
- Import settings for consistent styling across sessions

## 🛠️ Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS
- **Real-time Communication**: Socket.IO
- **Speech-to-Text**: ElevenLabs React SDK (@elevenlabs/react)
- **OBS Integration**: obs-websocket-js

## 📁 Project Structure

```
obs-realtimeSub/
├── app/
│   ├── rec/
│   │   └── page.tsx              # Recording & configuration panel
│   ├── display/
│   │   └── page.tsx              # Subtitle display client
│   └── api/
│       ├── scribe-token/
│       │   └── route.ts          # ElevenLabs token endpoint
│       └── obs/
│           └── route.ts          # OBS WebSocket API endpoint
├── components/
│   ├── rec/
│   │   ├── SubtitleConfigForm.tsx    # Settings configuration UI
│   │   └── MicrophoneRecorder.tsx    # Recording component
│   └── display/
│       └── SubtitleDisplay.tsx       # Subtitle display component
├── lib/
│   ├── subtitle-settings.ts      # Settings types & defaults
│   ├── subtitle-utils.ts         # Utility functions
│   ├── srt-utils.ts              # SRT generation
│   └── websocket-server.ts       # WebSocket server logic
└── server.js                      # Custom Next.js server
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key | - | Yes |
| `OBS_WEBSOCKET_ADDRESS` | OBS WebSocket address | `localhost:4455` | No |
| `OBS_WEBSOCKET_PASSWORD` | OBS WebSocket password | (empty) | No |

### Port Configuration

The application runs on port `4639` by default. To change this, modify `server.js`:

```javascript
const port = 4639; // Change to your desired port
```

## 📝 SRT Export

SRT files are generated with accurate timestamps based on:
- Actual speech timing (not display timing)
- Last partial transcript timestamp (compensates for VAD delay)
- Synchronized with OBS recording when enabled

This ensures perfect alignment with your video during editing.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io) for the amazing Scribe-v2 API
- [OBS Studio](https://obsproject.com) for the powerful streaming/recording software
- [Next.js](https://nextjs.org) for the excellent React framework

## 📞 Support

For issues, questions, or feature requests, please open an issue on [GitHub](https://github.com/lazniak/obs-realtimeSub/issues).

---

**Note**: This is an alpha version (0.0.1a). Some features may be experimental or subject to change.
