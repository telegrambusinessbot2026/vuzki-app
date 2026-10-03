const fs = require('fs');

module.exports = ({ config }) => {
  const androidPath = process.env.GOOGLE_SERVICES_ANDROID || './google-services.json';
  const iosPath = process.env.GOOGLE_SERVICES_IOS || './GoogleService-Info.plist';

  // We only want to hard-crash if the developer is actively trying to generate native code.
  // Other commands (eas init, expo config) should safely bypass this physical file requirement.
  const isNativeBuild = process.argv.some(arg => 
    arg.includes('prebuild') || 
    arg.includes('run:android') || 
    arg.includes('run:ios')
  );

  // For EAS Build, files can be injected via EAS Secrets.
  // For local development (prebuild), we ensure they exist or fail securely with clear instructions.
  if (!process.env.EAS_BUILD && isNativeBuild) {
    if (!fs.existsSync(androidPath)) {
      throw new Error(
        `\n\n[Firebase Configuration Error]\n` +
        `Missing Android Firebase configuration file.\n` +
        `Expected at: ${androidPath}\n` +
        `For local development, you must place your real google-services.json in the apps/mobile directory,\n` +
        `or set the GOOGLE_SERVICES_ANDROID environment variable pointing to the absolute path of the file.\n\n`
      );
    }
    
    if (!fs.existsSync(iosPath)) {
      throw new Error(
        `\n\n[Firebase Configuration Error]\n` +
        `Missing iOS Firebase configuration file.\n` +
        `Expected at: ${iosPath}\n` +
        `For local development, you must place your real GoogleService-Info.plist in the apps/mobile directory,\n` +
        `or set the GOOGLE_SERVICES_IOS environment variable pointing to the absolute path of the file.\n\n`
      );
    }
  }

  // Safely inject paths if we are in EAS_BUILD (EAS handles placing them) or if they physically exist locally
  if (process.env.EAS_BUILD || fs.existsSync(androidPath)) {
    config.android = config.android || {};
    config.android.googleServicesFile = androidPath;
  }

  if (process.env.EAS_BUILD || fs.existsSync(iosPath)) {
    config.ios = config.ios || {};
    config.ios.googleServicesFile = iosPath;
  }

  return config;
};
