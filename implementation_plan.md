# Implementation Plan - Sadaqah Jariyah Quran App

## 1. Project Structure
- `index.html`: Home page (Dedication & Navigation)
- `quran.html`: Quran Reading/Tafsir/Search
- `audio.html`: Audio Player (3 Reciters)
- `css/main.css`: Design system, animations, and typography
- `js/core.js`: Initialization and common functions
- `js/quran-logic.js`: Quran fetching, searching, and IndexedDB caching
- `js/audio-logic.js`: Reciter data and player controls

## 2. Design System
- **Colors**: Deep Emerald (#064E3B), Gold (#C5A059), Pearl White (#F8F9FA)
- **Glassmorphism**: 15% opacity backgrounds with backdrop-blur
- **Typography**: 
  - UI: 'Inter', sans-serif
  - Quran: 'Amiri', serif (Google Fonts)

## 3. Features
### 3.1. Landing Page
- Dedication to Sheikh Mansour Al-Haj Mansour
- Large Hero image (Placeholder for `aaa`)
- Quote/Dua section
- Quick navigation buttons to Quran and Audio

### 3.2. Quran Reader (Offline Capable)
- Fetch from `api.alquran.cloud`
- Index by Surah, Juz, and Hizb
- Search functionality (Live filter)
- Ayah-by-Ayah display with Uthmani script
- Click Ayah -> Open Tafsir Modal
- **Offline Storage**: Store JSON data in `IndexedDB`. If data exists, bypass network.

### 3.3. Audio Player
- List of 3 reciters (Al-Zain, Al-Fateh, Noreen)
- Full audio player with progress, skip, and volume
- Download button for each Surah (Direct link to Archive.org files)

## 4. Technical Stack
- HTML5, CSS3 (Vanilla + CSS Variables)
- Vanilla JavaScript (ES6+)
- **Libraries**:
  - FontAwesome (Icons)
  - Animate.css (for smooth entrances)

## 5. Next Steps
1. Setup basic HTML/CSS boilerplate
2. Implement Landing Page UI
3. Build the Quran Fetching/Caching engine
4. Build UI for Quran Reader
5. Implement Audio Player UI and logic
