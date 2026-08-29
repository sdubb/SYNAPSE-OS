import React, { useState } from 'react';
import { WorkspaceFile } from '../../types/run';
import { FolderIcon, FileCodeIcon, ChevronDownIcon, ChevronRightIcon } from '../../components/common/Icons';

interface FileTreeProps {
  files: WorkspaceFile[];
  onSelectFile?: (file: WorkspaceFile) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ files, onSelectFile }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src/checkout': true,
    'src/payment': true,
    config: true,
  });

  const [selectedFileId, setSelectedFileId] = useState<string>('f_payment_svc');

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderFileNode = (item: WorkspaceFile, depth = 0) => {
    const isFolder = item.type === 'directory';
    const isExpanded = expandedFolders[item.path] ?? false;
    const isSelected = item.id === selectedFileId;

    return (
      <div key={item.id} className="flex flex-col">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(item.path);
            } else {
              setSelectedFileId(item.id);
              onSelectFile?.(item);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center justify-between py-1.5 pr-3 rounded-md text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-cyan-950/70 text-cyan-300 font-semibold'
              : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isFolder ? (
              <span className="text-slate-500">
                {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              </span>
            ) : (
              <span className="w-3" />
            )}

            {isFolder ? (
              <FolderIcon size={14} className="text-amber-400 shrink-0" />
            ) : (
              <FileCodeIcon size={14} className="text-cyan-400 shrink-0" />
            )}

            <span className="truncate">{item.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {item.status === 'modified' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                M
              </span>
            )}
            {item.status === 'added' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                A
              </span>
            )}
            {item.size && <span className="text-[10px] text-slate-500 font-mono">{(item.size / 1024).toFixed(1)}k</span>}
          </div>
        </div>

        {isFolder && isExpanded && item.children && (
          <div className="flex flex-col">
            {item.children.map((child) => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">WORKSPACE FILES</span>
        <span className="text-xs text-slate-500 font-mono">Repository Context</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {files.map((file) => renderFileNode(file, 0))}
      </div>
    </div>
  );
};
