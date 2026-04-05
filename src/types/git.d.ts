export interface GitCommit {
  hash: string
  parents: string[]
  date: string
  message: string
  refs: string
  body: string
  author_name: string
  author_email: string
}

export interface GitBranch {
  name: string
  commit: string
  current: boolean
  isRemote: boolean
}

export interface GitStatusResult {
  current: string | null
  branches: GitBranch[]
}

export interface GitFileChange {
  path: string
  status: string // e.g. M, A, D, R, etc.
}

export interface IGitAPI {
  openRepo: () => Promise<string | null>
  getStatus: (path: string) => Promise<GitStatusResult>
  getCommits: (path: string) => Promise<GitCommit[]>
  getCommitFiles: (path: string, hash: string) => Promise<GitFileChange[]>
  getFileDiff: (path: string, hash: string, filePath: string) => Promise<string>
  getUncommittedFiles: (path: string) => Promise<GitFileChange[]>
  checkoutBranch: (path: string, branchName: string) => Promise<void>
  mergeBranch: (path: string, branchName: string) => Promise<void>
  rebaseBranch: (path: string, branchName: string) => Promise<void>
  getCommitDiff: (path: string, hash: string) => Promise<string>
}

declare global {
  interface Window {
    gitAPI: IGitAPI
  }
}
