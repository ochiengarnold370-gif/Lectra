/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA API URL Resolver for Web and Native Android (Capacitor)
 */

const CLOUD_API_BASE = 'https://ais-dev-hunntvb7ll7b5et2lwwd7h-722408716748.europe-west2.run.app';

export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If environment variable is explicitly provided
  const envBase = (import.meta as any).env?.VITE_API_URL;
  if (envBase) {
    return `${envBase.replace(/\/$/, '')}${normalizedPath}`;
  }

  // Detect native Android / mobile WebView (Capacitor or Cordova file/scheme)
  if (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      window.location.hostname === 'localhost' && window.location.port === '')
  ) {
    return `${CLOUD_API_BASE}${normalizedPath}`;
  }

  // Standard web browser in dev or prod relative path
  return normalizedPath;
}
