import React, { useState } from 'react'
import { FolderOpen, GitBranch, Cloud, ChevronRight, ChevronDown } from 'lucide-react'
import { GitBranch as IGitBranch } from '../types/git'

interface TreeNode {
  name: string
  isLeaf: boolean
  branch?: IGitBranch
  children: Record<string, TreeNode>
}

const buildTree = (branches: IGitBranch[]): TreeNode => {
  const root: TreeNode = { name: 'root', isLeaf: false, children: {} }

  // Sort branches alphabetically for predictable tree ordering
  const sortedBranches = [...branches].sort((a, b) => a.name.localeCompare(b.name))

  sortedBranches.forEach((b) => {
    const cleanName = b.isRemote ? b.name.replace('remotes/', '') : b.name
    const parts = cleanName.split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLeaf = i === parts.length - 1
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          isLeaf: false,
          children: {}
        }
      }
      if (isLeaf) {
        current.children[part].isLeaf = true
        current.children[part].branch = b
      }
      current = current.children[part]
    }
  })

  return root
}

const BranchTreeNode: React.FC<{
  node: TreeNode
  level: number
  onCheckout: (b: string) => void
  onContextMenu: (e: React.MouseEvent, b: string) => void
}> = ({ node, level, onCheckout, onContextMenu }) => {
  const [expanded, setExpanded] = useState(true)

  if (node.name === 'root') {
    return (
      <>
        {Object.values(node.children).map((child) => (
          <BranchTreeNode
            key={child.name}
            node={child}
            level={0}
            onCheckout={onCheckout}
            onContextMenu={onContextMenu}
          />
        ))}
      </>
    )
  }

  if (node.isLeaf) {
    const b = node.branch!
    return (
      <div
        className={`branch-item ${b.current ? 'current' : ''}`}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onDoubleClick={() => onCheckout(b.name)}
        onContextMenu={(e) => onContextMenu(e, b.name)}
      >
        {b.isRemote ? (
          <Cloud size={14} className="icon-remote" style={{ minWidth: 14 }} />
        ) : (
          <GitBranch size={14} className="icon-local" style={{ minWidth: 14 }} />
        )}
        <span className="branch-name" style={{ marginLeft: '6px' }}>{node.name}</span>
      </div>
    )
  }

  return (
    <div>
      <div
        className="branch-folder"
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={14} style={{ minWidth: 14 }} />
        ) : (
          <ChevronRight size={14} style={{ minWidth: 14 }} />
        )}
        <span className="branch-name" style={{ marginLeft: '6px' }}>{node.name}</span>
      </div>
      {expanded && (
        <div className="branch-folder-children">
          {Object.values(node.children).map((child) => (
            <BranchTreeNode
              key={child.name}
              node={child}
              level={level + 1}
              onCheckout={onCheckout}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  repoPath: string | null
  currentBranch: string | null
  branches: IGitBranch[]
  onOpenRepo: () => void
  onCheckout: (branchName: string) => void
  onMerge: (branchName: string) => void
  onRebase: (branchName: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  repoPath,
  currentBranch,
  branches,
  onOpenRepo,
  onCheckout,
  onMerge,
  onRebase
}) => {
  const localBranchesTree = buildTree(branches.filter((b) => !b.isRemote))
  const remoteBranchesTree = buildTree(branches.filter((b) => b.isRemote))

  const [contextMenu, setContextMenu] = React.useState<{
    x: number
    y: number
    branch: string
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, branchName: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, branch: branchName })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  React.useEffect(() => {
    document.addEventListener('click', closeContextMenu)
    return () => document.removeEventListener('click', closeContextMenu)
  }, [])

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="btn-primary" onClick={onOpenRepo}>
          <FolderOpen size={16} /> Open Repository
        </button>
        {repoPath && (
          <div className="repo-path" title={repoPath}>
            {repoPath.split('/').pop()}
          </div>
        )}
      </div>

      {repoPath && (
        <div className="sidebar-content">
          <div className="branch-section">
            <h3>Local Branches</h3>
            <div className="branch-list">
              <BranchTreeNode
                node={localBranchesTree}
                level={0}
                onCheckout={onCheckout}
                onContextMenu={handleContextMenu}
              />
            </div>
          </div>

          <div className="branch-section">
            <h3>Remote Branches</h3>
            <div className="branch-list">
              <BranchTreeNode
                node={remoteBranchesTree}
                level={0}
                onCheckout={onCheckout}
                onContextMenu={handleContextMenu}
              />
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              onCheckout(contextMenu.branch)
              closeContextMenu()
            }}
          >
            Checkout
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onMerge(contextMenu.branch)
              closeContextMenu()
            }}
          >
            Merge into {currentBranch}
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onRebase(contextMenu.branch)
              closeContextMenu()
            }}
          >
            Rebase {currentBranch} onto this
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
