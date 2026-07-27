import fs from 'node:fs';
import path from 'node:path';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = fs.readFileSync(manifestPath, 'utf8');

if (!manifest.includes('android.permission.INTERNET')) {
  manifest = manifest.replace('<manifest ', '<manifest ');
  manifest = manifest.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.INTERNET" />');
}

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

console.log('Android configurado: horizontal, pantalla encendida y modo inmersivo.');
