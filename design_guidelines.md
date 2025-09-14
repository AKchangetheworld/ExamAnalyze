# Design Guidelines: Exam Paper Analysis Web App

## Design Approach
**Selected Approach:** Reference-Based (Mobile-First Utility)
Drawing inspiration from modern productivity apps like Notion and Linear, combined with mobile-first file upload patterns from apps like Google Drive and Dropbox. The design prioritizes simplicity, clear progress indicators, and immediate visual feedback.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Light mode: 220 15% 15% (deep navy text), 220 10% 98% (off-white background)
- Dark mode: 220 10% 95% (light text), 220 15% 8% (dark background)

**Accent Colors:**
- Success: 142 76% 36% (emerald green for completed states)
- Warning: 38 92% 50% (amber for processing states)
- Error: 0 84% 60% (red for error states)

**Neutral Grays:**
- Borders: 220 13% 91% (light), 220 13% 18% (dark)
- Secondary text: 220 9% 46%

### B. Typography
**Font Family:** Inter (Google Fonts)
- Headings: font-semibold (600 weight)
- Body text: font-normal (400 weight)
- UI labels: font-medium (500 weight)

**Scale:**
- Hero/Page titles: text-2xl (24px)
- Section headers: text-lg (18px)
- Body text: text-base (16px)
- Labels/captions: text-sm (14px)

### C. Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Element margins: m-2, m-4
- Grid gaps: gap-4, gap-6
- Container max-width: max-w-md for mobile-first approach

### D. Component Library

**File Upload Zone:**
- Large dropzone with dashed border (border-dashed border-2)
- Upload icon and clear CTAs
- Drag-over state with subtle color shift
- Progress indicators during upload

**Progress States:**
- Linear progress bars with smooth animations
- Step indicators showing: Upload → OCR → Analysis → Results
- Loading spinners for processing states

**Results Cards:**
- Clean white/dark cards with subtle shadows
- Color-coded scoring indicators
- Expandable sections for detailed feedback

**Navigation:**
- Simple tab-based navigation between stages
- Clear "Back" and "Start Over" actions
- Minimal header with app title

**Buttons:**
- Primary: Solid colored buttons for main actions
- Secondary: Outline buttons with subtle backgrounds
- Ghost buttons for tertiary actions

### E. Mobile-First Considerations
- Touch-friendly button sizes (min-h-12)
- Generous spacing for thumb navigation
- Single-column layouts throughout
- Bottom-aligned primary actions
- Swipe gestures for navigation between results

### F. State Management
**Upload States:**
- Empty state with clear upload instructions
- Uploading with progress percentage
- Success with thumbnail preview
- Error with retry options

**Processing States:**
- OCR processing with estimated time
- AI analysis with animated indicators
- Completion with celebratory micro-interactions

**Results Display:**
- Overall score with visual grade indicator
- Expandable feedback sections
- Option to download detailed report
- Share functionality for results

## Images
No large hero images required. The app focuses on functional imagery:
- Upload placeholder icons (document/camera icons)
- Small preview thumbnails of uploaded exam papers
- Simple illustration icons for empty states
- Progress step icons (upload, scan, analyze, results)

All images should maintain the clean, minimal aesthetic with consistent icon styles throughout the interface.