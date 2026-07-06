# Dang Dai Flashcards — Complete Edition

A browser-based vocabulary app for Books 1–6 of *A Course in Contemporary Chinese*.

## Start the app

The CSV and stroke-order files are loaded by the browser, so open the folder through a small local web server:

1. Double-click `start-server.command` on macOS.
2. Open <http://localhost:8000> if it does not open automatically.
3. Keep the Terminal window open while using the app. Press `Control-C` there to stop it.

Alternatively, run:

```sh
python3 -m http.server 8000
```

## Features

- Original vocabulary list, flashcard, quiz, shuffle, keyboard, remote, and swipe controls
- Mandarin pronunciation through the browser/operating system's Traditional Chinese voice
- Contextual Spanish and Bahasa Indonesia translations for every vocabulary entry in Books 1–4
- Traditional Chinese stroke-order animation and handwriting practice
- Character picker for vocabulary containing more than one Han character
- Character arrows and touch-swipe navigation in stroke practice, with word controls below the writing tools
- Presentation-clicker support: one press moves forward/back and a quick double press flips the flashcard
- Persistent custom hard-word list with add, remove, practice, and typed delete confirmation
- Separate hard-writing-character list with add, remove, practice, and typed delete confirmation
- Lesson-scoped Quick Match, Memory Flip, and Listen & Pick games
- Multi-lesson checkbox selection with Select All, Clear, and live lesson/word totals
- Accessible quiz feedback, question counts, unique answer choices, and keyboard-operable flashcards
- Responsive layouts for phones, computers, and classroom touch displays
- Local Hanzi Writer engine and stroke data; no stroke-order CDN is required

The bundled open-source stroke dataset covers 2,043 of the 2,048 distinct Han characters in the six supplied books. For five uncommon regional/variant forms (`嚐`, `嬤`, `崁`, `汙`, `舺`) that are not present in the upstream dataset, the app gives a clear “not available” notice instead of displaying an incorrect substitute.

Hard words and hard writing characters are saved in the browser's local storage for `localhost:8000`.

## Included third-party data

`vendor/HANZI_WRITER_LICENSE` contains the Hanzi Writer license.
`hanzi-data/ARPHICPL.TXT` contains the license for the bundled character data.
