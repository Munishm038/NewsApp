import {NativeEventEmitter, NativeModules} from 'react-native';
import {appendLog} from './LogStore';

const {ScreenCaptureModule, ReplayCaptureModule} = NativeModules as any;
const emitter = new NativeEventEmitter(
  ScreenCaptureModule || ReplayCaptureModule,
);

export function startNativeEventListener() {
  const sub = emitter.addListener('NativeCaptureEvent', async (ev: any) => {
    try {
      const id = ev.id || String(Date.now());
      const ts = ev.timestamp
        ? new Date(Number(ev.timestamp)).toISOString()
        : new Date().toISOString();
      const uri = ev.uri || null;
      const note = ev.note || 'native_capture';
      await appendLog({id, timestamp: ts, uri, note});
    } catch (e) {
      // ignore
    }
  });
  return () => sub.remove();
}
