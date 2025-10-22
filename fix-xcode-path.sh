#!/bin/bash
# Script to fix Xcode path and install pods

echo "🔧 Switching xcode-select to Xcode.app..."
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

if [ $? -eq 0 ]; then
    echo "✅ Successfully switched to Xcode.app"
    echo ""
    echo "📋 Verifying SDK availability..."
    xcrun --sdk iphoneos --show-sdk-path
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ iOS SDK is available"
        echo ""
        echo "📦 Installing CocoaPods..."
        cd ios
        pod install
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Pods installed successfully!"
            echo ""
            echo "🚀 You can now run the app with:"
            echo "   npx react-native run-ios"
        else
            echo ""
            echo "❌ Pod install failed. Check the error above."
        fi
    else
        echo ""
        echo "❌ iOS SDK not found. Please ensure Xcode is properly installed."
    fi
else
    echo ""
    echo "❌ Failed to switch xcode-select. Please run manually:"
    echo "   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
fi
