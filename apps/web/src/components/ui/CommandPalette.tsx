import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  badge?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  items,
  placeholder = 'Type a command, search resources, or ask Cline...',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  // Group items by category
  const categories = Array.from(new Set(filteredItems.map((i) => i.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col z-10 animate-slide-up">
        {/* Search input header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Search results */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching commands or resources found for &quot;{query}&quot;
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filteredItems.filter((i) => i.category === cat);
              return (
                <div key={cat} className="py-1">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                    {cat}
                  </div>
                  {catItems.map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          item.onSelect();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none',
                          isSelected
                            ? 'bg-cyan-500/10 border border-cyan-500/30 text-white shadow-glow-cyan'
                            : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.icon && (
                            <span
                              className={cn(
                                'w-4 h-4 shrink-0',
                                isSelected ? 'text-cyan-400' : 'text-slate-400'
                              )}
                            >
                              {item.icon}
                            </span>
                          )}
                          <div className="truncate">
                            <div className="text-xs font-medium truncate flex items-center gap-2">
                              <span>{item.label}</span>
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.shortcut && (
                            <div className="flex items-center gap-1">
                              {item.shortcut.map((key) => (
                                <kbd
                                  key={key}
                                  className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">↓</kbd> to
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">↵</kbd> to
              select
            </span>
          </div>
          <span className="flex items-center gap-1 text-cyan-400">
            Synapse Intelligent Navigation <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
