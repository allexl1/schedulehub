# BSUIR Student Hub — Master Development Roadmap

> **Single source of truth for the project.**
>
> The goal is to build a polished Telegram Mini App for BSUIR students, with an **iOS 26–27-inspired visual language**: translucent materials, depth, layered surfaces, soft motion, refined typography, generous spacing, and a premium feel — while still respecting Telegram Mini App conventions and usability.
>
> Mark completed tasks with `[x]`. Add important decisions and changes to the Change Log.

---

# 0. PRODUCT VISION

## Product

**BSUIR Student Hub**

A modern student companion inside Telegram.

Core promise:

> Open the app and immediately know **what you have, where you need to be, and what is coming next.**

The product should feel substantially more polished and useful than a basic university timetable app.

## Core experience

```text
Telegram Bot
    ↓
Open Student Hub
    ↓
Telegram Mini App
    ├── Home
    ├── Schedule
    ├── Exams
    └── More / Settings
```

## Product principles

- Fast
- Minimal
- Beautiful
- Useful at a glance
- Mobile-first
- Cache-friendly
- Accessible
- Never overwhelming
- Real BSUIR data behind a polished experience

---

# 1. VISUAL DIRECTION — iOS 26–27 INSPIRED

## Goal

Create an aesthetic inspired by modern iOS design rather than copying Apple's UI.

### Visual language

- [ ] Translucent / glass-like surfaces
- [ ] Layered depth
- [ ] Soft background gradients
- [ ] Large rounded cards
- [ ] Subtle borders
- [ ] Soft shadows
- [ ] Strong visual hierarchy
- [ ] Large, confident typography
- [ ] Generous whitespace
- [ ] Smooth micro-interactions
- [ ] Refined iconography
- [ ] Minimal visual noise
- [ ] Adaptive light/dark appearance
- [ ] Telegram theme integration

### Important

Do NOT make the app a literal Apple clone.

Use the design language as inspiration while maintaining a distinct BSUIR Student Hub identity.

---

# 2. PHASE 1 — MINI APP FOUNDATION

## Goal

Get a playable Mini App running as early as possible.

### Project setup

- [ ] Create Mini App frontend
- [ ] Choose frontend framework
- [ ] Recommended: React + Vite
- [ ] Install Telegram WebApp SDK/library
- [ ] Establish frontend folder structure
- [ ] Create development environment
- [ ] Create production build
- [ ] Decide frontend hosting
- [ ] Verify HTTPS requirement
- [ ] Open Mini App from Telegram

### Initial screens

- [ ] Splash/loading screen
- [ ] Onboarding
- [ ] Home
- [ ] Schedule
- [ ] Exams
- [ ] More / Settings

### Navigation

- [ ] Bottom navigation
- [ ] Active tab state
- [ ] Telegram back button handling
- [ ] Safe-area handling
- [ ] Mobile viewport handling

---

# 3. PHASE 2 — DESIGN SYSTEM

## Goal

Create the visual foundation before building dozens of components.

### Typography

- [ ] Choose primary font
- [ ] Define display size
- [ ] Define heading sizes
- [ ] Define body sizes
- [ ] Define captions
- [ ] Define font weights
- [ ] Define line heights

### Color system

- [ ] Background tokens
- [ ] Surface tokens
- [ ] Elevated surface tokens
- [ ] Text tokens
- [ ] Secondary text
- [ ] Accent color
- [ ] Success
- [ ] Warning
- [ ] Error
- [ ] Schedule lesson colors

### Materials

- [ ] Glass/translucent card
- [ ] Solid card
- [ ] Elevated card
- [ ] Bottom navigation material
- [ ] Modal/sheet material

### Shape

- [ ] Small radius
- [ ] Medium radius
- [ ] Large radius
- [ ] Extra-large hero cards
- [ ] Pill buttons

### Motion

- [ ] Page transitions
- [ ] Card entrance animation
- [ ] Press feedback
- [ ] Tab transitions
- [ ] Bottom sheet transitions
- [ ] Skeleton shimmer
- [ ] Respect reduced-motion preference

---

# 4. PHASE 3 — ONBOARDING

## Goal

Make first launch effortless.

### Flow

```text
Welcome
   ↓
Find your group
   ↓
Select group
   ↓
Select subgroup
   ↓
Done
   ↓
Home
```

### Tasks

- [ ] Welcome screen
- [ ] Group search
- [ ] Group results
- [ ] Group selection
- [ ] Subgroup selection
- [ ] "Both subgroups" option
- [ ] Save selection locally
- [ ] Loading state
- [ ] Error state
- [ ] Ability to change group later

---

# 5. PHASE 4 — HOME SCREEN

## Goal

Make the home screen immediately useful.

### Hero section

- [ ] Greeting
- [ ] Current date
- [ ] Current week
- [ ] Next lesson card
- [ ] Countdown
- [ ] Room
- [ ] Teacher
- [ ] Lesson type

### Today

- [ ] Today's lesson list
- [ ] Current lesson highlight
- [ ] Completed lesson state
- [ ] Upcoming lesson state
- [ ] Free-period state
- [ ] No-classes state

### Status

- [ ] Data freshness indicator
- [ ] Last updated time
- [ ] Cached-data indicator
- [ ] BSUIR outage indicator

---

# 6. PHASE 5 — SCHEDULE

## Goal

Create the best part of the application.

### Views

- [ ] Today
- [ ] Tomorrow
- [ ] Week
- [ ] Week navigation
- [ ] Day navigation

### Lesson card

Each lesson can show:

- [ ] Subject
- [ ] Type
- [ ] Time
- [ ] Duration
- [ ] Room
- [ ] Teacher
- [ ] Subgroup
- [ ] Notes

### UX

- [ ] Current lesson indicator
- [ ] Timeline
- [ ] Free time visualization
- [ ] Swipe between days
- [ ] Smooth week transitions
- [ ] Expand lesson details
- [ ] Room action
- [ ] Teacher action

---

# 7. PHASE 6 — EXAMS

## Goal

Give exams their own polished experience.

- [ ] Exam list
- [ ] Exam cards
- [ ] Countdown
- [ ] Date/time
- [ ] Subject
- [ ] Room
- [ ] Teacher
- [ ] Exam details
- [ ] Calendar export
- [ ] Exam reminders

---

# 8. PHASE 7 — MORE / SETTINGS

## Goal

Keep secondary functionality organized.

- [ ] Group
- [ ] Subgroup
- [ ] Notifications
- [ ] Appearance
- [ ] Language
- [ ] About
- [ ] API status
- [ ] Clear cached data

---

# 9. PHASE 8 — MOCK DATA FIRST

## Goal

Build the entire interface before depending on BSUIR availability.

- [ ] Create realistic mock schedule
- [ ] Create mock exams
- [ ] Create mock user
- [ ] Create mock API states
- [ ] Create empty states
- [ ] Create loading states
- [ ] Create error states
- [ ] Create offline/stale state

### Rule

The UI should be testable even if the BSUIR API is completely down.

---

# 10. PHASE 9 — CONNECT TELEGRAM

## Goal

Make the frontend behave correctly inside Telegram.

- [ ] Telegram user identity
- [ ] Telegram theme
- [ ] Color scheme
- [ ] Viewport
- [ ] Safe areas
- [ ] Back button
- [ ] Main button where appropriate
- [ ] Haptic feedback where supported
- [ ] Test iOS Telegram
- [ ] Test Android Telegram
- [ ] Test Telegram Desktop/Web where appropriate

---

# 11. PHASE 10 — CONNECT REAL BSUIR DATA

## Goal

Replace mock data with real data.

Current project components:

- `index.js`
- `bsuirApi.js`
- `healthCheck.js`
- `package.json`
- `.env`

### Tasks

- [ ] Audit existing API wrapper
- [ ] Confirm current BSUIR API endpoints
- [ ] Normalize schedule responses
- [ ] Connect group search
- [ ] Connect current week
- [ ] Connect group schedule
- [ ] Connect teacher schedule
- [ ] Connect exams if available
- [ ] Handle HTTP 503
- [ ] Handle timeouts
- [ ] Handle rate limits
- [ ] Handle malformed responses

### Important

The Mini App should NOT directly depend on raw BSUIR API responses.

Preferred architecture:

```text
Mini App
   ↓
Our API / service layer
   ↓
BSUIR API
```

---

# 12. PHASE 11 — CACHE / OFFLINE MODE

## Goal

Make the app useful during BSUIR outages.

### Behavior

```text
BSUIR online
    ↓
Fetch
    ↓
Cache
    ↓
Serve


BSUIR 503
    ↓
Use cache
    ↓
Show last updated time
```

### Tasks

- [ ] Choose storage/database
- [ ] Verify compatibility with fps.ms free tier
- [ ] Store schedules
- [ ] Store fetch timestamp
- [ ] Store data version
- [ ] Detect stale data
- [ ] Serve cached schedule
- [ ] Show stale-data UI
- [ ] Refresh when service returns

---

# 13. PHASE 12 — NOTIFICATIONS

## Goal

Turn the schedule into a proactive assistant.

### Class reminders

- [ ] 30-minute reminder
- [ ] Optional 10-minute reminder
- [ ] User-configurable reminder time
- [ ] Disable reminders
- [ ] Respect timezone

### Schedule changes

- [ ] Detect added class
- [ ] Detect removed class
- [ ] Detect room change
- [ ] Detect teacher change
- [ ] Detect time change
- [ ] Notify affected users

Example:

```text
🚨 Schedule changed

Mathematics

14:00 · 4-301
        ↓
14:00 · 5-204
```

---

# 14. PHASE 13 — ROOMS / CAMPUS

- [ ] Building information
- [ ] Floor information
- [ ] Room information
- [ ] Room search
- [ ] Campus map
- [ ] "Where is my next class?"
- [ ] Navigation integration if possible

---

# 15. PHASE 14 — CALENDAR

- [ ] ICS export
- [ ] Apple Calendar compatibility
- [ ] Google Calendar compatibility
- [ ] Export single lesson
- [ ] Export week
- [ ] Export semester
- [ ] Export exams

---

# 16. PHASE 15 — PERSONAL PLANNER

- [ ] Personal event
- [ ] Edit event
- [ ] Delete event
- [ ] Recurring event
- [ ] Notes
- [ ] Categories
- [ ] Display alongside official schedule

Categories:

- Study
- Assignment
- Personal
- Gym
- Other

---

# 17. PHASE 16 — AI ASSISTANT

Only begin after reliable schedule data exists.

Possible questions:

- [ ] "When am I free tomorrow?"
- [ ] "When can I study for two hours?"
- [ ] "What do I have tomorrow?"
- [ ] "When is my next exam?"
- [ ] "How many classes do I have this week?"
- [ ] "Where is my next class?"

AI must use actual user schedule data.

---

# 18. PHASE 17 — STATISTICS

- [ ] Classes this week
- [ ] Classes this semester
- [ ] Hours in class
- [ ] Most frequent room
- [ ] Most frequent teacher
- [ ] Lesson type breakdown
- [ ] Semester progress
- [ ] Shareable statistics

---

# 19. PHASE 18 — PRODUCTION / RELIABILITY

- [ ] Error logging
- [ ] Monitoring
- [ ] Database backups
- [ ] API health monitoring
- [ ] Rate-limit protection
- [ ] Cache validation
- [ ] Authentication review
- [ ] Secret/environment review
- [ ] Dependency review
- [ ] Security review

### Hosting

- [ ] Verify fps.ms free-tier CPU/RAM limits
- [ ] Verify persistence
- [ ] Verify background jobs
- [ ] Verify database compatibility
- [ ] Verify frontend hosting
- [ ] Decide whether migration to another host is necessary

---

# 20. CURRENT PROJECT STRUCTURE

Current known files:

```text
index.js
bsuirApi.js
healthCheck.js
package.json
.env
```

Do not delete or rewrite existing working components without checking their current role.

---

# 21. DEVELOPMENT ORDER — CURRENT

## We are currently here:

### 🚧 Phase 1 — Mini App Foundation

Immediate tasks:

- [ ] Decide frontend structure
- [ ] Create Mini App frontend
- [ ] Set up React + Vite
- [ ] Create basic Telegram Mini App shell
- [ ] Create bottom navigation
- [ ] Create Home
- [ ] Create Schedule
- [ ] Create Exams
- [ ] Create More / Settings
- [ ] Add mock data
- [ ] Build first polished visual pass

### After that:

- [ ] Design system refinement
- [ ] Onboarding
- [ ] Real schedule UI
- [ ] Telegram integration
- [ ] BSUIR API integration
- [ ] Cache
- [ ] Notifications

---

# 22. DESIGN QUALITY CHECKLIST

Before calling the UI "finished":

- [ ] Looks excellent on a small iPhone
- [ ] Looks excellent in dark mode
- [ ] Looks excellent in light mode
- [ ] No cramped cards
- [ ] No excessive borders
- [ ] No unnecessary gradients
- [ ] Animations feel intentional
- [ ] Scrolling feels smooth
- [ ] Touch targets are comfortable
- [ ] Text hierarchy is obvious
- [ ] Important information is visible immediately
- [ ] Loading states feel polished
- [ ] Errors are understandable
- [ ] Empty states feel designed
- [ ] No generic template appearance
- [ ] Does not look like a copied Apple app
- [ ] Still feels like a Telegram Mini App

---

# 23. CHANGE LOG

## 2026-08-10

- Project direction changed from a Telegram bot with schedule checks into a **Telegram Mini App product**.
- Development strategy changed to **UI/product first, backend second**.
- The Mini App will initially use mock data.
- Real BSUIR API integration will happen after the UI foundation exists.
- The target visual direction is **iOS 26–27-inspired**, with a premium translucent/layered aesthetic.
- The existing Telegram bot remains the entry point.
- Existing BSUIR API and health-check code should be reused rather than discarded.
- Cached/offline schedule behavior remains a core requirement.
- Direct Mini App → raw BSUIR API communication is discouraged; a service/backend layer will eventually sit between them.

---

# 24. ARCHITECTURE DECISIONS

| Decision | Status | Notes |
|---|---|---|
| Telegram Bot | ✅ | Entry point |
| Telegram Mini App | ✅ | Main product |
| UI-first development | ✅ | Build product before backend expansion |
| Mock data initially | ✅ | Allows UI development during BSUIR outages |
| iOS 26–27-inspired aesthetic | ✅ | Inspiration, not a literal Apple clone |
| React + Vite | 🟡 Proposed | Use unless technical testing gives a reason not to |
| Direct Mini App → BSUIR API | ❌ | Prefer our service/backend layer |
| Cached schedules | ✅ Planned | Required for outages |
| Notifications | 🟡 Planned | Later phase |
| Database | ⏳ | Choose after UI data requirements are known |
| Frontend hosting | ⏳ | Decide during Mini App setup |
| Backend hosting | ⏳ | Currently fps.ms free tier |

---

# 25. RULES FOR OUR DEVELOPMENT SESSIONS

1. **One meaningful change at a time.**
2. **Use the actual project files; do not invent replacement architecture unnecessarily.**
3. **Do not rewrite working code unless there is a reason.**
4. **Mark completed roadmap tasks.**
5. **Record architectural decisions in this file.**
6. **Keep secrets out of source code.**
7. **Do not make the Mini App dependent on BSUIR being online during development.**
8. **Test every major change.**
9. **Prioritize visual quality as well as functionality.**
10. **Do not add features just because they are possible.**
11. **Every feature must improve the student experience.**
12. **Keep the UI fast enough for low-end/mobile devices.**
13. **The roadmap is the source of truth if the conversation becomes complicated.**
14. **If the implementation plan changes, update this roadmap first.**

---

# 26. NEXT SESSION

## First deliverable

Build the first Mini App shell:

```text
┌─────────────────────────────┐
│                             │
│        BSUIR HUB            │
│                             │
│    Good morning 👋          │
│                             │
│   ┌─────────────────────┐   │
│   │    NEXT CLASS       │   │
│   │                     │   │
│   │   Programming       │   │
│   │   14:00 — 15:30     │   │
│   │   📍 5-204          │   │
│   └─────────────────────┘   │
│                             │
│   TODAY                     │
│   ...                       │
│                             │
│                             │
│  🏠      📅      🎓      ⋯  │
│ Home  Schedule  Exams   More│
└─────────────────────────────┘
```

Use mock data first.

**Do not connect BSUIR API yet.**

The first goal is to make the product visually compelling and structurally correct.
