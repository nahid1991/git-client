import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface FileDiffViewerProps {
  repoPath: string
  commitHash: string
  filePath: string
  onClose: () => void
}

export const FileDiffViewer = ({ repoPath, commitHash, filePath, onClose }: FileDiffViewerProps) => {
  const [diffText, setDiffText] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    window.gitAPI.getFileDiff(repoPath, commitHash, filePath)
      .then(diff => {
        if (mounted) {
           setDiffText(diff)
           setLoading(false)
        }
      })
      .catch(e => {
        console.error(e)
        if (mounted) {
           setDiffText('Failed to load diff')
           setLoading(false)
        }
      })
    return () => { mounted = false }
  }, [repoPath, commitHash, filePath])

  // Enhance syntax coloring natively per lines
  const renderDiffLine = (line: string, idx: number) => {
     let className = 'diff-line'
     if (line.startsWith('+') && !line.startsWith('+++')) className += ' diff-line-add'
     else if (line.startsWith('-') && !line.startsWith('---')) className += ' diff-line-remove'
     else if (line.startsWith('@@')) className += ' diff-line-header'

     return <div key={idx} className={className}>{line || ' '}</div>
  }

  return (
    <div className="diff-viewer-overlay">
      <div className="diff-viewer-container">
         <div className="diff-viewer-topbar">
           <span className="diff-file-path">{filePath} <span className="diff-hash">({commitHash === 'WIP' ? 'Status: Uncommitted' : commitHash.substring(0,8)})</span></span>
           <button className="diff-close-btn" onClick={onClose}><X size={20}/></button>
         </div>
         <div className="diff-content">
            {loading ? <div className="diff-loading">Loading patch sequence...</div> : (
               <pre className="diff-text-area">
                  {diffText ? diffText.split('\n').map(renderDiffLine) : <div className="diff-line">No diff text available for this action.</div>}
               </pre>
            )}
         </div>
      </div>
    </div>
  )
}
