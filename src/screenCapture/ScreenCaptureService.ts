import {
  captureRef as rnCaptureRef,
  captureScreen,
} from 'react-native-view-shot';
import axios from 'axios';
import config from './config';
import {appendLog} from './LogStore';

type QueuedItem = {
  id: string;
  uri: string; // local file uri or base64
  attempts: number;
};

const queue: QueuedItem[] = [];

function enqueue(item: QueuedItem) {
  queue.push(item);
  while (queue.length > config.RETENTION_LIMIT) {
    queue.shift();
  }
}

async function uploadImage(fileUri: string) {
  // multipart/form-data upload to UPLOAD_API
  const form = new FormData();
  form.append('screenshot', {
    uri: fileUri,
    type: 'image/jpeg',
    name: `screenshot_${Date.now()}.jpg`,
  } as any);

  const headers: any = {'Content-Type': 'multipart/form-data'};
  if (config.UPLOAD_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${config.UPLOAD_AUTH_TOKEN}`;
  }

  const resp = await axios.post(config.UPLOAD_API, form, {
    headers,
    timeout: 20000,
  });
  return resp.data;
}

async function tryFlushQueue() {
  for (let i = 0; i < queue.length; ) {
    const item = queue[i];
    try {
      await uploadImage(item.uri);
      queue.splice(i, 1);
    } catch (err) {
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts > 5) {
        // drop it
        queue.splice(i, 1);
      } else {
        i++;
      }
    }
  }
}

export default class ScreenCaptureService {
  private _captureRef: any = null;
  private _timer: any = null;
  private _running = false;
  private _onCapture: ((uri: string) => void) | null = null;

  constructor(captureRef?: any) {
    this._captureRef = captureRef;
  }

  setCaptureRef(ref: any) {
    this._captureRef = ref;
  }

  setOnCapture(cb: (uri: string) => void) {
    this._onCapture = cb;
  }

  async fetchNewsImages() {
    try {
      const res = await axios.get(config.REDBOX_NEWS_API, {timeout: 15000});
      // assume response shape { images: [url] }
      return res.data && res.data.images ? res.data.images : [];
    } catch (err) {
      return [];
    }
  }

  async captureAndUpload() {
    try {
      let uri: string | null = null;
      if (this._captureRef) {
        uri = await rnCaptureRef(this._captureRef, {
          format: 'jpg',
          quality: config.JPEG_QUALITY,
          result: 'tmpfile',
        });
      } else {
        // fallback to full screen capture
        uri = await captureScreen({
          format: 'jpg',
          quality: config.JPEG_QUALITY,
        });
      }

      if (uri) {
        const id = String(Date.now());
        enqueue({id, uri, attempts: 0});
        // log capture
        appendLog({
          id,
          timestamp: new Date().toISOString(),
          uri,
          note: 'captured',
        });
        if (this._onCapture) {
          try {
            this._onCapture(uri);
          } catch (e) {
            // ignore
          }
        }
        try {
          await tryFlushQueue();
          appendLog({
            id: String(Date.now()),
            timestamp: new Date().toISOString(),
            note: 'upload_flushed',
          });
        } catch (e) {
          appendLog({
            id: String(Date.now()),
            timestamp: new Date().toISOString(),
            note: 'upload_failed',
          });
        }
      }
    } catch (err) {
      // ignore for now
    }
  }

  async start() {
    if (this._running) {
      return;
    }
    this._running = true;
    // initial fetch
    await this.fetchNewsImages();
    // immediate capture once on start
    await this.captureAndUpload();
    // schedule repeated capture
    this._timer = setInterval(
      () => this.captureAndUpload(),
      config.CAPTURE_INTERVAL_MS,
    );
  }

  stop() {
    if (!this._running) {
      return;
    }
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
    }
    this._timer = null;
  }

  isRunning() {
    return this._running;
  }
}
