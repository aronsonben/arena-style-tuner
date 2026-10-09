# Are.na Style Synthesizer

Side project exploring LLM image generation & fine-tuning using [are.na](https://are.na) channels.

By [Concourse Codes](https://concourse.codes)

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Implementation/Architecture Details

- **App.tsx**: React-TypeScript root node

### API Key Logic
- Allow users a few tries with approved API key