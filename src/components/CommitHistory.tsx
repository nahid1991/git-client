import React, { useState, useMemo } from 'react'
import { GitCommit as IGitCommit } from '../types/git'
import { GitCommit, User, ChevronDown, ChevronRight } from 'lucide-react'

interface CommitHistoryProps {
  commits: IGitCommit[]
  repoPath: string
}

export interface Edge {
  fromCol: number
  toCol: number
  color: string
}

export interface RowGraphCtx {
  nodeCol: number
  nodeColor: string
  edgesFromTop: Edge[]
  edgesToBottom: Edge[]
  maxCol: number
}

const BRANCH_COLORS = [
  '#6366f1',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
]

function computeGraph(commits: IGitCommit[]): RowGraphCtx[] {
  const result: RowGraphCtx[] = []
  let activeBranches: string[] = []

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    const incomingBranches = [...activeBranches]

    let x = activeBranches.indexOf(commit.hash)
    if (x === -1) {
      x = activeBranches.indexOf(null as any)
      if (x === -1) x = activeBranches.length
    }

    const nodeCol = x
    const nodeColor = BRANCH_COLORS[x % BRANCH_COLORS.length]

    const edgesFromTop: Edge[] = []
    const edgesToBottom: Edge[] = []

    incomingBranches.forEach((hash, c) => {
      if (hash) {
        if (hash === commit.hash) {
          edgesFromTop.push({ fromCol: c, toCol: x, color: BRANCH_COLORS[c % BRANCH_COLORS.length] })
        } else {
          edgesFromTop.push({ fromCol: c, toCol: c, color: BRANCH_COLORS[c % BRANCH_COLORS.length] })
        }
      }
    })

    const outgoingBranches = [...incomingBranches]
    outgoingBranches[nodeCol] = null as any

    const parents = commit.parents || []
    if (parents.length > 0) {
      const p0 = parents[0]
      const p0Existing = outgoingBranches.indexOf(p0)

      let p0Col = nodeCol
      if (p0Existing !== -1 && p0Existing !== nodeCol) {
        p0Col = p0Existing
      } else {
        outgoingBranches[nodeCol] = p0
      }

      edgesToBottom.push({ fromCol: nodeCol, toCol: p0Col, color: nodeColor })

      for (let pIdx = 1; pIdx < parents.length; pIdx++) {
        const px = parents[pIdx]
        let pCol = outgoingBranches.indexOf(px)
        if (pCol === -1) {
          pCol = outgoingBranches.indexOf(null as any)
          if (pCol === -1) pCol = outgoingBranches.length
          outgoingBranches[pCol] = px
        }
        edgesToBottom.push({ fromCol: nodeCol, toCol: pCol, color: BRANCH_COLORS[pCol % BRANCH_COLORS.length] })
      }
    }

    outgoingBranches.forEach((hash, c) => {
      if (hash && hash !== parents[0]) {
        if (incomingBranches[c] === hash) {
          edgesToBottom.push({ fromCol: c, toCol: c, color: BRANCH_COLORS[c % BRANCH_COLORS.length] })
        }
      }
    })

    const currentMaxCol = Math.max(incomingBranches.length, outgoingBranches.length)

    result.push({
      nodeCol,
      nodeColor,
      edgesFromTop,
      edgesToBottom,
      maxCol: currentMaxCol === 0 ? 1 : currentMaxCol
    })

    activeBranches = outgoingBranches
  }

  return result
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ commits, repoPath }) => {
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [diffs, setDiffs] = useState<Record<string, string>>({})

  const parseRefs = (refsString: string) => {
    if (!refsString) return []
    return refsString.split(', ').map((r) => r.trim())
  }

  const isRemoteRef = (ref: string) =>
    ref.includes('remote') || ref.includes('origin')

  const handleCommitClick = async (hash: string) => {
    if (expandedCommit === hash) {
      setExpandedCommit(null)
      return
    }
    
    setExpandedCommit(hash)
    if (!diffs[hash]) {
      try {
        const diff = await window.gitAPI.getCommitDiff(repoPath, hash)
        setDiffs(prev => ({ ...prev, [hash]: diff }))
      } catch (e) {
        console.error("Failed to load diff", e)
      }
    }
  }

  const graph = useMemo(() => computeGraph(commits), [commits])

  return (
    <div className="commit-history-container">
      <div className="commit-history-header">
        <h2>Commit History</h2>
      </div>
      <div className="commit-list">
        {commits.map((commit, index) => {
          const refs = parseRefs(commit.refs)
          const isExpanded = expandedCommit === commit.hash
          const diffText = diffs[commit.hash]
          const ctx = graph[index]

          return (
            <div key={commit.hash + index} className="commit-item-wrapper">
              <div 
                className={`commit-item ${isExpanded ? 'expanded' : ''}`}
                onClick={() => handleCommitClick(commit.hash)}
              >
                <div className="commit-graph-column" style={{ width: `${ctx.maxCol * 16 + 24}px`, minWidth: `${ctx.maxCol * 16 + 24}px`, position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${ctx.maxCol * 16 + 24} 10`} preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
                     {ctx.edgesFromTop.map((edge, i) => (
                       <path key={`top-${i}`} d={`M ${edge.fromCol * 16 + 12} 0 C ${edge.fromCol * 16 + 12} 2.5, ${edge.toCol * 16 + 12} 2.5, ${edge.toCol * 16 + 12} 5`} stroke={edge.color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
                     ))}
                     {ctx.edgesToBottom.map((edge, i) => (
                       <path key={`bottom-${i}`} d={`M ${edge.fromCol * 16 + 12} 5 C ${edge.fromCol * 16 + 12} 7.5, ${edge.toCol * 16 + 12} 7.5, ${edge.toCol * 16 + 12} 10`} stroke={edge.color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
                     ))}
                  </svg>
                  <div
                    className="commit-node"
                    style={{
                      position: 'absolute',
                      left: `${ctx.nodeCol * 16 + 12}px`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: ctx.nodeColor,
                      boxShadow: `0 0 0 2px ${ctx.nodeColor}40`,
                      margin: 0,
                      zIndex: 2
                    }}
                  />
                </div>
                <div className="commit-content">
                  <div className="commit-message">
                    {commit.message}
                    {refs.length > 0 && (
                      <div className="commit-badges">
                        {refs.map((ref) => (
                          <span
                            key={ref}
                            className={`badge ${isRemoteRef(ref) ? 'badge-remote' : 'badge-local'}`}
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="commit-meta">
                    <span className="commit-author">
                      <User size={12} /> {commit.author_name}
                    </span>
                    <span className="commit-date">
                      {new Date(commit.date).toLocaleString()}
                    </span>
                    <span className="commit-hash">
                      {commit.hash.substring(0, 7)}
                    </span>
                    {isExpanded ? <ChevronDown size={14} className="expand-icon" /> : <ChevronRight size={14} className="expand-icon" />}
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <div className="commit-diff-panel">
                  {diffText ? (
                    <pre className="diff-text">{diffText}</pre>
                  ) : (
                    <div className="diff-loading">Loading changes...</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CommitHistory
