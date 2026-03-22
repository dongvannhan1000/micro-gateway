'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Folder, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedId: string;
  onSelect: (projectId: string) => void;
  accentColor?: 'blue' | 'violet';
}

export function ProjectSelector({ projects, selectedId, onSelect, accentColor = 'blue' }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get selected project name
  const selectedProject = projects.find(p => p.id === selectedId);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (projectId: string) => {
    onSelect(projectId);
    setIsOpen(false);
  };

  const accentClass = accentColor === 'blue' ? 'focus:ring-accent-blue/50' : 'focus:ring-accent-violet/50';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 bg-glass-bg border border-glass-border px-3 py-1.5 rounded-xl text-xs font-bold outline-none h-9 transition-all",
          isOpen ? "ring-2 ring-accent-blue/30" : accentClass,
          "hover:bg-glass-bg/80"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Folder className="w-4 h-4 text-accent-blue" />
        <span className="max-w-[150px] truncate">
          {selectedProject?.name || 'Select a project'}
        </span>
        <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-full min-w-[200px] bg-glass-bg border border-glass-border rounded-xl shadow-lg z-50 animate-in slide-in-from-top-2 duration-200"
          role="listbox"
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted">
                No projects found
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150",
                    "hover:bg-glass-bg/50",
                    project.id === selectedId ? "bg-accent-blue/10" : ""
                  )}
                  role="option"
                  aria-selected={project.id === selectedId}
                >
                  <Folder className="w-4 h-4 text-accent-blue flex-shrink-0" />
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.id === selectedId && (
                    <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
