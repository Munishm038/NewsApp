import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'capture_logs_v1';

export type CaptureLog = {
  id: string;
  timestamp: string;
  uri?: string;
  note?: string;
};

export async function appendLog(entry: CaptureLog) {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const arr: CaptureLog[] = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(0, 1000)));
  } catch (e) {
    // ignore
  }
}

export async function readLogs(): Promise<CaptureLog[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function clearLogs() {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch (e) {
    // ignore
  }
}
