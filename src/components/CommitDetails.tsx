import React, { useEffect, useState, useMemo } from 'react'
import { GitCommit, GitFileChange } from '../types/git'
import { FileEdit, Plus, Minus, FileText, CornerUpRight, Folder, ChevronDown, ChevronRight } from 'lucide-react'

interface FileNode {
  name: string
  isLeaf: boolean
  file?: GitFileChange
  children: Record<string, FileNode>
}

const buildFileTree = (files: GitFileChange[]): FileNode => {
  const root: FileNode = { name: 'root', isLeaf: false, children: {} }
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
  
  sorted.forEach(f => {
     const parts = f.path.split('/')
     let current = root
     for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLeaf = i === parts.length - 1
        if (!current.children[part]) {
           current.children[part] = { name: part, isLeaf: false, children: {} }
        }
        if (isLeaf) {
           current.children[part].isLeaf = true
           current.children[part].file = f
        }
        current = current.children[part]
     }
  })
  return root
}

const FileTreeNode = ({ node, level, getFileIcon, onFileClick }: { node: FileNode, level: number, getFileIcon: (s:string) => React.ReactNode, onFileClick: (path: string) => void }) => {
  const [expanded, setExpanded] = useState(true)
  
  if (node.name === 'root') {
      return (
         <>
         {Object.values(node.children).map(c => <FileTreeNode key={c.name} node={c} level={0} getFileIcon={getFileIcon} onFileClick={onFileClick} />)}
         </>
      )
  }
  
  if (node.isLeaf) {
      return (
         <div className="file-item" style={{ paddingLeft: `${level * 16 + 20}px` }} onClick={() => onFileClick(node.file!.path)}>
            {getFileIcon(node.file!.status)}
            <span className="file-path">{node.name}</span>
         </div>
      )
  }
  
  return (
      <div>
         <div className="file-folder file-item" style={{ paddingLeft: `${level * 16 + 8}px` }} onClick={() => setExpanded(!expanded)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {expanded ? <ChevronDown size={14} color="var(--text-muted)"/> : <ChevronRight size={14} color="var(--text-muted)"/>}
                <Folder size={14} className="status-u"/>
                <span className="file-path">{node.name}</span>
            </div>
         </div>
         {expanded && Object.values(node.children).map(c => <FileTreeNode key={c.name} node={c} level={level+1} getFileIcon={getFileIcon} onFileClick={onFileClick} />)}
      </div>
  )
}

interface CommitDetailsProps {
  commit: GitCommit
  repoPath: string
  onFileClick?: (hash: string, path: string) => void
}

export const CommitDetails = ({ commit, repoPath, onFileClick }: CommitDetailsProps) => {
  const [files, setFiles] = useState<GitFileChange[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('path')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    
    const fetchCall = commit.hash === 'WIP'
        ? window.gitAPI.getUncommittedFiles(repoPath)
        : window.gitAPI.getCommitFiles(repoPath, commit.hash)
        
    fetchCall
      .then((data) => {
        if (mounted) {
          setFiles(data)
          setLoading(false)
        }
      })
      .catch((e) => {
        console.error(e)
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [commit.hash, repoPath])

  const [title, ...bodyParts] = commit.message.split('\n')
  const body = bodyParts.join('\n').trim() || commit.body

  const getFileIcon = (status: string) => {
    switch (status) {
      case 'M':
        return <FileEdit size={14} className="status-m" />
      case 'A':
        return <Plus size={14} className="status-a" />
      case 'D':
        return <Minus size={14} className="status-d" />
      case 'R':
        return <CornerUpRight size={14} className="status-r" />
      default:
        return <FileText size={14} className="status-u" />
    }
  }

  const fileTree = useMemo(() => buildFileTree(files), [files])

  return (
    <div className="commit-details-panel">
      <div className="commit-details-header">
        <span className="hash-title">
           {commit.hash === 'WIP' ? 'Status: Uncommitted' : `commit: ${commit.hash.substring(0, 8)}`}
        </span>
      </div>

      <div className="commit-details-content">
        <div className="commit-info-card">
          <h3 className="commit-title">{title}</h3>
          {body && <p className="commit-body">{body}</p>}

          <div className="commit-author-card">
            <div className="avatar">{commit.author_name.charAt(0).toUpperCase()}</div>
            <div className="author-info">
              <div className="author-name-row">
                <span className="author-name">{commit.author_name}</span>
                {commit.parents && commit.parents.length > 0 && (
                  <span className="parent-hash">
                    parent: {commit.parents[0].substring(0, 7)}
                    {commit.parents.length > 1 && ` +${commit.parents.length - 1} more`}
                  </span>
                )}
              </div>
              <div className="author-date">
                authored {new Date(commit.date).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="files-section">
          <div className="files-header">
            <span className="files-count">{files.length} modified</span>
            <div className="files-toggles">
              <button 
                 className={`toggle-btn ${viewMode === 'path' ? 'active' : ''}`}
                 onClick={() => setViewMode('path')}
              >Path</button>
              <button 
                 className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
                 onClick={() => setViewMode('tree')}
              >Tree</button>
            </div>
          </div>

          <div className="files-list">
            {loading ? (
              <div className="files-loading">Loading modifications...</div>
            ) : viewMode === 'path' ? (
              files.map((file, idx) => (
                <div key={idx} className="file-item" onClick={() => onFileClick?.(commit.hash, file.path)}>
                  {getFileIcon(file.status)}
                  <span className="file-path">{file.path}</span>
                </div>
              ))
            ) : (
               <FileTreeNode node={fileTree} level={0} getFileIcon={getFileIcon} onFileClick={(path) => onFileClick?.(commit.hash, path)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

