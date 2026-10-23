/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Library & Document Processing Engine
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DocumentRecord, Course, Lesson } from '../types';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Edit3,
  X,
} from 'lucide-react';

interface ExtractedReviewData {
  documentId: string;
  fileName: string;
  courseCode: string;
  courseTitle: string;
  lessonNumber: number;
  lessonTitle: string;
  summary: string;
  topics: Array<{
    id: string;
    title: string;
    learningObjectives: string[];
    subtopics: any[];
    keyTerms: any[];
  }>;
  keyTerminology: any[];
  studyNotes: {
    faithfulNotes: string;
    detailedNotes: string;
    quickRevision: string;
    difficultConcept: string;
    examFocused: string;
  };
  flashcards?: any[];
  initialQuestions?: any[];
  detectedAssignments?: Array<{
    title: string;
    description: string;
    dueDate?: string;
    dueTime?: string;
    priority?: string;
    type?: string;
    approved?: boolean;
  }>;
}

export const LibraryView: React.FC = () => {
  const {
    userProfile,
    courses,
    lessons,
    documents,
    addDocument,
    updateDocument,
    addLesson,
    addCourse,
    addGeneratedFlashcards,
    addQuestions,
    addAssignment,
    navigateToLesson,
  } = useApp();

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reviewModalData, setReviewModalData] = useState<ExtractedReviewData | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'c_hns2101': true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle folder accordion
  const toggleFolder = (courseId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // remove data:*/*;base64, prefix
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle file drop / selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB limit. Please upload a smaller document.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const docId = `doc_${Date.now()}`;
    const newDoc: DocumentRecord = {
      id: docId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/pdf',
      courseId: courses[0]?.id || 'c_hns2101',
      uploadTimestamp: new Date().toISOString(),
      status: 'uploading',
    };

    addDocument(newDoc);

    try {
      const base64Content = await fileToBase64(file);

      // Transition to processing state
      updateDocument(docId, { status: 'processing' });

      // Call server Gemini extraction endpoint
      const response = await fetch('/api/gemini/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          base64Content,
          courseContext: courses.map((c) => `${c.code}: ${c.title}`).join(', '),
        }),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const extracted = await response.json();

      updateDocument(docId, {
        status: 'needs_review',
        detectedPages: extracted.detectedPages || 1,
        detectedHierarchy: {
          suggestedCourseCode: extracted.suggestedCourseCode || 'HNS 2101',
          suggestedCourseTitle: extracted.suggestedCourseTitle || 'Human Anatomy & Physiology II',
          suggestedLessonNumber: extracted.suggestedLessonNumber || (lessons.length + 1),
          suggestedLessonTitle: extracted.suggestedLessonTitle || file.name.replace(/\.[^/.]+$/, ''),
          detectedTopics: (extracted.topics || []).map((t: any) => t.title),
          detectedTermsCount: (extracted.keyTerminology || []).length,
        },
      });

      // Open review modal so student can review and approve extracted hierarchy
      setReviewModalData({
        documentId: docId,
        fileName: file.name,
        courseCode: extracted.suggestedCourseCode || 'HNS 2101',
        courseTitle: extracted.suggestedCourseTitle || 'Human Anatomy & Physiology II',
        lessonNumber: extracted.suggestedLessonNumber || (lessons.length + 1),
        lessonTitle: extracted.suggestedLessonTitle || file.name.replace(/\.[^/.]+$/, ''),
        summary: extracted.summary || 'Extracted lecture material.',
        topics: extracted.topics || [],
        keyTerminology: extracted.keyTerminology || [],
        studyNotes: extracted.studyNotes || {
          faithfulNotes: `### Extracted from ${file.name}\n\nStructured notes content...`,
          detailedNotes: 'Detailed pedagogical explanation...',
          quickRevision: 'High yield summary...',
          difficultConcept: 'Key concept breakdown...',
          examFocused: 'CAT and exam priorities...',
        },
        flashcards: extracted.flashcards || [],
        initialQuestions: extracted.initialQuestions || [],
        detectedAssignments: (extracted.detectedAssignments || []).map((a: any) => ({
          ...a,
          approved: true,
        })),
      });
    } catch (err: any) {
      console.error('Document processing failure:', err);
      updateDocument(docId, {
        status: 'failed',
        errorMessage: err.message || 'Processing failed. Please retry.',
      });
      setUploadError(err.message || 'Document processing failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm approved extracted hierarchy into Academic Library
  const handleApproveExtraction = () => {
    if (!reviewModalData) return;

    // 1. Locate or create course
    let targetCourse = courses.find(
      (c) => c.code.toLowerCase() === reviewModalData.courseCode.toLowerCase()
    );

    if (!targetCourse) {
      targetCourse = addCourse({
        code: reviewModalData.courseCode,
        title: reviewModalData.courseTitle,
        description: `Imported from ${reviewModalData.fileName}`,
        academicYear: userProfile.academicYear,
        semester: userProfile.semester,
        category: 'Nursing Practice',
        colorTheme: 'indigo',
      });
    }

    // 2. Add Lesson
    const createdLesson = addLesson({
      courseId: targetCourse.id,
      lessonNumber: reviewModalData.lessonNumber,
      title: reviewModalData.lessonTitle,
      originalFileName: reviewModalData.fileName,
      extractedSummary: reviewModalData.summary,
      studyNotes: reviewModalData.studyNotes,
      activeNoteMode: 'faithful',
      userPersonalNotes: '',
      topics: reviewModalData.topics.map((t, i) => ({
        id: `t_${Date.now()}_${i}`,
        title: t.title,
        learningObjectives: t.learningObjectives || [],
        subtopics: t.subtopics || [],
        keyTerms: t.keyTerms || [],
      })),
      keyTerminology: reviewModalData.keyTerminology,
      bookmarks: [],
      status: 'not_started',
      difficultyRating: 'moderate',
    });

    // 3. Add generated flashcards if any
    if (reviewModalData.flashcards && reviewModalData.flashcards.length > 0) {
      addGeneratedFlashcards(reviewModalData.flashcards, createdLesson.id, targetCourse.id);
    }

    // 4. Add generated assessment questions if any
    if (reviewModalData.initialQuestions && reviewModalData.initialQuestions.length > 0) {
      addQuestions(
        reviewModalData.initialQuestions.map((q, idx) => ({
          id: `q_gen_${Date.now()}_${idx}`,
          courseId: targetCourse!.id,
          lessonId: createdLesson.id,
          type: 'multiple_choice',
          questionText: q.questionText,
          options: q.options || ['A', 'B', 'C', 'D'],
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
          explanation: q.explanation || 'Clinically grounded rationale.',
          difficulty: q.difficulty || 'application',
          topic: q.topic || 'Lecture Material',
        }))
      );
    }

    // 5. Add confirmed detected assignments if any
    if (reviewModalData.detectedAssignments && reviewModalData.detectedAssignments.length > 0) {
      for (const asg of reviewModalData.detectedAssignments) {
        if (asg.approved) {
          addAssignment({
            title: asg.title,
            courseId: targetCourse.id,
            courseCode: targetCourse.code,
            courseName: targetCourse.title,
            description: asg.description || `Coursework detected from ${reviewModalData.fileName}`,
            dateAssigned: new Date().toISOString().split('T')[0],
            dueDate: asg.dueDate || undefined,
            dueTime: asg.dueTime || undefined,
            status: 'not_started',
            priority: (asg.priority as any) || 'medium',
            type: (asg.type as any) || 'assignment',
            source: `Extracted from ${reviewModalData.fileName}`,
            verified: true,
            linkedLessonId: createdLesson.id,
          });
        }
      }
    }

    // 6. Update document record to 'ready'
    updateDocument(reviewModalData.documentId, {
      status: 'ready',
      courseId: targetCourse.id,
      lessonId: createdLesson.id,
    });

    setReviewModalData(null);
    navigateToLesson(createdLesson.id, targetCourse.id);
  };

  const filteredCourses =
    selectedCourseFilter === 'all'
      ? courses
      : courses.filter((c) => c.id === selectedCourseFilter);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FolderArchive className="w-4 h-4" />
            <span>Academic Material Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Academic Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Structured hierarchy: {userProfile.university.split('(')[0]} → {userProfile.programme} → {userProfile.academicYear} → {userProfile.semester}
          </p>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>{isUploading ? 'Extracting Lecture...' : 'Upload Lecture PDF / Image'}</span>
          </button>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-teal-400/60 bg-slate-900/60 hover:bg-slate-900/90 transition-all cursor-pointer text-center group"
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white mb-1">
          Drop your lecture slides, notes, or scanned materials here
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Supports text PDFs, scanned documents (OCR), handwritten photo notes, and handouts. LECTRA automatically extracts topics, headings, page numbers, and medical terms.
        </p>
      </div>

      {/* Document Processing Pipeline Tracker (If any recent uploads) */}
      {documents.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Recent Uploads &amp; Processing Pipeline
          </h3>
          <div className="space-y-2">
            {documents.slice(0, 4).map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{doc.fileName}</p>
                    <p className="text-[11px] text-slate-400">
                      {Math.round(doc.fileSize / 1024)} KB • {new Date(doc.uploadTimestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {doc.status === 'processing' && (
                    <span className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Extracting structure...</span>
                    </span>
                  )}
                  {doc.status === 'needs_review' && (
                    <button
                      onClick={() => {
                        // Re-open review modal
                        setReviewModalData({
                          documentId: doc.id,
                          fileName: doc.fileName,
                          courseCode: doc.detectedHierarchy?.suggestedCourseCode || 'HNS 2101',
                          courseTitle: doc.detectedHierarchy?.suggestedCourseTitle || 'Human Anatomy II',
                          lessonNumber: doc.detectedHierarchy?.suggestedLessonNumber || 1,
                          lessonTitle: doc.detectedHierarchy?.suggestedLessonTitle || doc.fileName,
                          summary: 'Awaiting your review and approval.',
                          topics: [],
                          keyTerminology: [],
                          studyNotes: {
                            faithfulNotes: 'Lecture notes...',
                            detailedNotes: 'Detailed explanation...',
                            quickRevision: 'Quick revision...',
                            difficultConcept: 'Difficult concept...',
                            examFocused: 'Exam focus...',
                          },
                        });
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                    >
                      Review &amp; Approve
                    </button>
                  )}
                  {doc.status === 'ready' && (
                    <span className="flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>In Library</span>
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span className="flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failed</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Academic Hierarchy Explorer */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Academic Hierarchy Explorer
            </h2>
            <p className="text-xs text-slate-400">
              Browse courses, lectures, extracted notes, and study material
            </p>
          </div>
          {/* Filter by course */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.title.split(':')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tree Accordion */}
        <div className="space-y-3">
          {filteredCourses.map((course) => {
            const courseLessons = lessons.filter((l) => l.courseId === course.id);
            const isExpanded = expandedFolders[course.id];

            return (
              <div
                key={course.id}
                className="rounded-xl border border-slate-800 bg-slate-850 overflow-hidden"
              >
                {/* Course Folder Header */}
                <button
                  onClick={() => toggleFolder(course.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-800/80 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <span className="p-1 rounded-md bg-slate-800 text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-teal-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-teal-300 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                          {course.code}
                        </span>
                        <span className="text-sm font-bold text-white">{course.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lecturer: {course.lecturer || 'Faculty Department'} • {courseLessons.length} lessons
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline font-medium">
                    {course.category}
                  </span>
                </button>

                {/* Lessons list inside course folder */}
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-slate-800/60 space-y-2 bg-slate-900/50">
                    {courseLessons.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3 italic">
                        No lessons yet. Upload a lecture PDF above to extract lesson 1!
                      </p>
                    ) : (
                      courseLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-300">
                                Lesson {lesson.lessonNumber}:
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {lesson.title}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                              {lesson.sourcePagesRange && (
                                <span>Source: {lesson.sourcePagesRange}</span>
                              )}
                              <span>•</span>
                              <span>{lesson.keyTerminology.length} medical terms</span>
                              <span>•</span>
                              <span className="capitalize">Status: {lesson.status.replace('_', ' ')}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => navigateToLesson(lesson.id, course.id)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Read Notes</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Extraction Review Modal (Step 9 of Document Processing Pipeline) */}
      {reviewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Review Extracted Lecture Structure</h3>
                  <p className="text-xs text-slate-400">Verify course placement and lesson details before saving</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalData(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Course / Unit Code
                  </label>
                  <input
                    type="text"
                    value={reviewModalData.courseCode}
                    onChange={(e) =>
                      setReviewModalData({ ...reviewModalData, courseCode: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={reviewModalData.courseTitle}
                    onChange={(e) =>
                      setReviewModalData({ ...reviewModalData, courseTitle: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Lesson #
                  </label>
                  <input
                    type="number"
                    value={reviewModalData.lessonNumber}
                    onChange={(e) =>
                      setReviewModalData({ ...reviewModalData, lessonNumber: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Lesson Title
                  </label>
                  <input
                    type="text"
                    value={reviewModalData.lessonTitle}
                    onChange={(e) =>
                      setReviewModalData({ ...reviewModalData, lessonTitle: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Extracted Summary
                </label>
                <textarea
                  rows={3}
                  value={reviewModalData.summary}
                  onChange={(e) =>
                    setReviewModalData({ ...reviewModalData, summary: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                />
              </div>

              {/* Detected topics summary */}
              {reviewModalData.topics.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Detected Topics ({reviewModalData.topics.length})
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {reviewModalData.topics.map((t, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-teal-400">•</span>
                        <span>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detected Coursework & Assignments */}
              {reviewModalData.detectedAssignments && reviewModalData.detectedAssignments.length > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Detected Coursework / Tasks ({reviewModalData.detectedAssignments.length})</span>
                    </h4>
                    <span className="text-[10px] text-indigo-300/80">Review before confirming</span>
                  </div>
                  <div className="space-y-2">
                    {reviewModalData.detectedAssignments.map((asg, idx) => (
                      <label
                        key={idx}
                        className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-750 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={asg.approved !== false}
                          onChange={(e) => {
                            const updated = [...(reviewModalData.detectedAssignments || [])];
                            updated[idx] = { ...updated[idx], approved: e.target.checked };
                            setReviewModalData({ ...reviewModalData, detectedAssignments: updated });
                          }}
                          className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-teal-400"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-200">{asg.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{asg.description}</p>
                          <p className="text-[10px] text-teal-400 mt-0.5">
                            {asg.dueDate ? `Deadline: ${asg.dueDate}` : 'Deadline: Unspecified in document'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setReviewModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveExtraction}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                <span>Save to Academic Library</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
