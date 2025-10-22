import {NativeModules, Platform} from 'react-native';

const {ScreenCaptureModule} = NativeModules as any;

export async function requestPermissionAndStart(): Promise<{
  ok: boolean;
  msg: string;
}> {
  if (Platform.OS !== 'android') {
    return {ok: false, msg: 'not_android'};
  }
  return new Promise(resolve => {
    ScreenCaptureModule.requestPermissionAndStart(
      (ok: boolean, msg: string) => {
        resolve({ok, msg});
      },
    );
  });
}

export function stopBackgroundService(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  ScreenCaptureModule.stopService();
}
