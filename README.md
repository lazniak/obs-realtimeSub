# OBS Realtime Subtitle Generator

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-yellow.svg)](https://buymeacoffee.com/eyb8tkx3to)

A powerful web application for generating real-time subtitles using **ElevenLabs Scribe-v2** realtime speech-to-text API. Perfect for live streaming, recording, and content creation with OBS Studio integration.

## 🎥 Demo Video

[![Demo Video](https://img.youtube.com/vi/kDDcDjXuNPo/maxresdefault.jpg)](https://youtu.be/EsMbYrtGfOY)

**Watch the demo video** to see real-time subtitles in action with OBS Studio integration!

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
   - **Option A**: Open the Display Panel (`/display`) in a separate browser window
   - **Option B**: Add it as a Browser Source in OBS (see [OBS Studio Integration](#obs-studio-integration) for detailed instructions)
   - Subtitles update automatically via WebSocket in real-time

4. **Export SRT File**
   - After recording, click "Export SRT" to download subtitle file
   - SRT files include accurate timestamps synchronized with your recording

### OBS Studio Integration

#### Step 1: Enable OBS WebSocket Server

1. Open **OBS Studio**
2. Go to **Tools** → **WebSocket Server Settings**
3. Check **"Enable WebSocket server"**
4. Note the port (default: **4455**)
5. Optionally set a password for security
6. Click **OK** to save

> **Note**: The WebSocket server is required for synchronized recording. If you only need to display subtitles, you can skip this step.

#### Step 2: Add Display Page as Browser Source in OBS

Follow these steps to add the subtitle display to your OBS scene:

1. **Make sure the application is running**
   - Start the development server: `npm run dev`
   - Verify the display page is accessible at `http://localhost:4639/display`

2. **Add Browser Source in OBS**
   - In OBS Studio, right-click in the **Sources** panel
   - Select **Add** → **Browser Source** (or **Browser**)
   - Give it a name (e.g., "Subtitles" or "Live Subtitles")
   - Click **OK**

3. **Configure Browser Source**
   - In the Browser Source properties window:
     - **URL**: Enter `http://localhost:4639/display`
     - **Width**: Set to match your canvas width (e.g., `1920` for 1080p)
     - **Height**: Set to match your canvas height (e.g., `1080` for 1080p)
     - ✅ Check **"Shutdown source when not visible"** (improves performance)
     - ✅ Check **"Refresh browser when scene becomes active"** (optional, ensures fresh connection)
   - Click **OK**

4. **Position and Style**
   - The subtitles will appear according to your settings from the `/rec` panel
   - You can adjust the position in OBS by moving the Browser Source in the preview
   - The background is transparent by default, so subtitles will overlay your content

5. **Test the Connection**
   - Open the `/rec` panel in your browser
   - Start recording and speak into your microphone
   - You should see subtitles appear in OBS in real-time

> **Tip**: If subtitles don't appear, check that:
> - The application server is running (`npm run dev`)
> - The URL in Browser Source is correct: `http://localhost:4639/display`
> - You've started recording in the `/rec` panel
> - Your microphone permissions are granted

#### Step 3: Synchronized Recording (Optional)

To synchronize OBS recording with transcription:

1. **Before starting recording in `/rec` panel:**
   - Check the **"Also record in OBS"** checkbox
   - This ensures both transcription and OBS video recording start simultaneously

2. **Start Recording**
   - Click **"Start Recording"** in the `/rec` panel
   - OBS recording will start automatically (if checkbox is enabled)
   - Both transcription and video recording are now synchronized

3. **Stop Recording**
   - Click **"Stop"** in the `/rec` panel
   - OBS recording will stop automatically
   - Export your SRT file - timestamps will be perfectly aligned with your OBS video

> **Important**: The SRT file timestamps are calculated based on actual speech timing, not display timing. This ensures perfect synchronization with your OBS video recording during editing.

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

### ☕ Buy Me a Coffee

If you find this project useful and would like to support its development, consider buying me a coffee:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/eyb8tkx3to)

Your support helps me continue improving this project and adding new features!

---

**Note**: This is an alpha version (0.0.1a). Some features may be experimental or subject to change.
