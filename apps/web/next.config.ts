import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(configDir, '../..')

interface SecurityHeaderOptions {
  isDev?: boolean
  isHttpsDeployment?: boolean
}

function inferHttpsDeployment(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return process.env.NODE_ENV === 'production'
  }

  return appUrl.startsWith('https://')
}

export function buildSecurityHeaders({
  isDev = process.env.NODE_ENV !== 'production',
  isHttpsDeployment = inferHttpsDeployment(),
}: SecurityHeaderOptions = {}) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isHttpsDeployment ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  const headers = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: csp },
  ]

  if (isHttpsDeployment) {
    headers.splice(4, 0, {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    })
  }

  return headers
}

const nextConfig: NextConfig = {
  transpilePackages: ['@uiw/react-codemirror'],
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    root: workspaceRoot,
  },
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
    ]
  },
}

export default nextConfig
