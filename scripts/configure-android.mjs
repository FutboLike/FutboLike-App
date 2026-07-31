import fs from 'node:fs';
import path from 'node:path';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = fs.readFileSync(manifestPath, 'utf8');

if (!manifest.includes('android.permission.INTERNET')) {
  manifest = manifest.replace('<manifest ', '<manifest ');
  manifest = manifest.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.INTERNET" />');
}


// Permite streams HTTP antiguos. Siempre es preferible usar HTTPS.
manifest = manifest.replace(
  /<application\b([^>]*)>/s,
  (full, attrs) => {
    let updated = attrs;
    if (!updated.includes('android:usesCleartextTraffic=')) {
      updated += '\n        android:usesCleartextTraffic="true"';
    }
    if (!updated.includes('android:networkSecurityConfig=')) {
      updated += '\n        android:networkSecurityConfig="@xml/network_security_config"';
    }
    return `<application${updated}>`;
  }
);

const networkSecurityDir = 'android/app/src/main/res/xml';
fs.mkdirSync(networkSecurityDir, { recursive: true });
fs.writeFileSync(
  path.join(networkSecurityDir, 'network_security_config.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="true" />\n</network-security-config>\n`
);

manifest = manifest.replace(
  /(<activity\b[^>]*android:name="\.MainActivity"[^>]*)(>)/s,
  (full, start, end) => {
    let updated = start;
    if (!updated.includes('android:screenOrientation=')) {
      updated += '\n            android:screenOrientation="landscape"';
    }
    if (!updated.includes('android:configChanges=')) {
      updated += '\n            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|uiMode|screenLayout|smallestScreenSize|density"';
    }
    return updated + end;
  }
);

fs.writeFileSync(manifestPath, manifest);

const activityPath = 'android/app/src/main/java/com/futbolike/tv/MainActivity.java';
fs.mkdirSync(path.dirname(activityPath), { recursive: true });
fs.copyFileSync('android-snippets/MainActivity.java', activityPath);

const playerPluginPath = 'android/app/src/main/java/com/futbolike/tv/NativePlayerPlugin.java';
fs.copyFileSync('android-snippets/NativePlayerPlugin.java', playerPluginPath);

const appGradlePath = 'android/app/build.gradle';
let appGradle = fs.readFileSync(appGradlePath, 'utf8');
const media3Dependencies = [
  "implementation 'androidx.media3:media3-exoplayer:1.10.1'",
  "implementation 'androidx.media3:media3-exoplayer-hls:1.10.1'",
  "implementation 'androidx.media3:media3-ui:1.10.1'"
];

appGradle = appGradle.replace(/dependencies\s*\{/, match => {
  const missing = media3Dependencies.filter(dependency => !appGradle.includes(dependency));
  return missing.length ? `${match}\n    ${missing.join('\n    ')}` : match;
});
fs.writeFileSync(appGradlePath, appGradle);

console.log('Android configurado: Media3 ExoPlayer, horizontal, pantalla encendida, modo inmersivo y compatibilidad HTTP.');
