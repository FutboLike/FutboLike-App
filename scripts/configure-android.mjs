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

const notificationTopicsPath = 'android/app/src/main/java/com/futbolike/tv/NotificationTopicsPlugin.java';
fs.copyFileSync('android-snippets/NotificationTopicsPlugin.java', notificationTopicsPath);

fs.copyFileSync('android-snippets/google-services.json', 'android/app/google-services.json');

const appGradlePath = 'android/app/build.gradle';
let appGradle = fs.readFileSync(appGradlePath, 'utf8');
const nativePlayerDependency = "implementation 'org.videolan.android:libvlc-all:3.6.5'";
const firebaseDependencies = [
  "implementation 'com.google.firebase:firebase-messaging:24.1.0'"
];

// Elimina reproductores nativos anteriores para que el script sea seguro al repetirlo.
appGradle = appGradle.replace(
  /^\s*implementation ['"](?:androidx\.media3:media3-(?:exoplayer|exoplayer-hls|ui)|org\.videolan\.android:libvlc-all):[^'"]+['"]\s*$/gm,
  ''
);
appGradle = appGradle.replace(
  /^\s*implementation\s+(?:platform\()?['"]com\.google\.firebase:firebase-(?:bom|messaging)[^\n]*$/gm,
  ''
);

appGradle = appGradle.replace(/dependencies\s*\{/, match => {
  const dependencies = [nativePlayerDependency, ...firebaseDependencies]
    .filter(dependency => !appGradle.includes(dependency));
  return dependencies.length ? `${match}\n    ${dependencies.join('\n    ')}` : match;
});

if (!appGradle.includes("apply plugin: 'com.google.gms.google-services'")) {
  appGradle += "\napply plugin: 'com.google.gms.google-services'\n";
}
fs.writeFileSync(appGradlePath, appGradle);

const rootGradlePath = 'android/build.gradle';
let rootGradle = fs.readFileSync(rootGradlePath, 'utf8');
const googleServicesClasspath = "classpath 'com.google.gms:google-services:4.5.0'";
let foundGoogleServices = false;
rootGradle = rootGradle.split('\n').filter(line => {
  if (!line.includes('com.google.gms:google-services:')) return true;
  if (foundGoogleServices) return false;
  foundGoogleServices = true;
  return true;
}).join('\n');
if (foundGoogleServices) {
  rootGradle = rootGradle.replace(
    /classpath ['"]com\.google\.gms:google-services:[^'"]+['"]/,
    googleServicesClasspath
  );
} else {
  rootGradle = rootGradle.replace(/dependencies\s*\{/, match => `${match}\n        ${googleServicesClasspath}`);
}
fs.writeFileSync(rootGradlePath, rootGradle);

const launcherIconDensities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const density of launcherIconDensities) {
  const targetDir = `android/app/src/main/res/mipmap-${density}`;
  const sourceIcon = `android-snippets/launcher-icons/mipmap-${density}/ic_launcher.png`;
  fs.mkdirSync(targetDir, { recursive: true });
  for (const oldName of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
    fs.rmSync(path.join(targetDir, oldName), { force: true });
  }
  fs.copyFileSync(sourceIcon, path.join(targetDir, 'ic_launcher.png'));
  fs.copyFileSync(sourceIcon, path.join(targetDir, 'ic_launcher_round.png'));
}

// Usa el logo completo también en Android 8+ en lugar del icono adaptativo de Capacitor.
for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  fs.rmSync(path.join('android/app/src/main/res/mipmap-anydpi-v26', name), { force: true });
}

console.log('Android configurado: libVLC, Firebase Cloud Messaging, icono FutboLike, horizontal y modo inmersivo.');
