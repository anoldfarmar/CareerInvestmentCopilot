export function extractJsonObject(text: string): unknown {
  let normalized = text.trim();
  const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    normalized = fenced[1]?.trim() ?? normalized;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Model response does not contain a JSON object');
    }
    return JSON.parse(normalized.slice(start, end + 1));
  }
}
