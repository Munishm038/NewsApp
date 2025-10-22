import React, {useEffect, useRef, useState} from 'react';
import {View, Image, StyleSheet, Button, Text} from 'react-native';
import {readLogs, clearLogs} from './LogStore';
import {startNativeEventListener} from './nativeEvents';
// captureRef used in service; not used directly here
import ScreenCaptureService from './ScreenCaptureService';
import config from './config';
import axios from 'axios';

export default function ForegroundCaptureComponent() {
  const viewRef = useRef<View>(null);
  const [images, setImages] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const serviceRef = useRef<ScreenCaptureService | null>(null);

  useEffect(() => {
    serviceRef.current = new ScreenCaptureService(viewRef);
    serviceRef.current?.setOnCapture((uri: string) => {
      setLastCaptured(new Date().toLocaleString());
      setLastCapturedUri(uri);
    });
    return () => {
      serviceRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const stopNativeEvents = startNativeEventListener();
    // refresh logs when native events may occur
    const interval = setInterval(() => loadLogs(), 2000);
    return () => {
      stopNativeEvents();
      clearInterval(interval);
    };
  }, []);

  async function loadLogs() {
    const l = await readLogs();
    setLogs(l);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (config.AUTO_START) {
      // start in background (will fetch images and fall back to full-screen capture)
      (async () => {
        await start();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAndRender() {
    try {
      const res = await axios.get(config.REDBOX_NEWS_API);
      const imgs = res.data && res.data.images ? res.data.images : [];
      setImages(imgs);
      return imgs;
    } catch (err) {
      // ignore
      return [];
    }
  }

  async function start() {
    const imgs = await fetchAndRender();
    // if there are images render them into the capture area, otherwise
    // clear the captureRef so the service falls back to full screen capture
    if ((imgs || []).length === 0) {
      serviceRef.current?.setCaptureRef(null);
    } else {
      serviceRef.current?.setCaptureRef(viewRef.current);
    }
    await serviceRef.current?.start();
    setRunning(true);
  }

  function stop() {
    serviceRef.current?.stop();
    setRunning(false);
  }

  return (
    <View style={styles.container}>
      <View collapsable={false} ref={viewRef} style={styles.captureArea}>
        {images.length === 0 ? (
          <Text>No images yet</Text>
        ) : (
          images.map((uri, i) => (
            <Image
              key={i}
              source={{uri}}
              style={styles.image}
              resizeMode="contain"
            />
          ))
        )}
      </View>

      <View style={styles.controls}>
        {!running ? (
          <Button title="Start Capture" onPress={start} />
        ) : (
          <Button title="Stop Capture" onPress={stop} />
        )}
      </View>
      {lastCaptured ? (
        <View style={styles.previewContainer}>
          <Text>Last captured: {lastCaptured}</Text>
          {lastCapturedUri ? (
            <Image source={{uri: lastCapturedUri}} style={styles.preview} />
          ) : null}
        </View>
      ) : null}
      <View style={styles.logsContainer}>
        <Text style={{fontWeight: '700'}}>Capture logs</Text>
        <Button title="Reload Logs" onPress={loadLogs} />
        <Button
          title="Clear Logs"
          onPress={async () => {
            await clearLogs();
            setLogs([]);
          }}
        />
        {logs.map((g, i) => (
          <View key={i} style={{paddingVertical: 6}}>
            <Text>
              {g.timestamp} — {g.note} {g.uri ? g.uri.substring(0, 60) : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16},
  captureArea: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {width: 300, height: 200, marginVertical: 8},
  controls: {paddingVertical: 12},
  previewContainer: {paddingTop: 12, alignItems: 'center'},
  preview: {width: 200, height: 120, marginTop: 8},
  logsContainer: {paddingTop: 12},
});
