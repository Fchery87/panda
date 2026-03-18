// apps/web/components/editor/language-support.ts
import type { Extension } from '@codemirror/state'

/**
 * Maps file extensions to lazy-loaded CodeMirror language extensions.
 * Each loader returns an Extension (LanguageSupport instance).
 * Using dynamic imports to avoid bundling all languages upfront.
 */
const LANGUAGE_MAP: Record<string, () => Promise<Extension>> = {
  // JavaScript / TypeScript
  '.js': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false })),
  '.jsx': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  '.mjs': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false })),
  '.cjs': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false })),
  '.ts': () =>
    import('@codemirror/lang-javascript').then((m) =>
      m.javascript({ jsx: false, typescript: true })
    ),
  '.tsx': () =>
    import('@codemirror/lang-javascript').then((m) =>
      m.javascript({ jsx: true, typescript: true })
    ),
  '.mts': () =>
    import('@codemirror/lang-javascript').then((m) =>
      m.javascript({ jsx: false, typescript: true })
    ),
  '.cts': () =>
    import('@codemirror/lang-javascript').then((m) =>
      m.javascript({ jsx: false, typescript: true })
    ),

  // Python
  '.py': () => import('@codemirror/lang-python').then((m) => m.python()),
  '.pyw': () => import('@codemirror/lang-python').then((m) => m.python()),
  '.pyi': () => import('@codemirror/lang-python').then((m) => m.python()),

  // Web
  '.html': () => import('@codemirror/lang-html').then((m) => m.html()),
  '.htm': () => import('@codemirror/lang-html').then((m) => m.html()),
  '.svg': () => import('@codemirror/lang-html').then((m) => m.html()),
  '.css': () => import('@codemirror/lang-css').then((m) => m.css()),
  '.scss': () => import('@codemirror/lang-css').then((m) => m.css()),
  '.less': () => import('@codemirror/lang-css').then((m) => m.css()),
  '.php': () => import('@codemirror/lang-php').then((m) => m.php()),

  // Data
  '.json': () => import('@codemirror/lang-json').then((m) => m.json()),
  '.jsonc': () => import('@codemirror/lang-json').then((m) => m.json()),
  '.xml': () => import('@codemirror/lang-xml').then((m) => m.xml()),
  '.yaml': () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  '.yml': () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  '.toml': () => import('@codemirror/lang-json').then((m) => m.json()), // close enough

  // Documentation
  '.md': () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  '.markdown': () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  '.mdx': () => import('@codemirror/lang-markdown').then((m) => m.markdown()),

  // Systems
  '.rs': () => import('@codemirror/lang-rust').then((m) => m.rust()),
  '.go': () => import('@codemirror/lang-go').then((m) => m.go()),
  '.c': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.h': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.cpp': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.hpp': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.cc': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),

  // JVM
  '.java': () => import('@codemirror/lang-java').then((m) => m.java()),

  // SQL
  '.sql': () => import('@codemirror/lang-sql').then((m) => m.sql()),
}

/**
 * Resolves the appropriate CodeMirror language extension for a given filename.
 * Returns an empty array if the language is not supported (safe to spread into extensions).
 */
export async function getLanguageExtension(filePath: string): Promise<Extension | Extension[]> {
  const dotIdx = filePath.lastIndexOf('.')
  if (dotIdx === -1) return []

  const ext = filePath.slice(dotIdx).toLowerCase()
  const loader = LANGUAGE_MAP[ext]
  if (!loader) return []

  try {
    return await loader()
  } catch {
    console.warn(`[language-support] Failed to load language for ${ext}`)
    return []
  }
}

/**
 * Returns the set of file extensions that have syntax highlighting support.
 */
export function getSupportedExtensions(): Set<string> {
  return new Set(Object.keys(LANGUAGE_MAP))
}
