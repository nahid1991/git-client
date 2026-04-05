import React, { useEffect, useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import CommitHistory from './components/CommitHistory'
import { GitBranch, GitCommit } from './types/git'
import './index.css'
import { RefreshCcw } from 'lucide-react'

function App() {
  const [repoPath, setRepoPath] = useState<string | null>(null)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [currentBranch, setCurrentBranch] = useState<string | null>(null)
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [loading, setLoading] = useState(false)

  const fetchGitData = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const status = await window.gitAPI.getStatus(path)
      setBranches(status.branches)
      setCurrentBranch(status.current)

      const commitHistory = await window.gitAPI.getCommits(path)
      setCommits(commitHistory)
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Failed to fetch git repo.')
      setRepoPath(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleOpenRepo = async () => {
    const path = await window.gitAPI.openRepo()
    if (path) {
      setRepoPath(path)
      fetchGitData(path)
    }
  }

  const handleCheckout = async (branchName: string) => {
    if (!repoPath) return
    setLoading(true)
    try {
      await window.gitAPI.checkoutBranch(repoPath, branchName)
      await fetchGitData(repoPath)
    } catch (e) {
      console.error(e)
      alert('Failed to checkout branch: ' + e)
    }
    setLoading(false)
  }

  const handleMerge = async (branchName: string) => {
    if (!repoPath) return
    setLoading(true)
    try {
      await window.gitAPI.mergeBranch(repoPath, branchName)
      await fetchGitData(repoPath)
    } catch (e) {
      console.error(e)
      alert('Failed to merge branch: ' + e)
    }
    setLoading(false)
  }

  const handleRebase = async (branchName: string) => {
    if (!repoPath) return
    setLoading(true)
    try {
      await window.gitAPI.rebaseBranch(repoPath, branchName)
      await fetchGitData(repoPath)
    } catch (e) {
      console.error(e)
      alert('Failed to rebase branch: ' + e)
    }
    setLoading(false)
  }

  return (
    <div className="app-layout">
      <Sidebar
        repoPath={repoPath}
        currentBranch={currentBranch}
        branches={branches}
        onOpenRepo={handleOpenRepo}
        onCheckout={handleCheckout}
        onMerge={handleMerge}
        onRebase={handleRebase}
      />
      <div className="main-content">
        {!repoPath ? (
          <div className="empty-state">
            <h1>Welcome to Git Client</h1>
            <p>Open a repository to get started.</p>
            <button className="btn-primary large" onClick={handleOpenRepo}>
              Select Repository
            </button>
          </div>
        ) : (
          <>
            <div className="top-bar">
              <div className="current-branch-badge">
                Branch: <strong>{currentBranch}</strong>
              </div>
              <button
                className={`btn-icon ${loading ? 'spin' : ''}`}
                onClick={() => fetchGitData(repoPath)}
              >
                <RefreshCcw size={16} />
              </button>
            </div>
            {commits.length > 0 ? (
              <CommitHistory commits={commits} repoPath={repoPath} />
            ) : (
              <div className="loading-state">
                {loading ? 'Fetching repository data...' : 'No commits found.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
