# Gov Tender Editor — עוזר רכש ממשלתי AI

עוזר דיגיטלי לכתיבת מפרטים טכניים (SOW) למכרזי רכש ממשלתיים.
מבוסס Gemini AI, חיפוש חכם במנהל הרכש (mr.gov.il) ומחקר אינטרנטי אוטומטי.

## ✨ מה הכלי עושה

1. **ריאיון** — שואל שאלות הבהרה על מה רוצים לרכוש
2. **מחקר** — מחפש מכרזים ממשלתיים דומים ותקנים ישראליים רלוונטיים
3. **מסמך** — מייצר מפרט טכני מלא עם ניסוחים משפטיים, דרישות ותקנים
4. **עריכה** — שינויים בשפה חופשית, ייצוא ל-Markdown / HTML / JSON

כל המידע (כולל ה-API Key) נשמר ב-localStorage של הדפדפן בלבד — שום דבר לא עובר לשרת חיצוני.

---

## דרישות מוקדמות

- **Node.js 18+**
- **Gemini API Key** — חינמי, מ-[Google AI Studio](https://aistudio.google.com/apikey)

> ה-API Key מוזן ישירות בממשק האפליקציה — אין צורך לשנות קוד.

---

## התקנה והפעלה

**Windows:** לחץ פעמיים על `start.bat` — מתקין תלויות אוטומטית אם צריך, ואז מפעיל הכל ופותח דפדפן.

**Mac / Linux:**
```bash
# התקנה (חד-פעמי)
cd scraper-service && npm install && cd ..
cd tender-editor && npm install && cd ..

# הפעלה
cd tender-editor && npm run dev &
node scraper-service/index.js
```

פתח: **http://localhost:5173**

---

## מבנה הפרויקט

```
gov-tender-editor/
├── tender-editor/       ← Frontend: React + TypeScript + Vite (port 5173)
│   └── src/
│       ├── App.tsx               ← Main app + agentic flow logic
│       ├── services/
│       │   ├── geminiService.ts  ← Gemini AI integration + Google Search
│       │   └── scraperService.ts ← Backend API client
│       └── components/
│           ├── ResearchPanel.tsx ← Research tab display
│           ├── ThinkingMessage.tsx ← Agentic progress display
│           ├── SettingsPanel.tsx ← API key management
│           └── WalkMe.tsx        ← Guided tour
└── scraper-service/     ← Backend: Node.js + Express (port 3001)
    ├── index.js
    ├── lib/
    │   ├── gov-scraper.js   ← Scrapes mr.gov.il for tenders
    │   ├── pdf-parser.js    ← Extracts text from tender PDFs
    │   └── ai-analyzer.js   ← Gemini-powered relevance scoring
    └── routes/
        ├── search.js    ← POST /search
        ├── analyze.js   ← POST /analyze
        └── insights.js  ← POST /insights
```

---

## Troubleshooting

### Windows: `Cannot find module @rollup/rollup-win32-x64-msvc`

```cmd
cd tender-editor
reinstall.bat
```

> הרץ מ-Windows CMD/PowerShell בלבד — לא מ-WSL.

---

## הצהרת אחריות

האפליקציה מיועדת להדגמה (POC) בלבד. אין ליוצריה כל אחריות לתוצאות הנובעות מכל שימוש, לרבות שימוש מסחרי.
