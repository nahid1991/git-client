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

export interface IGitAPI {
  openRepo: () => Promise<string | null>
  getStatus: (path: string) => Promise<GitStatusResult>
  getCommits: (path: string) => Promise<GitCommit[]>
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
