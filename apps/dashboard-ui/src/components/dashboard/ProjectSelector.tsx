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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get selected project name
  const selectedProject = projects.find(p => p.id === selectedId);

  // Dynamic accent color classes
  const accentColorClass = accentColor === 'violet' ? 'text-accent-violet' : 'text-accent-blue';
  const accentBgClass = accentColor === 'violet' ? 'bg-accent-violet/10' : 'bg-accent-blue/10';
  const accentRingClass = accentColor === 'violet' ? 'ring-accent-violet/30' : 'ring-accent-blue/30';
  const accentFocusRingClass = accentColor === 'violet' ? 'focus:ring-accent-violet/50' : 'focus:ring-accent-blue/50';

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

  // Keyboard navigation for dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % projects.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex(prev => (prev - 1 + projects.length) % projects.length);
      } else if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault();
        handleSelect(projects[focusedIndex].id);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, projects]);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleSelect = (projectId: string) => {
    onSelect(projectId);
    setIsOpen(false);
  };


  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 bg-glass-bg border border-glass-border px-3 py-1.5 rounded-xl text-xs font-bold outline-none h-9 transition-all",
          isOpen ? `ring-2 ${accentRingClass}` : accentFocusRingClass,
          "hover:bg-glass-bg/80"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Folder className={clsx("w-4 h-4", accentColorClass)} />
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
              projects.map((project, index) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150",
                    "hover:bg-glass-bg/50",
                    project.id === selectedId ? accentBgClass : "",
                    focusedIndex === index ? "bg-glass-bg/70 outline-none ring-1 ring-inset ring-accent-blue/30" : ""
                  )}
                  role="option"
                  aria-selected={project.id === selectedId}
                >
                  <Folder className={clsx("w-4 h-4 flex-shrink-0", accentColorClass)} />
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.id === selectedId && (
                    <Check className={clsx("w-4 h-4 flex-shrink-0", accentColorClass)} />
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
