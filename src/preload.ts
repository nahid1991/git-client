import { contextBridge, ipcRenderer } from 'electron'
import { GitCommit, GitStatusResult } from './types/git'

contextBridge.exposeInMainWorld('gitAPI', {
  openRepo: (): Promise<string | null> => ipcRenderer.invoke('git:open-repo'),
  getStatus: (path: string): Promise<GitStatusResult> =>
    ipcRenderer.invoke('git:get-status', path),
  getCommits: (path: string): Promise<GitCommit[]> =>
    ipcRenderer.invoke('git:get-commits', path),
  checkoutBranch: (path: string, branchName: string): Promise<void> =>
    ipcRenderer.invoke('git:checkout', path, branchName),
  mergeBranch: (path: string, branchName: string): Promise<void> =>
    ipcRenderer.invoke('git:merge', path, branchName),
  rebaseBranch: (path: string, branchName: string): Promise<void> =>
    ipcRenderer.invoke('git:rebase', path, branchName),
  getCommitFiles: (path: string, hash: string): Promise<any[]> =>
    ipcRenderer.invoke('git:get-commit-files', path, hash),
  getFileDiff: (path: string, hash: string, filePath: string): Promise<string> =>
    ipcRenderer.invoke('git:get-file-diff', path, hash, filePath),
  getUncommittedFiles: (path: string): Promise<any[]> =>
    ipcRenderer.invoke('git:get-uncommitted-files', path)
})

