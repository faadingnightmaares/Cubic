# Cubic (مكعب)

Just a side project I've been messing around with — turns PDFs into interactive quizzes using AI. Nothing fancy, but it works pretty well.

## What it does

- Upload a PDF and it'll generate quiz questions from the content
- Chat with AI (using DeepSeek's models)
- Supports both Arabic and English
- Dark theme because why not
- Works on mobile too (hopefully)

## Getting it running

You'll need Node.js installed first.

```bash
# Install stuff
npm install

# Add your DeepSeek API key to a .env file
echo "VITE_DEEPSEEK_API_KEY=your_key_here" > .env

# Run it
npm run dev
```

Get your API key from `https://platform.deepseek.com/api_keys`

## How I built it

- React 18 for the frontend
- Vite because it's fast
- Tailwind for styling (saves time)
- PDF.js for reading PDFs
- DeepSeek API for the AI stuff

## File structure

```
src/
├── components/
│   ├── ChatInterface.jsx    # where the magic happens
│   ├── QuizInterface.jsx    # quiz display
│   ├── QuizConfig.jsx       # PDF upload & settings
│   └── Sidebar.jsx          # chat history
├── contexts/
│   └── ThemeContext.jsx     # theme & language switching
└── App.jsx                  # puts it all together
```

## Some technical stuff I learned

- **PDF chunking**: Large PDFs get split into 5-page chunks so they don't crash the AI
- **Smart content splitting**: Text gets chunked at 8000 chars but tries to keep page boundaries intact
- **Memory management**: Proper cleanup when switching between chats/quizzes
- **Dual AI modes**: "Speed" uses deepseek-chat, "Quality" uses deepseek-reasoner

## Building for production

```bash
npm run build
```

Files end up in `dist/` folder.

## Notes

- Answer by text not implemented btw
- The AI sometimes gets creative with questions, so I added strict prompts to keep it focused on PDF content only
- Arabic RTL support was trickier than expected
- Local storage handles chat history (no backend needed) - can be easily implemented ig?
- Error handling could be better but it's good enough for now

That's about it. Feel free to fork it or whatever.