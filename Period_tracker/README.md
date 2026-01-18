# CycleSync - Private Period Tracker & Cycle Analysis (PWA)

CycleSync is a modern, privacy-focused, client-side progressive web application (PWA) for period tracking and cycle analysis. It is designed to work offline, installable on mobile devices, and requires no backend server.

## Features

*   **Privacy First:** All data is stored locally on your device (`localStorage`). No data ever leaves your phone.
*   **Multi-User Support:** Create and manage multiple profiles on a single device.
*   **Smart Cycle Tracking:**
    *   **Cycle Circle:** Visualizes your current phase (Menstrual, Follicular, Ovulation, Luteal).
    *   **Predictions:** Calculates average cycle length and predicts your next period and fertile window.
*   **Holistic Health Logging:**
    *   Log **Mood** (😊, 😌, 😢, etc.), **Flow Intensity**, and **Symptoms** (Cramps, Acne, etc.).
    *   View your **Log History** to track emotional and physical trends over time.
*   **Emotional Support:**
    *   **Daily Affirmations:** Phase-specific positive messages.
    *   **Partner Connect:** Generate pre-written messages to share your status and needs with a partner.
    *   **Breathe Mode:** A guided 4-4-4-4 box breathing tool for immediate stress relief.
*   **Data Management:**
    *   **Backup & Restore:** Export your entire history as a JSON file and import it anytime.
    *   **Retroactive Logging:** Easily add past cycles if you forgot to log.
*   **Offline Capable (PWA):** Installs to your home screen and works without an internet connection.

## Installation (How to Use)

### As a Website
1.  Simply open the `index.html` file in any modern web browser (Chrome, Safari, Edge).

### As a Mobile App (iOS/Android)
CycleSync is a Progressive Web App (PWA). You can install it to your home screen for a native app experience:

**On iOS (Safari):**
1.  Open the website in Safari.
2.  Tap the **Share** button (square with arrow).
3.  Scroll down and tap **"Add to Home Screen"**.

**On Android (Chrome):**
1.  Open the website in Chrome.
2.  Tap the **Three Dots** menu (top right).
3.  Tap **"Install App"** or **"Add to Home Screen"**.

## Technology Stack

*   **HTML5 & CSS3:** Semantic markup and modern CSS Grid/Flexbox layout.
*   **Vanilla JavaScript (ES6+):** No external frameworks (React/Vue/Angular). Lightweight and fast.
*   **Glassmorphism UI:** Modern aesthetic with soft gradients and blurred transparency.
*   **LocalStorage API:** For persisting user data securely on the client.
*   **Service Worker:** Enables offline functionality and caching.

## Project Structure

```
Period_tracker/
├── index.html      # Main application structure
├── style.css       # All visual styling and animations
├── app.js          # Core logic (State management, UI Controller, Router)
├── sw.js           # Service Worker for offline support
├── manifest.json   # PWA Metadata (App Name, Icons, Theme Color)
└── README.md       # Project documentation
```

## Contributing

Since this is a client-side project, you can easily modify it:
1.  Clone or download the folder.
2.  Open `index.html` in your browser to run it.
3.  Edit `style.css` to change the theme or `app.js` to add new features.

## License

This project is open-source and free to use for personal or educational purposes.
