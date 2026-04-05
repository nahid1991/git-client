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
    'git:get-commit-diff',
    async (_, repoPath: string, hash: string) => {
      const git = simpleGit(repoPath)
      const diff = await git.show([hash, '--stat', '--format=']) // Only show the stat, empty format removes commit msg body
      return diff
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
