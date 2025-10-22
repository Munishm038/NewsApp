package com.newsapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream

class ScreenCaptureService : Service() {
    private val CHANNEL_ID = "ScreenCaptureChannel"
    private val NOTIF_ID = 0x1234

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val mgr = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val resultCode = intent?.getIntExtra("resultCode", -1) ?: -1
        val data = intent?.getParcelableExtra<Intent>("data")
        if (resultCode != -1 && data != null) {
            try {
                mediaProjection = mgr.getMediaProjection(resultCode, data)
                startCapture()
            } catch (e: Exception) {
                Log.e("ScreenCaptureService", "media projection failed", e)
                stopSelf()
            }
        } else {
            // No permission data; stop
            stopSelf()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        stopCapture()
        mediaProjection?.stop()
        mediaProjection = null
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val chan = NotificationChannel(CHANNEL_ID, "Screen Capture", NotificationManager.IMPORTANCE_LOW)
            nm.createNotificationChannel(chan)
        }
    }

    private fun buildNotification(): Notification {
        val stopIntent = Intent(this, ScreenCaptureService::class.java).apply {
            action = "STOP"
        }
        val pStop = PendingIntent.getService(this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Screen capture running")
            .setContentText("Capturing screen periodically")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", pStop)
            .build()
    }

    private fun startCapture() {
        val w = resources.displayMetrics.widthPixels
        val h = resources.displayMetrics.heightPixels
        val density = resources.displayMetrics.densityDpi

        imageReader = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2)
        virtualDisplay = mediaProjection?.createVirtualDisplay("ScreenCapture",
            w, h, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_PUBLIC,
            imageReader?.surface, null, null)

        // schedule periodic read - simple implementation: read available image once
        imageReader?.setOnImageAvailableListener({ reader ->
            val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
            val planes = image.planes
            val buffer = planes[0].buffer
            val pixelStride = planes[0].pixelStride
            val rowStride = planes[0].rowStride
            val rowPadding = rowStride - pixelStride * w

            val bitmap = android.graphics.Bitmap.createBitmap(w + rowPadding / pixelStride, h, android.graphics.Bitmap.Config.ARGB_8888)
            bitmap.copyPixelsFromBuffer(buffer)
            image.close()

            // write to temp file
            try {
                val outFile = File(cacheDir, "screencap_${System.currentTimeMillis()}.jpg")
                val fos = FileOutputStream(outFile)
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, fos)
                fos.flush()
                fos.close()
                // announce capture to JS via broadcast so RN can persist logs
                try {
                    val bcast = Intent("com.newsapp.SCREEN_CAPTURE")
                    bcast.putExtra("id", outFile.name)
                    bcast.putExtra("timestamp", System.currentTimeMillis())
                    bcast.putExtra("uri", outFile.absolutePath)
                    bcast.putExtra("note", "captured")
                    sendBroadcast(bcast)
                } catch (e: Exception) {
                    // ignore
                }
            } catch (e: Exception) {
                Log.e("ScreenCaptureService", "failed to write image", e)
            }
        }, null)
    }

    private fun stopCapture() {
        try {
            virtualDisplay?.release()
            virtualDisplay = null
            imageReader?.close()
            imageReader = null
        } catch (e: Exception) {
            // ignore
        }
    }
}
