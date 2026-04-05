import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import simpleGit from 'simple-git'

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js')
    }
  })

  win.loadFile(path.join(__dirname, '../dist/index.html'))
  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  // IPC Git Handlers
  ipcMain.handle('git:open-repo', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('git:get-status', async (_, repoPath: string) => {
    try {
      const git = simpleGit(repoPath)
      const isRepo = await git.checkIsRepo()
      if (!isRepo) throw new Error('Not a git repository')
      
      const branchSummary = await git.branch()
      const branches = Object.values(branchSummary.branches).map((b) => ({
        name: b.name,
        commit: b.commit,
        current: b.current,
        isRemote: b.name.startsWith('remotes/')
      }))
      return {
        current: branchSummary.current,
        branches
      }
    } catch (e) {
      throw e
    }
  })

  ipcMain.handle('git:get-commits', async (_, repoPath: string) => {
    const git = simpleGit(repoPath)
    const logSummary = await git.log({
      '--all': null,
      '--decorate': 'short',
      format: {
        hash: '%H',
        parents: '%P',
        date: '%aI',
        message: '%s',
        refs: '%D',
        body: '%b',
        author_name: '%an',
        author_email: '%ae'
      }
    })
    return logSummary.all.map((commit: any) => ({
      hash: commit.hash,
      parents: commit.parents ? commit.parents.split(' ').filter(Boolean) : [],
      date: commit.date,
      message: commit.message,
      refs: commit.refs,
      body: commit.body,
      author_name: commit.author_name,
      author_email: commit.author_email
    }))
  })

  ipcMain.handle(
    'git:checkout',
    async (_, repoPath: string, branchName: string) => {
      const git = simpleGit(repoPath)
      // If it's a remote branch, checkout local tracking branch. For simplicity, just checkout directly.
      const cleanBranchName = branchName.replace('remotes/origin/', '')
      await git.checkout(cleanBranchName)
    }
  )

  ipcMain.handle(
    'git:merge',
    async (_, repoPath: string, branchName: string) => {
      const git = simpleGit(repoPath)
      await git.merge([branchName])
    }
  )

  ipcMain.handle(
    'git:rebase',
    async (_, repoPath: string, branchName: string) => {
      const git = simpleGit(repoPath)
      await git.rebase([branchName])
    }
  )

  ipcMain.handle(
    'git:get-file-diff',
    async (_, repoPath: string, hash: string, filePath: string) => {
      const git = simpleGit(repoPath)
      if (hash === 'WIP') {
         // View working directory changes for this file against HEAD
         return await git.diff(['HEAD', '--', filePath])
      } else {
         // View exact patch for this commit without message metadata
         return await git.raw(['log', '-1', '-p', '--format=', hash, '--', filePath])
      }
    }
  )

  ipcMain.handle(
    'git:get-commit-files',
    async (_, repoPath: string, hash: string) => {
      const git = simpleGit(repoPath)
      // --name-status returns a list of files and their statuses (e.g. M, A, D) without full text diff
      const out = await git.raw(['show', '--name-status', '--format=', hash])

      const files = out
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const parts = line.split('\t')
          if (parts.length >= 2) {
            const statusStr = parts[0].trim()
            const status = statusStr[0]
            const path = parts[parts.length - 1].trim()
            return { status, path }
          }
          return { status: 'U', path: line }
        })
      return files
    }
  )
  ipcMain.handle(
    'git:get-uncommitted-files',
    async (_, repoPath: string) => {
      const git = simpleGit(repoPath)
      const status = await git.status()
      const files: { status: string, path: string }[] = []
      
      status.modified.forEach(f => files.push({ status: 'M', path: f }))
      status.created.forEach(f => files.push({ status: 'A', path: f }))
      status.deleted.forEach(f => files.push({ status: 'D', path: f }))
      status.not_added.forEach(f => files.push({ status: 'U', path: f }))
      status.renamed.forEach(f => files.push({ status: 'R', path: f.to }))
      
      return files
    }
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
