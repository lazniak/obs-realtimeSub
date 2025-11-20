import { NextRequest, NextResponse } from 'next/server';
import OBSWebSocket from 'obs-websocket-js';

// Singleton instance dla połączenia OBS
let obsClient: OBSWebSocket | null = null;
let isConnected = false;

async function getOBSClient(): Promise<OBSWebSocket> {
  if (obsClient && isConnected) {
    return obsClient;
  }

  const client = new OBSWebSocket();
  
  try {
    // Pobierz konfigurację z zmiennych środowiskowych lub użyj domyślnych wartości
    const obsAddress = process.env.OBS_WEBSOCKET_ADDRESS || 'localhost:4455';
    const obsPassword = process.env.OBS_WEBSOCKET_PASSWORD || '';

    await client.connect(obsAddress, obsPassword);
    isConnected = true;
    obsClient = client;

    // Obsługa rozłączenia
    client.on('ConnectionClosed', () => {
      console.log('OBS WebSocket connection closed');
      isConnected = false;
      obsClient = null;
    });

    return client;
  } catch (error) {
    console.error('Error connecting to OBS:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'startRecording' && action !== 'stopRecording')) {
      return NextResponse.json(
        { error: 'Invalid action. Use "startRecording" or "stopRecording"' },
        { status: 400 }
      );
    }

    const client = await getOBSClient();

    if (action === 'startRecording') {
      await client.call('StartRecord');
      return NextResponse.json({ success: true, message: 'Recording started' });
    } else if (action === 'stopRecording') {
      await client.call('StopRecord');
      return NextResponse.json({ success: true, message: 'Recording stopped' });
    }
  } catch (error: any) {
    console.error('OBS API error:', error);
    
    // Reset connection on error
    if (obsClient) {
      try {
        await obsClient.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      obsClient = null;
      isConnected = false;
    }

    return NextResponse.json(
      { 
        error: 'Failed to communicate with OBS', 
        details: error.message || 'Unknown error',
        hint: 'Make sure OBS is running and WebSocket server is enabled (Tools > WebSocket Server Settings)'
      },
      { status: 500 }
    );
  }
}

