/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA AI Study Assistant - Grounded Clinical Nursing Tutor
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TutorMessage } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Table,
  Lightbulb,
  FileText,
} from 'lucide-react';

export const AITutorView: React.FC = () => {
  const { courses, lessons, selectedCourseId, selectedLessonId, setSelectedCourseId, setSelectedLessonId } = useApp();

  const [activeCourseId, setActiveCourseId] = useState<string>(selectedCourseId || courses[0]?.id || '');
  const [activeLessonId, setActiveLessonId] = useState<string>(selectedLessonId || lessons[0]?.id || '');

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];
  const courseLessons = lessons.filter((l) => l.courseId === activeCourse?.id);
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || courseLessons[0];

  const [inputQuery, setInputQuery] = useState<string>('');
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'init_msg',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello Nurse Faith. I am your LECTRA Academic Study Assistant.
I am grounded in your university lecture notes for ${activeCourse?.code}: ${activeCourse?.title}.
You can ask me to break down complex physiological mechanisms, generate comparative tables, create clinical mnemonics, or test your NCLEX understanding.`,
      followUpQuestions: [
        'Explain Phase 2 plateau mechanism and why tetanus cannot occur in cardiac muscle.',
        'Create a clinical mnemonic for differentiating Alpha-1 vs Beta-1 and Beta-2 adrenoceptors.',
        'Compare arterial blood gas findings in partially compensated vs uncompensated metabolic acidosis in a table.',
      ],
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setInputQuery('');
    const userMsg: TutorMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend,
      courseId: activeCourse?.id,
      lessonId: activeLesson?.id,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          courseTitle: activeCourse?.title,
          lessonTitle: activeLesson?.title,
          lessonNotes: activeLesson?.studyNotes.detailedNotes || activeLesson?.studyNotes.faithfulNotes,
          chatHistory: messages.slice(-5),
        }),
      });

      if (!response.ok) throw new Error('AI Tutor endpoint unreachable');
      const data = await response.json();

      const assistantMsg: TutorMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.reply || 'Here is the academic explanation grounded in your lecture notes.',
        sourceCitation: {
          courseCode: activeCourse?.code || 'HNS 2101',
          lessonTitle: activeLesson?.title || 'Lecture Notes',
          pageRef: activeLesson?.topics?.[0]?.sourcePageRef || 1,
        },
        followUpQuestions: [
          'Would you like a clinical case scenario testing this concept?',
          'Should I generate 2 practice flashcards on this topic?',
        ],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: 'Unable to reach the AI study assistant. Please check your network connection.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const promptPills = [
    { label: 'Step-by-step mechanism', icon: Lightbulb, query: `Explain the physiological mechanism in ${activeLesson?.title || 'this topic'} step-by-step with cellular ion fluxes.` },
    { label: 'Clinical Mnemonic', icon: Sparkles, query: `Create a memorable medical mnemonic for remembering key facts in ${activeLesson?.title || 'this lecture'}.` },
    { label: 'Differential Table', icon: Table, query: `Generate a comparative Markdown table contrasting the normal vs pathological states in ${activeLesson?.title || 'this unit'}.` },
    { label: 'NCLEX Practice Check', icon: HelpCircle, query: `Test me with 2 challenging NCLEX-style case questions based on ${activeLesson?.title || 'this lecture'}, and explain the correct answers.` },
  ];

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Header with Course/Lesson Scope Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Bot className="w-4 h-4" />
            <span>Grounded Nursing Knowledge Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            AI Study Assistant
          </h1>
          <p className="text-xs text-slate-400">
            Answers are grounded strictly in your lecturer&rsquo;s notes and verified health science curricula
          </p>
        </div>

        {/* Course & Lesson contextual selector */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeCourseId}
            onChange={(e) => {
              setActiveCourseId(e.target.value);
              const firstL = lessons.find((l) => l.courseId === e.target.value);
              if (firstL) setActiveLessonId(firstL.id);
            }}
            className="bg-slate-800 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:outline-none"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.title.split(':')[0]}
              </option>
            ))}
          </select>

          <select
            value={activeLessonId}
            onChange={(e) => setActiveLessonId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:outline-none max-w-[200px] truncate"
          >
            {courseLessons.map((l) => (
              <option key={l.id} value={l.id}>
                Lesson {l.lessonNumber}: {l.title.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[65vh]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none font-sans'
                }`}
              >
                {msg.text}

                {/* Source Citation badge if assistant */}
                {msg.sourceCitation && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center space-x-2 text-[11px] text-teal-300">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Primary Source: {msg.sourceCitation.courseCode} — {msg.sourceCitation.lessonTitle}
                    </span>
                  </div>
                )}
              </div>

              {/* Follow-up question pills */}
              {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-2xl">
                  {msg.followUpQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-teal-400 text-teal-300 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-teal-400 p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing lecture material and formulating clinical explanation...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pre-built Prompt Pills */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {promptPills.map((pill, i) => {
            const Icon = pill.icon;
            return (
              <button
                key={i}
                onClick={() => handleSendMessage(pill.query)}
                className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white shrink-0 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-teal-400" />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center space-x-3"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask a question about ${activeLesson?.title || 'your lecture'}...`}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
