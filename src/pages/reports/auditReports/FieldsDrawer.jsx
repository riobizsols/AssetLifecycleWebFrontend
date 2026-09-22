import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FIELD_GROUPS } from './constants';

const ANIM_MS = 280;

export default function FieldsDrawer({
  open,
  draftFields,
  setDraftFields,
  onClose,
  onReset,
  onApply,
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setVisible(false);
    const timer = setTimeout(() => setMounted(false), ANIM_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className={`absolute inset-0 bg-slate-900/30 transition-opacity ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
        aria-label="Close fields drawer"
        onClick={onClose}
      />
      <aside
        className={`relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Customize report</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {FIELD_GROUPS.map((group) => (
            <div key={group.id}>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">{group.title}</h4>
              <div className="space-y-2">
                {group.fields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#143d65] focus:ring-[#143d65]"
                      checked={Boolean(draftFields[field.key])}
                      onChange={() =>
                        setDraftFields((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                    />
                    <span className="text-sm text-slate-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-white">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#143d65] hover:bg-[#1e5a8a]"
            >
              Apply
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
