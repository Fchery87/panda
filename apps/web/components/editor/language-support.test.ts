// apps/web/components/editor/language-support.test.ts
import { describe, it, expect } from 'bun:test'
import { getLanguageExtension, getSupportedExtensions } from './language-support'

describe('getLanguageExtension', () => {
  it('returns javascript for .js files', async () => {
    const ext = await getLanguageExtension('app.js')
    expect(ext).toBeDefined()
  })

  it('returns javascript with jsx for .jsx files', async () => {
    const ext = await getLanguageExtension('Component.jsx')
    expect(ext).toBeDefined()
  })

  it('returns javascript with typescript for .ts files', async () => {
    const ext = await getLanguageExtension('index.ts')
    expect(ext).toBeDefined()
  })

  it('returns javascript with typescript+jsx for .tsx files', async () => {
    const ext = await getLanguageExtension('Page.tsx')
    expect(ext).toBeDefined()
  })

  it('returns python for .py files', async () => {
    const ext = await getLanguageExtension('main.py')
    expect(ext).toBeDefined()
  })

  it('returns html for .html files', async () => {
    const ext = await getLanguageExtension('index.html')
    expect(ext).toBeDefined()
  })

  it('returns css for .css files', async () => {
    const ext = await getLanguageExtension('styles.css')
    expect(ext).toBeDefined()
  })

  it('returns json for .json files', async () => {
    const ext = await getLanguageExtension('package.json')
    expect(ext).toBeDefined()
  })

  it('returns markdown for .md files', async () => {
    const ext = await getLanguageExtension('README.md')
    expect(ext).toBeDefined()
  })

  it('returns rust for .rs files', async () => {
    const ext = await getLanguageExtension('lib.rs')
    expect(ext).toBeDefined()
  })

  it('returns go for .go files', async () => {
    const ext = await getLanguageExtension('main.go')
    expect(ext).toBeDefined()
  })

  it('returns java for .java files', async () => {
    const ext = await getLanguageExtension('App.java')
    expect(ext).toBeDefined()
  })

  it('returns cpp for .cpp files', async () => {
    const ext = await getLanguageExtension('main.cpp')
    expect(ext).toBeDefined()
  })

  it('returns sql for .sql files', async () => {
    const ext = await getLanguageExtension('query.sql')
    expect(ext).toBeDefined()
  })

  it('returns xml for .xml files', async () => {
    const ext = await getLanguageExtension('config.xml')
    expect(ext).toBeDefined()
  })

  it('returns yaml for .yml files', async () => {
    const ext = await getLanguageExtension('docker-compose.yml')
    expect(ext).toBeDefined()
  })

  it('returns yaml for .yaml files', async () => {
    const ext = await getLanguageExtension('config.yaml')
    expect(ext).toBeDefined()
  })

  it('returns php for .php files', async () => {
    const ext = await getLanguageExtension('index.php')
    expect(ext).toBeDefined()
  })

  it('returns empty array for unknown extensions', async () => {
    const ext = await getLanguageExtension('data.xyz')
    expect(ext).toEqual([])
  })

  it('handles files with no extension', async () => {
    const ext = await getLanguageExtension('Makefile')
    expect(ext).toEqual([])
  })
})

describe('getSupportedExtensions', () => {
  it('returns a non-empty set of supported extensions', () => {
    const exts = getSupportedExtensions()
    expect(exts.size).toBeGreaterThan(10)
    expect(exts.has('.ts')).toBe(true)
    expect(exts.has('.py')).toBe(true)
    expect(exts.has('.go')).toBe(true)
  })
})
