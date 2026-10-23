/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA "What should I study now?" Recommendation Modal
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { recommendNextStudyTask } from '../lib/studyScheduler';
import { Sparkles, Clock, BookOpen, Layers, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export const StudyNowModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { courses, lessons, dueFlashcardsCount, navigateToStudyRoom, navigateToRevision } = useApp();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(45);

  if (!isOpen) return null;

  const recommendation = recommendNextStudyTask(courses, lessons, dueFlashcardsCount, selectedMinutes);

  const handleLaunch = () => {
    if (!recommendation) return;
    if (recommendation.taskType === 'spaced_recall') {
      navigateToRevision(recommendation.course.id);
    } else {
      navigateToStudyRoom(recommendation.lesson.id, recommendation.course.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">What should I study now?</h3>
              <p className="text-xs text-slate-400">Intelligent prioritisation based on your syllabus & performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Available time picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              How much time do you have right now?
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSelectedMinutes(mins)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center space-y-1 transition-all ${
                    selectedMinutes === mins
                      ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{mins} mins</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recommendation card */}
          {recommendation ? (
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {recommendation.course.code}
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>{recommendation.recommendedDuration} min session</span>
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {recommendation.lesson.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {recommendation.course.title} • Lecturer: {recommendation.course.lecturer || 'Department'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{recommendation.reason}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              No lessons currently found. Upload your first lecture PDF in My Library!
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!recommendation}
              onClick={handleLaunch}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              <span>Launch Focused Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
