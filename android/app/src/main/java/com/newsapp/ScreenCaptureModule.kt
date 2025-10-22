package com.newsapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.content.Intent

class ScreenCaptureReceiver(private val reactContext: ReactApplicationContext) : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent == null) return
        if (intent.action == "com.newsapp.SCREEN_CAPTURE") {
            val map = com.facebook.react.bridge.Arguments.createMap()
            map.putString("id", intent.getStringExtra("id"))
            map.putString("timestamp", intent.getLongExtra("timestamp", 0).toString())
            map.putString("uri", intent.getStringExtra("uri"))
            map.putString("note", intent.getStringExtra("note"))
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("NativeCaptureEvent", map)
        }
    }
}

class ScreenCaptureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
    private val REQUEST_CODE = 5678
    private var startCallback: Callback? = null
    private var receiver: ScreenCaptureReceiver? = null

    override fun getName(): String {
        return "ScreenCaptureModule"
    }

    @ReactMethod
    fun requestPermissionAndStart(callback: Callback) {
        val activity = currentActivity
        if (activity == null) {
            callback.invoke(false, "no_activity")
            return
        }
        startCallback = callback
        val mgr = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val intent = mgr.createScreenCaptureIntent()
        activity.startActivityForResult(intent, REQUEST_CODE)
    }

    @ReactMethod
    fun stopService() {
        val ctx = reactApplicationContext
        val stop = Intent(ctx, ScreenCaptureService::class.java)
        ctx.stopService(stop)
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                // start service with permission data
                val ctx = reactApplicationContext
                val svcIntent = Intent(ctx, ScreenCaptureService::class.java)
                svcIntent.putExtra("resultCode", resultCode)
                svcIntent.putExtra("data", data)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    ctx.startForegroundService(svcIntent)
                } else {
                    ctx.startService(svcIntent)
                }
                startCallback?.invoke(true, "started")
            } else {
                startCallback?.invoke(false, "denied")
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    override fun initialize() {
        super.initialize()
        try {
            receiver = ScreenCaptureReceiver(reactApplicationContext)
            val filter = IntentFilter("com.newsapp.SCREEN_CAPTURE")
            reactApplicationContext.registerReceiver(receiver, filter)
        } catch (e: Exception) {
            // ignore
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            if (receiver != null) reactApplicationContext.unregisterReceiver(receiver)
        } catch (e: Exception) {
            // ignore
        }
    }
}
