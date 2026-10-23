# LECTRA — AI-Powered Nursing School Notes, Learning & Revision Platform

LECTRA is a mobile-first academic application engineered for university nursing and health-science students (specifically configured for Kenyan universities like the University of Nairobi, Kenyatta University, and KMTC, while supporting health-science curricula globally).

It solves the problem of voluminous, disorganized lecture PDFs, difficult medical terminology, dense physiological mechanisms, memorization fatigue, and revision scheduling conflicts by providing an integrated learning cycle:
**CONTENT → PLAN → STUDY → TEST → MEASURE → ADAPT**

---

## 1. Core Capabilities & Workflows

1. **Smart Academic Library & Extraction Engine**:
   - Organizes content using the full academic hierarchy: *University → Programme → Academic Year → Semester → Course/Unit → Lecturer → Lesson → Topic → Study Material*.
   - Accepts PDF lecture notes, scanned documents (OCR), photographs of printed/handwritten materials, and text documents.
   - Preserves lecturer order, section numbers, anatomical relations, and normal reference ranges.
   - Interactive review step allowing students to inspect, adjust, and approve extracted hierarchies before saving.

2. **5 Specialized Nursing Study Note Modes**:
   - **Faithful Structured Notes**: Clean formatting strictly preserving original lecturer sequence, lists, classifications, and clinical caveats.
   - **Detailed Learning Notes**: Deep physiological mechanisms, cellular feedback pathways, and diagnostic significance.
   - **Quick Revision Notes**: High-yield bullet points for rapid pre-exam recall.
   - **Difficult Concept Breakdown**: Explains complex concepts with accessible real-world analogies followed by rigorous academic terminology.
   - **Exam-Focused Revision**: High-frequency CAT/NCLEX focus points, comparative differentials, and cardinal signs.

3. **Active Recall & Spaced Repetition (SuperMemo SM-2)**:
   - Spaced repetition algorithm computing dynamic intervals, repetition counts, and ease factors.
   - Multi-category cards (Anatomy identification, Physiological processes, Medical definitions, Clinical interventions, Comparative differentials).
   - "Again", "Hard", "Good", "Easy" ratings with next review interval previews.

4. **Continuous Assessment Test (CAT) & NCLEX Simulator**:
   - Generates original clinical case scenarios with patient presentation, vitals, and lab results.
   - Immediate feedback explaining why the correct option is right and why distractors are clinically incorrect.
   - Topic and Bloom's taxonomy accuracy breakdown.

5. **Timetable Extraction & Deterministic Study Planner**:
   - Upload timetable screenshot/PDF or manual input.
   - Deterministic, conflict-aware scheduler avoiding university lecture blocks.
   - "What should I study now?" feature recommending high-priority tasks based on available minutes.
   - Adaptive "Recover Missed Session" engine redistributing missed work without cognitive overload.

6. **Dedicated Study Room**:
   - Pomodoro timer with study and break cycles.
   - Split-view Cornell notes scratchpad auto-saving to lesson records.
   - Docked AI Study Assistant for in-context questions.
   - Exit recall checkpoint verifying mastery before marking lessons complete.

7. **Measurable Mastery & Analytics**:
   - Transparent 6-tier mastery states (*Not started, In progress, Studied, Needs revision, Understood, Mastered*).
   - Targeted revision radar highlighting weak topics.
   - Weekly study hours target tracker.

8. **Offline-First & Low-Data Resilience**:
   - Full client-side offline storage (`localStorage`) coupled with server persistence (`/api/data`).
   - Clear online/offline visual indicators with manual sync controls.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript (strict mode), Tailwind CSS v4, Lucide Icons.
- **Backend**: Node.js, Express, tsx.
- **AI Engine**: Google GenAI SDK (`@google/genai`) using `gemini-3.8-flash` on server-side endpoints with `User-Agent: aistudio-build`.
- **Database & Auth Architecture**:
  - `firebase-blueprint.json`: Strict Intermediate Representation (IR) defining `UserProfile`, `Course`, `Lesson`, and `StudyPlan`.
  - `firestore.rules`: Zero-Trust Attribute-Based Access Control (ABAC) adhering to the Eight Pillars of Hardened Rules.
  - Server JSON persistence (`.lectra_data.json`) providing instant persistence across browser sessions.

---

## 3. Project Structure

```
├── .env.example              # Environment variables template
├── metadata.json             # Applet metadata & major capabilities
├── firebase-blueprint.json   # Intermediate representation schema for Firestore
├── firestore.rules           # Production-ready Zero-Trust Firestore rules
├── server.ts                 # Full-stack Express server + Gemini AI endpoints
├── package.json              # Dependencies and scripts
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main layout, router, modal controllers
│   ├── index.css             # Tailwind v4 configuration & utility classes
│   ├── types/
│   │   └── index.ts          # Strongly typed domain models
│   ├── data/
│   │   └── seedData.ts       # Authentic Kenyan Nursing curriculum seed data
│   ├── lib/
│   │   ├── spacedRepetition.ts # SuperMemo SM-2 algorithm implementation
│   │   ├── studyScheduler.ts   # Deterministic conflict-aware study planner
│   │   └── storage.ts          # Persistence & offline synchronization layer
│   ├── context/
│   │   └── AppContext.tsx    # Central state provider, actions & search
│   ├── components/
│   │   ├── Navbar.tsx        # Top navigation with sync indicator & search
│   │   ├── Sidebar.tsx       # Desktop academic sidebar & weekly target
│   │   ├── BottomNav.tsx     # Mobile-first thumb navigation
│   │   ├── GlobalSearchModal.tsx # Keyboard-driven global search
│   │   └── StudyNowModal.tsx # "What should I study now?" recommender
│   └── views/
│       ├── HomeView.tsx          # Dashboard, today's lectures & study plan
│       ├── LibraryView.tsx       # Hierarchy explorer & document upload pipeline
│       ├── CoursesView.tsx       # Course units & 5-mode lesson notes reader
│       ├── StudyPlannerView.tsx  # Timetable OCR & deterministic schedule
│       ├── StudyRoomView.tsx     # Focused Pomodoro reading room with AI tutor
│       ├── RevisionCentreView.tsx# SM-2 flashcard review & CAT exam generator
│       ├── AITutorView.tsx       # Grounded clinical nursing AI assistant
│       ├── ProgressView.tsx      # Multi-tier mastery distribution & weak topics
│       └── SettingsView.tsx      # Student profile, curriculum presets, backup
```

---

## 4. Environment Variables

Configure in your environment or Secrets panel:
```env
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

---

## 5. Local Development & Build

```bash
# Install dependencies
npm install

# Start full-stack development server (Express on port 3000 with Vite middleware)
npm run dev

# Run TypeScript type check
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

---

## 6. Known Limitations

- Real-time cloud sync to Firebase Firestore requires provisioning via the Firebase setup UI; local persistence (`localStorage` + server `.lectra_data.json`) operates reliably out of the box.
- Scanned PDF OCR latency is dependent on document size and page count.
