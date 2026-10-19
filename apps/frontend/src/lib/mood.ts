// Moods are used by both the quack feed and the profile settings, so they
// live here rather than inside either feature. Mirrors the backend `Mood` enum.
export const MOODS = ["happy", "sad", "angry", "silly"] as const

export type Mood = (typeof MOODS)[number]

export const moodLabels: Record<Mood, { emoji: string; label: string }> = {
  happy: { emoji: "😄", label: "Happy" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  silly: { emoji: "🤪", label: "Silly" },
}
