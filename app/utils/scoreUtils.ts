/**
 * Get color class based on score value
 */
export function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-500";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get background color class based on score value
 */
export function getScoreBgColor(score: number | null): string {
  if (score === null) return "bg-gray-100";
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  if (score >= 40) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

/**
 * Get ring color class based on score value
 */
export function getScoreRingColor(score: number | null): string {
  if (score === null) return "ring-gray-300";
  if (score >= 80) return "ring-green-300";
  if (score >= 60) return "ring-yellow-300";
  if (score >= 40) return "ring-orange-300";
  return "ring-red-300";
}

