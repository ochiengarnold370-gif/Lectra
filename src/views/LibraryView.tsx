/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Library & Document Processing Workspace
 */

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DocumentRecord, Course, Lesson, Flashcard } from '../types';
import { getApiUrl } from '../lib/apiConfig';
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
  Search,
  Bookmark,
  Layers,
  HelpCircle,
  CheckSquare,
  Star,
  BookMarked,
  Database,
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
    flashcards,
    questions,
    addDocument,
    updateDocument,
    addLesson,
    addCourse,
    addGeneratedFlashcards,
    addQuestions,
    addAssignment,
    navigateToLesson,
    navigateToRevision,
    setActiveTab,
  } = useApp();

  // Search & Filters State (Section B & C)
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [libraryResourceTypeFilter, setLibraryResourceTypeFilter] = useState<string>('all');
  const [quickFilterTab, setQuickFilterTab] = useState<'all' | 'recent' | 'saved'>('all');

  // Course Detail Modal State (Section F)
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<Course | null>(null);

  // Upload & Review state
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
      updateDocument(docId, { status: 'processing' });

      const response = await fetch(getApiUrl('/api/gemini/extract-document'), {
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

  const handleApproveExtraction = () => {
    if (!reviewModalData) return;

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

    if (reviewModalData.flashcards && reviewModalData.flashcards.length > 0) {
      addGeneratedFlashcards(reviewModalData.flashcards, createdLesson.id, targetCourse.id);
    }

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

    updateDocument(reviewModalData.documentId, {
      status: 'ready',
      courseId: targetCourse.id,
      lessonId: createdLesson.id,
    });

    setReviewModalData(null);
    navigateToLesson(createdLesson.id, targetCourse.id);
  };

  // Search & Filter Logic (Section B)
  const searchResults = useMemo(() => {
    if (!librarySearchQuery.trim()) return null;
    const q = librarySearchQuery.toLowerCase();

    const matches: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'course' | 'lesson' | 'document' | 'flashcard';
      courseId?: string;
      lessonId?: string;
      onClick: () => void;
    }> = [];

    courses.forEach((c) => {
      if (
        (libraryResourceTypeFilter === 'all' || libraryResourceTypeFilter === 'course') &&
        (c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      ) {
        matches.push({
          id: c.id,
          title: `${c.code}: ${c.title}`,
          subtitle: `Course • ${c.category} • ${lessons.filter((l) => l.courseId === c.id).length} lessons`,
          type: 'course',
          onClick: () => setSelectedCourseDetail(c),
        });
      }
    });

    lessons.forEach((l) => {
      const course = courses.find((c) => c.id === l.courseId);
      if (
        (libraryResourceTypeFilter === 'all' || libraryResourceTypeFilter === 'lesson') &&
        (l.title.toLowerCase().includes(q) || l.extractedSummary.toLowerCase().includes(q))
      ) {
        matches.push({
          id: l.id,
          title: `Lesson ${l.lessonNumber}: ${l.title}`,
          subtitle: `${course?.code || 'Course'} • Status: ${l.status.replace('_', ' ')}`,
          type: 'lesson',
          courseId: l.courseId,
          lessonId: l.id,
          onClick: () => navigateToLesson(l.id, l.courseId),
        });
      }
    });

    documents.forEach((doc) => {
      if (
        (libraryResourceTypeFilter === 'all' || libraryResourceTypeFilter === 'document') &&
        doc.fileName.toLowerCase().includes(q)
      ) {
        matches.push({
          id: doc.id,
          title: doc.fileName,
          subtitle: `Uploaded PDF document • ${Math.round(doc.fileSize / 1024)} KB`,
          type: 'document',
          onClick: () => {
            if (doc.lessonId) navigateToLesson(doc.lessonId, doc.courseId);
          },
        });
      }
    });

    return matches;
  }, [librarySearchQuery, libraryResourceTypeFilter, courses, lessons, documents, navigateToLesson]);

  // Quick Filter Tabs logic (Section C)
  const filteredCoursesByTab = useMemo(() => {
    if (quickFilterTab === 'saved') {
      // Courses having bookmarked lessons or studied lessons
      const savedCourseIds = new Set(
        lessons.filter((l) => (l.bookmarks && l.bookmarks.length > 0) || l.status === 'studied' || l.status === 'mastered').map((l) => l.courseId)
      );
      return courses.filter((c) => savedCourseIds.has(c.id));
    }
    if (quickFilterTab === 'recent') {
      // Sort courses by most recently updated lesson or course creation
      return [...courses].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return courses;
  }, [quickFilterTab, courses, lessons]);

  // Recently Added items (Section G)
  const recentlyAddedItems = useMemo(() => {
    const combined: Array<{
      id: string;
      title: string;
      type: string;
      courseCode?: string;
      date: string;
      onClick: () => void;
    }> = [];

    documents.forEach((doc) => {
      combined.push({
        id: doc.id,
        title: doc.fileName,
        type: 'Lecture PDF',
        courseCode: courses.find((c) => c.id === doc.courseId)?.code,
        date: doc.uploadTimestamp,
        onClick: () => {
          if (doc.lessonId && doc.courseId) navigateToLesson(doc.lessonId, doc.courseId);
        },
      });
    });

    lessons.forEach((l) => {
      const course = courses.find((c) => c.id === l.courseId);
      combined.push({
        id: l.id,
        title: `Lesson ${l.lessonNumber}: ${l.title}`,
        type: 'Structured Lesson',
        courseCode: course?.code,
        date: l.updatedAt,
        onClick: () => navigateToLesson(l.id, l.courseId),
      });
    });

    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [documents, lessons, courses, navigateToLesson]);

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* SECTION A: HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              Academic Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              Your learning space, organized.
            </p>
          </div>
        </div>

        {/* Upload Notes Button */}
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
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? 'Extracting...' : 'Upload Notes'}</span>
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
          <button onClick={() => setUploadError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION B: GLOBAL SEARCH */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={librarySearchQuery}
            onChange={(e) => setLibrarySearchQuery(e.target.value)}
            placeholder="Search courses, lessons, notes..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors shadow-inner"
          />
          {librarySearchQuery && (
            <button
              onClick={() => setLibrarySearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Resource type filter bar */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Filter by:</span>
          {['all', 'course', 'lesson', 'document'].map((type) => (
            <button
              key={type}
              onClick={() => setLibraryResourceTypeFilter(type)}
              className={`px-3 py-1 rounded-lg font-semibold capitalize whitespace-nowrap transition-colors ${
                libraryResourceTypeFilter === type
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}
        </div>

        {/* Search Results Dropdown / Panel */}
        {searchResults && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/40 shadow-xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Search Results ({searchResults.length})
              </span>
              <button
                onClick={() => setLibrarySearchQuery('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear Search
              </button>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center italic">
                No matching resources found for &ldquo;{librarySearchQuery}&rdquo;.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick();
                      setLibrarySearchQuery('');
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between text-left transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION C: QUICK FILTER TABS */}
      <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {(['all', 'recent', 'saved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setQuickFilterTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
              quickFilterTab === tab
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'all' ? 'All Materials' : tab}
          </button>
        ))}
      </div>

      {/* SECTION D: CONTINUE STUDYING */}
      {(() => {
        const inProgressLesson = lessons.find((l) => l.status === 'in_progress');
        if (!inProgressLesson) return null;
        const course = courses.find((c) => c.id === inProgressLesson.courseId);
        return (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/30 border border-teal-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Continue Studying</span>
              </div>
              <h3 className="text-base font-bold text-white truncate">
                {inProgressLesson.title}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {course?.code} • {course?.title} • In Progress
              </p>
            </div>
            <button
              onClick={() => navigateToLesson(inProgressLesson.id, inProgressLesson.courseId)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <span>Resume Lesson</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* SECTION E: STUDY TOOLS */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Study Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Flashcards */}
          <button
            onClick={() => navigateToRevision()}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 transition-all text-left flex items-start space-x-3 group"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Flashcards
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Recall key facts with SM-2 Spaced Repetition</p>
              <span className="inline-block text-[10px] text-teal-400 font-semibold mt-2">
                {flashcards.length} cards available →
              </span>
            </div>
          </button>

          {/* Practice Tests */}
          <button
            onClick={() => setActiveTab('revision')}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 transition-all text-left flex items-start space-x-3 group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Practice Tests
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Prepare for CATs and clinical assessments</p>
              <span className="inline-block text-[10px] text-teal-400 font-semibold mt-2">
                {questions.length} questions ready →
              </span>
            </div>
          </button>

          {/* Quick Revision */}
          <button
            onClick={() => navigateToRevision()}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 transition-all text-left flex items-start space-x-3 group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Quick Revision
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">High-yield summaries and key terminology</p>
              <span className="inline-block text-[10px] text-teal-400 font-semibold mt-2">
                {lessons.length} lessons summarized →
              </span>
            </div>
          </button>

          {/* Saved Content */}
          <button
            onClick={() => setQuickFilterTab('saved')}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 transition-all text-left flex items-start space-x-3 group"
          >
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 shrink-0 group-hover:scale-105 transition-transform">
              <Bookmark className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Saved Content
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Bookmarked lessons and highlighted notes</p>
              <span className="inline-block text-[10px] text-teal-400 font-semibold mt-2">
                Filter saved items →
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION F: MY COURSES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              My Courses
            </h2>
            <p className="text-xs text-slate-400">
              Organized course units and curriculum materials
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-400">
            {filteredCoursesByTab.length} Courses
          </span>
        </div>

        <div className="space-y-3">
          {filteredCoursesByTab.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <FolderArchive className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No courses found matching this view.</p>
            </div>
          ) : (
            filteredCoursesByTab.map((course) => {
              const courseLessons = lessons.filter((l) => l.courseId === course.id);
              const lecturerClean = course.lecturer ? course.lecturer.split(',')[0] : 'Faculty Department';

              return (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourseDetail(course)}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-sm"
                >
                  <div className="min-w-0 pr-3 space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-teal-300 px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
                        {course.code}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{course.category}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-teal-300 transition-colors">
                      {course.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 pt-0.5">
                      <span>{lecturerClean}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center text-teal-400/90 font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-teal-400 mr-1.5 shrink-0" />
                        <span>{courseLessons.length} {courseLessons.length === 1 ? 'lesson' : 'lessons'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-800/80 text-slate-300 group-hover:bg-teal-500/20 group-hover:text-teal-300 transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION G: RECENTLY ADDED */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recently Added
          </h2>
          <span className="text-xs text-slate-400">Latest resources</span>
        </div>

        {recentlyAddedItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">No recently added resources.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentlyAddedItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="w-full p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/30 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.type} {item.courseCode ? `• ${item.courseCode}` : ''} • {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* COURSE DETAIL WORKSPACE MODAL (Section F) */}
      {selectedCourseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-teal-950/30 to-slate-900">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-teal-300 px-2.5 py-1 rounded-md bg-teal-500/15 border border-teal-500/30">
                  {selectedCourseDetail.code}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {selectedCourseDetail.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lecturer: {selectedCourseDetail.lecturer || 'Faculty Department'} • {selectedCourseDetail.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Course Workspace */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                {selectedCourseDetail.description}
              </div>

              {/* Course Lessons Sequence */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Course Lessons ({lessons.filter((l) => l.courseId === selectedCourseDetail.id).length})
                </h4>
                <div className="space-y-2">
                  {lessons
                    .filter((l) => l.courseId === selectedCourseDetail.id)
                    .map((lesson) => {
                      const status = lesson.status;
                      const statusLabel =
                        status === 'in_progress'
                          ? 'In Progress'
                          : status === 'studied' || status === 'understood' || status === 'mastered'
                          ? 'Studied'
                          : 'Not Started';

                      const statusColor =
                        status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : status === 'studied' || status === 'understood' || status === 'mastered'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            setSelectedCourseDetail(null);
                            navigateToLesson(lesson.id, selectedCourseDetail.id);
                          }}
                          className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="text-[10px] font-black tracking-wider text-teal-400 uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                              LESSON {lesson.lessonNumber}
                            </span>
                            <h5 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                              {lesson.title}
                            </h5>
                            {lesson.sourcePagesRange && (
                              <p className="text-[11px] text-slate-400">
                                Source: {lesson.sourcePagesRange} • {lesson.keyTerminology.length} medical terms
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Semester: {selectedCourseDetail.semester} ({selectedCourseDetail.academicYear})
              </span>
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs"
              >
                Close Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE EXTRACTION REVIEW MODAL */}
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
              <button onClick={() => setReviewModalData(null)} className="p-1.5 text-slate-400 hover:text-white">
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
