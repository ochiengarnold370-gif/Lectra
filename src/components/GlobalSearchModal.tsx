/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Global Academic Search Modal
 */

import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, X, BookOpen, Layers, Bookmark, ArrowRight, CornerDownLeft } from 'lucide-react';

export const GlobalSearchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { searchQuery, setSearchQuery, searchResults, navigateToLesson, navigateToRevision, setActiveTab } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (item: any) => {
    if (item.type === 'lesson' || item.type === 'term') {
      navigateToLesson(item.lessonId, item.courseId);
    } else if (item.type === 'course') {
      setActiveTab('courses');
    } else if (item.type === 'flashcard') {
      navigateToRevision(item.courseId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-850">
          <Search className="w-5 h-5 text-teal-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lectures, medical terminology (e.g. SA node, inotropy), flashcards..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
          >
            Esc
          </button>
        </div>

        {/* Results container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-800/40">
          {searchQuery.trim() === '' ? (
            <div className="py-10 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">Type to search your academic library</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Quickly locate clinical mechanisms, lecturer notes, anatomical boundaries, and revision questions.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No matches found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for general terms like &ldquo;action potential&rdquo;, &ldquo;calcium&rdquo;, or &ldquo;HNS&rdquo;.
              </p>
            </div>
          ) : (
            searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-500/20">
                      {item.badge}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-teal-300 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-1">{item.subtitle}</p>
                </div>
                <CornerDownLeft className="w-4 h-4 text-slate-600 group-hover:text-teal-400 shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</kbd> Close
            </span>
          </div>
          <span>LECTRA Academic Search</span>
        </div>
      </div>
    </div>
  );
};
