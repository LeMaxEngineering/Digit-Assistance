require('dotenv').config();

export default {
  expo: {
    name: "Digital Assist",
    slug: "digitalassistance",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./app/assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./app/assets/images/splash01.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.digitalassist"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./app/assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.digitalassist",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./app/assets/images/logo.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "Allow Digital Assist to access your camera to scan documents."
        }
      ]
    ],
    extra: {
      EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
      EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
      googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
      API_URL: process.env.API_URL || 'http://192.168.4.103:3000/api',
      eas: {
        projectId: "31613c98-f5e2-4916-820f-96133544417b"
      }
    },
    runtimeVersion: {
      policy: "sdkVersion"
    },
    updates: {
      url: "https://u.expo.dev/31613c98-f5e2-4916-820f-96133544417b"
    },
    doctor: {
      reactNativeDirectoryCheck: {
        listUnknownPackages: false
      }
    }
  }
}; 