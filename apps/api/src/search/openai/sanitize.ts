// Cleans model-written text before it can reach the screen. The app renders
// text (never HTML), but we still remove markup, links, citation marks and
// participant tokens, and cut to a maximum length.

// eslint-disable-next-line no-control-regex -- removing control characters is the point
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function cleanText(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined
  const text = value
    .replace(CONTROL, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown link -> its text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/www\.\S+/gi, ' ')
    .replace(/【[^】]*】/g, ' ') // citation marks
    .replace(/\[\d+\]/g, ' ')
    .replace(/\bp(10|[1-9])\b/gi, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
  if (!text) return undefined
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}
