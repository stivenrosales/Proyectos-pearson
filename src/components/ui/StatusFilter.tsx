'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';

interface StatusFilterProps {
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
  options: string[];
}

export function StatusFilter({ selectedStatuses, onChange, options }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      // Allow deselecting - can have 0 selected
      onChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  const toggleAll = () => {
    // If all selected, deselect all. Otherwise, select all.
    if (selectedStatuses.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || '#6b7280';
  };

  // Display text for the button
  const displayText = () => {
    if (selectedStatuses.length === 0) {
      return 'Sin filtro de estado';
    }
    if (selectedStatuses.length === options.length) {
      return 'Todos los estados';
    }
    if (selectedStatuses.length === 1) {
      return selectedStatuses[0];
    }
    return `${selectedStatuses.length} estados`;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl text-left',
          'bg-white/5 border border-white/10',
          'text-white/90 text-sm',
          'hover:bg-white/10 hover:border-white/20',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
          'transition-all duration-200',
          'flex items-center justify-between gap-2'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Color dots for selected statuses */}
          {selectedStatuses.length > 0 && (
            <div className="flex -space-x-1">
              {selectedStatuses.slice(0, 3).map((status) => (
                <div
                  key={status}
                  className="w-3 h-3 rounded-full border-2 border-slate-900"
                  style={{ backgroundColor: getStatusColor(status) }}
                />
              ))}
              {selectedStatuses.length > 3 && (
                <div className="w-3 h-3 rounded-full border-2 border-slate-900 bg-white/20 flex items-center justify-center">
                  <span className="text-[6px] text-white font-bold">+{selectedStatuses.length - 3}</span>
                </div>
              )}
            </div>
          )}
          <span className="truncate">{displayText()}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-white/50 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-[100] w-full mt-2',
              'bg-slate-900/95 backdrop-blur-xl',
              'border border-white/10 rounded-xl',
              'shadow-xl shadow-black/30',
              'overflow-hidden'
            )}
          >
            {/* Select All Option */}
            <button
              type="button"
              onClick={toggleAll}
              className={cn(
                'w-full px-4 py-2.5 text-left text-sm',
                'hover:bg-white/10 transition-colors',
                'flex items-center gap-3',
                'border-b border-white/10',
                selectedStatuses.length === options.length
                  ? 'text-purple-400'
                  : 'text-white/70'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center',
                  'transition-colors',
                  selectedStatuses.length === options.length
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-white/30'
                )}
              >
                {selectedStatuses.length === options.length && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span>Todos los estados</span>
            </button>

            {/* Status Options */}
            <div className="py-1">
              {options.map((status) => {
                const isSelected = selectedStatuses.includes(status);
                const color = getStatusColor(status);

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm',
                      'hover:bg-white/10 transition-colors',
                      'flex items-center gap-3',
                      isSelected ? 'text-white' : 'text-white/50'
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center',
                        'transition-colors',
                        isSelected
                          ? 'border-transparent'
                          : 'border-white/30'
                      )}
                      style={{
                        backgroundColor: isSelected ? color : 'transparent',
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* Status dot and name */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
