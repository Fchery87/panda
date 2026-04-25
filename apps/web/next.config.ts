import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(configDir, '../..')

const bunPackageStoreDir = path.join(workspaceRoot, 'node_modules/.bun')

const codeMirrorPackageVersions = {
  '@codemirror/autocomplete': '6.20.1',
  '@codemirror/commands': '6.10.1',
  '@codemirror/language': '6.12.1',
  '@codemirror/lint': '6.9.3',
  '@codemirror/merge': '6.12.1',
  '@codemirror/search': '6.6.0',
  '@codemirror/state': '6.6.0',
  '@codemirror/theme-one-dark': '6.1.3',
  '@codemirror/view': '6.40.0',
} as const

export const codeMirrorResolveAlias = Object.fromEntries(
  Object.entries(codeMirrorPackageVersions).map(([packageName, version]) => [
    packageName,
    path.join(
      bunPackageStoreDir,
      `${packageName.replace('/', '+')}@${version}`,
      'node_modules',
      packageName
    ),
  ])
) as Record<keyof typeof codeMirrorPackageVersions, string>

export const codeMirrorTurbopackResolveAlias = Object.fromEntries(
  Object.entries(codeMirrorPackageVersions).map(([packageName, version]) => [
    packageName,
    `./node_modules/.bun/${packageName.replace('/', '+')}@${version}/node_modules/${packageName}`,
  ])
) as Record<keyof typeof codeMirrorPackageVersions, string>

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
  transpilePackages: [
    '@uiw/react-codemirror',
    '@uiw/codemirror-extensions-basic-setup',
    '@uiw/codemirror-themes',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/autocomplete',
    '@codemirror/search',
    '@codemirror/lint',
    '@codemirror/theme-one-dark',
    '@codemirror/merge',
  ],
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    root: workspaceRoot,
    resolveAlias: codeMirrorTurbopackResolveAlias,
  },
  webpack(config) {
    config.resolve ??= {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...codeMirrorResolveAlias,
    }
    return config
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
