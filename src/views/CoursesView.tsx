/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Courses, Units, & Lecturer Notes Management Workspace
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Course, CourseUnit, Lesson, DocumentRecord, StudyNoteMode, MasteryStatus } from '../types';
import { getApiUrl } from '../lib/apiConfig';
import {
  BookOpen,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Hourglass,
  Layers,
  ChevronLeft,
  ChevronRight,
  Bot,
  Edit3,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Save,
  FolderArchive,
  UploadCloud,
  Trash2,
  Check,
  X,
  FileUp,
  RefreshCw,
} from 'lucide-react';

export const CoursesView: React.FC = () => {
  const {
    courses,
    lessons,
    documents,
    selectedCourseId,
    setSelectedCourseId,
    selectedLessonId,
    setSelectedLessonId,
    addCourse,
    updateCourse,
    deleteCourse,
    addLesson,
    updateLesson,
    setLessonNoteMode,
    setLessonStatus,
    navigateToStudyRoom,
    navigateToRevision,
    navigateToLesson,
    setActiveTab,
    addDocument,
    updateDocument,
    addGeneratedFlashcards,
    addQuestions,
    addAssignment,
  } = useApp();

  // Multi-step Course Registration Modal State
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false);
  const [registrationStep, setRegistrationStep] = useState<1 | 2 | 3>(1);
  const [regName, setRegName] = useState<string>('');
  const [regCode, setRegCode] = useState<string>('');
  const [regYear, setRegYear] = useState<string>('Year 2');
  const [regSemester, setRegSemester] = useState<string>('Semester 1');
  const [regLecturer, setRegLecturer] = useState<string>('');
  const [regDescription, setRegDescription] = useState<string>('');
  const [regHasUnits, setRegHasUnits] = useState<boolean>(false);
  const [regUnits, setRegUnits] = useState<Array<{ name: string; code?: string; lecturer?: string; description?: string }>>([
    { name: 'Unit I — Anatomy', code: '', lecturer: '', description: '' },
    { name: 'Unit II — Physiology', code: '', lecturer: '', description: '' },
    { name: 'Unnamed unit', code: '', lecturer: '', description: '' },
  ]);

  // Unit management inside active course
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitName, setEditUnitName] = useState<string>('');
  const [activeUnitFilter, setActiveUnitFilter] = useState<string>('all'); // 'all' or unitId

  // Upload & Organization State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedUnitForUpload, setSelectedUnitForUpload] = useState<string | undefined>(undefined);
  const [isOrganizingNotes, setIsOrganizingNotes] = useState<boolean>(false);
  const [organizationPreview, setOrganizationPreview] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active course & lesson
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const activeLesson = lessons.find((l) => l.id === selectedLessonId) || lessons.find((l) => l.courseId === activeCourse?.id) || lessons[0];

  const courseLessons = lessons.filter((l) => {
    if (l.courseId !== activeCourse?.id) return false;
    if (activeUnitFilter !== 'all' && l.unitId !== activeUnitFilter) return false;
    return true;
  });

  const courseDocuments = documents.filter((d) => {
    if (d.courseId !== activeCourse?.id) return false;
    if (activeUnitFilter !== 'all' && d.unitId !== activeUnitFilter) return false;
    return true;
  });

  const unassignedDocuments = documents.filter((d) => d.courseId === activeCourse?.id && !d.unitId);

  // Handle Multi-Step Course Registration
  const handleNextRegStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    if (registrationStep === 1) {
      if (regHasUnits) {
        setRegistrationStep(3);
      } else {
        finalizeCourseRegistration();
      }
    } else if (registrationStep === 3) {
      finalizeCourseRegistration();
    }
  };

  const finalizeCourseRegistration = () => {
    const formattedUnits: CourseUnit[] = regHasUnits
      ? regUnits.map((u, i) => ({
          id: `unit_${Date.now()}_${i}`,
          name: u.name.trim() || 'Unnamed unit',
          code: u.code || undefined,
          lecturer: u.lecturer || undefined,
          description: u.description || undefined,
        }))
      : [];

    const created = addCourse({
      code: regCode.trim() || 'NUR 210',
      title: regName.trim(),
      lecturer: regLecturer.trim() || undefined,
      description: regDescription.trim() || `Course syllabus for ${regName}`,
      academicYear: regYear,
      semester: regSemester,
      category: 'Nursing Practice',
      hasMultipleUnits: regHasUnits,
      units: formattedUnits,
      colorTheme: 'teal',
    });

    setSelectedCourseId(created.id);
    setIsAddCourseModalOpen(false);
    setRegistrationStep(1);
    setRegName('');
    setRegCode('');
    setRegLecturer('');
    setRegDescription('');
    setRegHasUnits(false);
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle Lecturer Notes Upload
  const handleUploadNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeCourse) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) continue;

        const docId = `doc_${Date.now()}_${i}`;
        const newDoc: DocumentRecord = {
          id: docId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          courseId: activeCourse.id,
          unitId: selectedUnitForUpload !== 'all' ? selectedUnitForUpload : undefined,
          uploadTimestamp: new Date().toISOString(),
          status: 'uploading',
        };

        addDocument(newDoc);
        const base64Content = await fileToBase64(file);
        updateDocument(docId, { status: 'processing' });

        const response = await fetch(getApiUrl('/api/gemini/extract-document'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            base64Content,
            courseContext: `${activeCourse.code}: ${activeCourse.title}`,
          }),
        });

        if (!response.ok) throw new Error(`Extraction failed for ${file.name}`);
        const extracted = await response.json();

        updateDocument(docId, {
          status: 'ready',
          extractedTextLength: extracted.summary?.length || 500,
          detectedPages: extracted.detectedPages || 1,
          previewSnippet: extracted.summary || 'Extracted lecturer notes.',
        });
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to process uploaded notes.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Organize my notes workflow (AI-powered)
  const handleOrganizeNotes = async (unitId?: string) => {
    if (!activeCourse) return;
    setIsOrganizingNotes(true);

    const targetDocs = documents.filter((d) => {
      if (d.courseId !== activeCourse.id) return false;
      if (unitId && d.unitId !== unitId) return false;
      return true;
    });

    try {
      const combinedText = targetDocs.map((d) => `Document: ${d.fileName}\n${d.previewSnippet || ''}`).join('\n\n');

      const response = await fetch(getApiUrl('/api/gemini/extract-document'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${activeCourse.code}_Synthesis_Notes.txt`,
          fileType: 'text/plain',
          textContent: combinedText || `${activeCourse.code}: ${activeCourse.title}\n${activeCourse.description || ''}`,
          courseContext: `${activeCourse.code}: ${activeCourse.title}`,
        }),
      });

      if (!response.ok) throw new Error('AI organization failed.');
      const extracted = await response.json();

      setOrganizationPreview({
        unitId,
        suggestedCourseCode: extracted.suggestedCourseCode || activeCourse.code,
        suggestedCourseTitle: extracted.suggestedCourseTitle || activeCourse.title,
        lessons: [
          {
            lessonNumber: 1,
            title: extracted.suggestedLessonTitle || 'Core Foundations & Principles',
            summary: extracted.summary || 'Structured lecturer notes synthesis.',
            studyNotes: extracted.studyNotes,
            topics: extracted.topics || [],
            keyTerminology: extracted.keyTerminology || [],
          },
          ...(extracted.topics || []).slice(1, 4).map((t: any, idx: number) => ({
            lessonNumber: idx + 2,
            title: t.title,
            summary: t.summary || 'Detailed topic breakdown.',
            studyNotes: extracted.studyNotes,
            topics: [t],
            keyTerminology: extracted.keyTerminology || [],
          })),
        ],
      });
    } catch (err: any) {
      console.error('Organization failure:', err);
      // Fallback proposal
      setOrganizationPreview({
        unitId,
        suggestedCourseCode: activeCourse.code,
        suggestedCourseTitle: activeCourse.title,
        lessons: [
          {
            lessonNumber: 1,
            title: 'Foundational Lecturer Notes & Concepts',
            summary: 'Comprehensive notes extracted from uploaded source files.',
            studyNotes: {
              faithfulNotes: 'Verbatim lecturer notes...',
              detailedNotes: 'Detailed mechanistic breakdown...',
              quickRevision: 'High-yield points...',
              difficultConcept: 'Key conceptual breakdown...',
              examFocused: 'CAT and exam priorities...',
            },
            topics: [],
            keyTerminology: [],
          },
        ],
      });
    } finally {
      setIsOrganizingNotes(false);
    }
  };

  const handleConfirmOrganization = () => {
    if (!organizationPreview || !activeCourse) return;

    for (const l of organizationPreview.lessons) {
      addLesson({
        courseId: activeCourse.id,
        unitId: organizationPreview.unitId,
        lessonNumber: l.lessonNumber,
        title: l.title,
        extractedSummary: l.summary,
        studyNotes: l.studyNotes,
        activeNoteMode: 'detailed',
        userPersonalNotes: '',
        topics: l.topics,
        keyTerminology: l.keyTerminology,
        bookmarks: [],
        status: 'not_started',
        difficultyRating: 'moderate',
      });
    }

    setOrganizationPreview(null);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Bar: Course Selector Pills + Register Course Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          {courses.map((course) => {
            const isSelected = course.id === activeCourse?.id;
            return (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  const firstLesson = lessons.find((l) => l.courseId === course.id);
                  if (firstLesson) setSelectedLessonId(firstLesson.id);
                  setActiveUnitFilter('all');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/20 border-teal-400 text-teal-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {course.code}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsAddCourseModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Course Unit</span>
        </button>
      </div>

      {/* Main Course Workspace Layout */}
      {activeCourse && (
        <div className="space-y-6">
          {/* Course Header Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-teal-300 px-2.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30">
                  {activeCourse.code}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {activeCourse.academicYear} • {activeCourse.semester}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeCourse.title}
              </h1>
              <p className="text-xs text-slate-300">
                Lecturer: {activeCourse.lecturer || 'Faculty Department'} • {courseLessons.length} Organized Lessons
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt"
                onChange={handleUploadNotes}
                className="hidden"
              />
              <button
                onClick={() => {
                  setSelectedUnitForUpload('all');
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs transition-all active:scale-95"
              >
                {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-teal-400" />}
                <span>Upload Lecturer Notes</span>
              </button>

              <button
                onClick={() => handleOrganizeNotes()}
                disabled={isOrganizingNotes}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                {isOrganizingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Organize My Notes</span>
              </button>
            </div>
          </div>

          {/* Units Tab Bar (If course has multiple units) */}
          {activeCourse.hasMultipleUnits && activeCourse.units && activeCourse.units.length > 0 && (
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setActiveUnitFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  activeUnitFilter === 'all'
                    ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Units &amp; Notes
              </button>
              {activeCourse.units.map((unit) => {
                const isSelected = activeUnitFilter === unit.id;
                return (
                  <button
                    key={unit.id}
                    onClick={() => setActiveUnitFilter(unit.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center space-x-2 ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{unit.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Unassigned Notes Area (If any documents at course level without unit) */}
          {unassignedDocuments.length > 0 && activeCourse.hasMultipleUnits && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Unassigned Source Notes ({unassignedDocuments.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">Assign these notes to a specific unit below</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unassignedDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate pr-2">{doc.fileName}</span>
                    <select
                      onChange={(e) => {
                        const unitId = e.target.value;
                        if (unitId) {
                          updateDocument(doc.id, { unitId });
                        }
                      }}
                      defaultValue=""
                      className="bg-slate-800 text-[11px] text-teal-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="" disabled>Assign to unit...</option>
                      {activeCourse.units?.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Units Section / Course Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Organized Lessons */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Organized Lessons ({courseLessons.length})
                  </h3>
                  <span className="text-xs text-slate-400">Select lesson to read &amp; study</span>
                </div>

                <div className="space-y-2.5">
                  {courseLessons.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <FolderArchive className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">No lessons organized yet for this section.</p>
                      <button
                        onClick={() => handleOrganizeNotes(activeUnitFilter !== 'all' ? activeUnitFilter : undefined)}
                        className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md mt-2"
                      >
                        Organize Notes with AI
                      </button>
                    </div>
                  ) : (
                    courseLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => navigateToLesson(lesson.id, activeCourse.id)}
                        className="p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-teal-500/40 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="text-[10px] font-black tracking-wider text-teal-400 uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                            LESSON {lesson.lessonNumber}
                          </span>
                          <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                            {lesson.title}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1">{lesson.extractedSummary}</p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[10px] font-bold capitalize px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {lesson.status.replace('_', ' ')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Source Documents List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Source Documents ({courseDocuments.length})
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedUnitForUpload(activeUnitFilter !== 'all' ? activeUnitFilter : undefined);
                      fileInputRef.current?.click();
                    }}
                    className="text-xs font-bold text-teal-400 hover:underline"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {courseDocuments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center italic">
                      No lecturer notes uploaded yet.
                    </p>
                  ) : (
                    courseDocuments.map((doc) => (
                      <div key={doc.id} className="p-3 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-200 truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-slate-400">
                              {Math.round(doc.fileSize / 1024)} KB • {new Date(doc.uploadTimestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0">
                          Ready
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-STEP COURSE REGISTRATION WIZARD MODAL */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-teal-950/30 to-slate-900">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <FolderArchive className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Academic Course</h3>
                  <p className="text-xs text-slate-400">Step {registrationStep} of {regHasUnits ? 3 : 1}</p>
                </div>
              </div>
              <button onClick={() => setIsAddCourseModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNextRegStep} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {registrationStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Course Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Human Anatomy and Physiology"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Course Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        placeholder="e.g. HNS 2101"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Lecturer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={regLecturer}
                      onChange={(e) => setRegLecturer(e.target.value)}
                      placeholder="e.g. Dr. A. Odhiambo"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Course Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={regDescription}
                      onChange={(e) => setRegDescription(e.target.value)}
                      placeholder="Syllabus overview..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  {/* Step 2: Course Structure Selection */}
                  <div className="pt-3 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Course Structure Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegHasUnits(false)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                          !regHasUnits
                            ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Single Unitless Course
                        <p className="text-[10px] font-normal text-slate-400 mt-0.5">Notes attached directly to course</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegHasUnits(true)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                          regHasUnits
                            ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Contains Multiple Units
                        <p className="text-[10px] font-normal text-slate-400 mt-0.5">Organize notes across distinct units</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {registrationStep === 3 && regHasUnits && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Configure Course Units
                    </h4>
                    <button
                      type="button"
                      onClick={() => setRegUnits([...regUnits, { name: 'Unnamed unit', code: '', lecturer: '', description: '' }])}
                      className="text-xs font-bold text-teal-400 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Unit</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {regUnits.map((u, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={u.name}
                            onChange={(e) => {
                              const updated = [...regUnits];
                              updated[idx].name = e.target.value;
                              setRegUnits(updated);
                            }}
                            placeholder="Unit Name (e.g. Unit I — Anatomy)"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setRegUnits(regUnits.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  {registrationStep === 1 && regHasUnits ? 'Next: Setup Units →' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI ORGANIZATION REVIEW PREVIEW MODAL */}
      {organizationPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-teal-950/30 to-slate-900">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Review Proposed Lesson Sequence</h3>
                  <p className="text-xs text-slate-400">AI-synthesized from lecturer source documents</p>
                </div>
              </div>
              <button onClick={() => setOrganizationPreview(null)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                {organizationPreview.lessons.map((l: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-wider">
                      Proposed Lesson {l.lessonNumber}
                    </span>
                    <h4 className="text-sm font-bold text-white">{l.title}</h4>
                    <p className="text-xs text-slate-300">{l.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setOrganizationPreview(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmOrganization}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Confirm &amp; Save Lessons
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
