import { action, mutation, query } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'

// Maximum file size in bytes (1MB)
const MAX_FILE_SIZE = 1024 * 1024

// Maximum number of files to import
const MAX_FILES = 100

// Text file extensions to import
const TEXT_EXTENSIONS = new Set([
  // Web
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.json5',
  '.vue',
  '.svelte',

  // Backend
  '.py',
  '.rb',
  '.php',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.scala',
  '.cs',
  '.fs',
  '.fsx',
  '.swift',
  '.c',
  '.cpp',
  '.h',
  '.hpp',

  // Data/Config
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.xml',
  '.svg',
  '.sql',
  '.graphql',
  '.gql',

  // Documentation
  '.md',
  '.mdx',
  '.txt',
  '.rst',
  '.adoc',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',

  // Other
  '.dockerfile',
  '.gitignore',
  '.env',
  '.env.example',
  '.lock',
  '.gitattributes',
  '.editorconfig',
])

// Binary extensions to skip
const BINARY_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.ico',
  '.svgz',
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.webm',
  '.ogg',
  '.flac',
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.db',
  '.sqlite',
  '.sqlite3',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.wasm',
  '.class',
  '.o',
  '.a',
  '.lib',
])

interface GitHubFile {
  path: string
  content: string | null
  size: number
  type: 'file' | 'directory'
  sha: string
}

interface ImportProgress {
  totalFiles: number
  processedFiles: number
  importedFiles: number
  skippedFiles: number
  currentFile: string | null
  errors: string[]
}

// Parse GitHub URL to get owner, repo, and optional branch
function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  // Support formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch
  // github.com/owner/repo
  // github.com/owner/repo/tree/branch

  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
    /https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        branch: match[3],
      }
    }
  }

  return null
}

// Check if a file should be imported (text file, not too large)
function shouldImportFile(path: string, size: number): { shouldImport: boolean; reason?: string } {
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return { shouldImport: false, reason: 'File too large' }
  }

  // Get file extension
  const ext = path.toLowerCase().slice(path.lastIndexOf('.'))

  // Skip binary files
  if (BINARY_EXTENSIONS.has(ext)) {
    return { shouldImport: false, reason: 'Binary file' }
  }

  // Skip node_modules and hidden directories
  if (path.includes('node_modules/') || path.includes('/.')) {
    return { shouldImport: false, reason: 'Skipped directory' }
  }

  // Allow text files
  if (TEXT_EXTENSIONS.has(ext)) {
    return { shouldImport: true }
  }

  // If no extension or unknown, check if it's a common config file
  const basename = path.split('/').pop() || ''
  if (['Dockerfile', 'Makefile', 'README', 'LICENSE', '.gitignore'].includes(basename)) {
    return { shouldImport: true }
  }

  // Skip unknown files
  return { shouldImport: false, reason: 'Unknown file type' }
}

// Fetch repository contents from GitHub API
async function fetchRepoContents(
  owner: string,
  repo: string,
  branch: string = 'main',
  path: string = ''
): Promise<GitHubFile[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Panda.ai GitHub Importer',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    // Single file
    return [
      {
        path: data.path,
        content: data.content,
        size: data.size,
        type: 'file',
        sha: data.sha,
      },
    ]
  }

  const files: GitHubFile[] = []

  for (const item of data) {
    if (item.type === 'file') {
      files.push({
        path: item.path,
        content: item.content,
        size: item.size,
        type: 'file',
        sha: item.sha,
      })
    } else if (item.type === 'dir') {
      // Recursively fetch directory contents
      const subFiles = await fetchRepoContents(owner, repo, branch, item.path)
      files.push(...subFiles)
    }
  }

  return files
}

// Fetch file content if not included
async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3.raw',
      'User-Agent': 'Panda.ai GitHub Importer',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status}`)
  }

  return await response.text()
}

// Query to get import progress (for polling)
export const getImportProgress = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }) => {
    // In a real implementation, you'd store progress in a separate table
    // For now, return a placeholder
    return null
  },
})

// Action to import a GitHub repository
export const importRepo = action({
  args: {
    repoUrl: v.string(),
    projectId: v.id('projects'),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, { repoUrl, projectId, branch }): Promise<ImportProgress> => {
    const progress: ImportProgress = {
      totalFiles: 0,
      processedFiles: 0,
      importedFiles: 0,
      skippedFiles: 0,
      currentFile: null,
      errors: [],
    }

    try {
      // Parse the GitHub URL
      const parsed = parseGitHubUrl(repoUrl)
      if (!parsed) {
        throw new Error(
          'Invalid GitHub URL. Expected format: github.com/owner/repo or https://github.com/owner/repo'
        )
      }

      const { owner, repo } = parsed
      const targetBranch = branch || parsed.branch || 'main'

      // Update project with repo URL
      await ctx.runMutation(api.github.updateProjectRepoUrl, {
        projectId,
        repoUrl: `https://github.com/${owner}/${repo}`,
      })

      // Fetch all files from the repository
      const files = await fetchRepoContents(owner, repo, targetBranch)

      // Filter files to import
      const filesToImport = []
      for (const file of files) {
        const check = shouldImportFile(file.path, file.size)
        if (check.shouldImport) {
          filesToImport.push(file)
        } else {
          progress.skippedFiles++
        }

        // Stop if we've reached the limit
        if (filesToImport.length >= MAX_FILES) {
          break
        }
      }

      progress.totalFiles = filesToImport.length

      // Import files
      for (const file of filesToImport) {
        progress.currentFile = file.path
        progress.processedFiles++

        try {
          // Get file content
          let content: string
          if (file.content) {
            // Content is base64 encoded in the API response
            // Use atob() instead of Buffer (not available in Convex V8 isolate)
            const binary = atob(file.content)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i)
            }
            content = new TextDecoder().decode(bytes)
          } else {
            // Fetch raw content
            content = await fetchFileContent(owner, repo, file.path, targetBranch)
          }

          // Save file to Convex
          await ctx.runMutation(api.github.createFile, {
            projectId,
            path: file.path,
            content,
          })

          progress.importedFiles++
        } catch (error) {
          const errorMsg = `Failed to import ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`
          progress.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      progress.currentFile = null
      return progress
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during import'
      progress.errors.push(errorMsg)
      throw new Error(errorMsg)
    }
  },
})

// Mutation to update project repo URL
export const updateProjectRepoUrl = mutation({
  args: {
    projectId: v.id('projects'),
    repoUrl: v.string(),
  },
  handler: async (ctx, { projectId, repoUrl }) => {
    await ctx.db.patch(projectId, {
      repoUrl,
    })
  },
})

// Mutation to create a file
export const createFile = mutation({
  args: {
    projectId: v.id('projects'),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { projectId, path, content }) => {
    const now = Date.now()

    // Check if file already exists
    const existing = await ctx.db
      .query('files')
      .withIndex('by_path', (q) => q.eq('projectId', projectId).eq('path', path))
      .unique()

    if (existing) {
      // Update existing file
      await ctx.db.patch(existing._id, {
        content,
        updatedAt: now,
      })
    } else {
      // Create new file
      await ctx.db.insert('files', {
        projectId,
        path,
        content,
        isBinary: false,
        updatedAt: now,
      })
    }
  },
})

// Get available branches for a repo
export const getBranches = action({
  args: {
    repoUrl: v.string(),
  },
  handler: async (ctx, { repoUrl }): Promise<string[]> => {
    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      throw new Error('Invalid GitHub URL')
    }

    const { owner, repo } = parsed
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/branches`

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Panda.ai GitHub Importer',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.status}`)
    }

    const branches = await response.json()
    return branches.map((b: { name: string }) => b.name)
  },
})
