// Cloudinary AI Vision prompts shared by the app and the demo seed (which pre-fills the cache with the same key). PURE.
export const SCREEN_PROMPT = "Answer with one word, yes or no. Is this a photograph of a screen, monitor, phone display or a printed photograph, rather than a direct photo of a real scene?"
export const SCREEN_CHECK_KIND = "ai_vision_screen_check"
export const SCREEN_CHECK_INPUT = { v: 1, prompt: SCREEN_PROMPT }

export const parseYesNo = (answer: string): boolean | null => {
  const a = answer.trim().toLowerCase()
  return /^yes\b/.test(a) ? true : /^no\b/.test(a) ? false : null
}
