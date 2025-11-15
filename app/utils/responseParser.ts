/**
 * Response Parser Utility
 *
 * Parses security assessment responses to extract:
 * - Score (from Trust/Risk Score section)
 * - Summary (condensed version)
 * - Rationale (why the decision was made)
 * - Source weights (distribution of citations)
 */

export interface ParsedResponse {
  score: number | null;
  scoreText: string;
  rationale: string;
  confidenceLevel: string;
  riskFactors: string[];
  trustFactors: string[];
  summary: string;
  sourceWeights: SourceWeight[];
  fullContent: string;
  productName: string;
}

export interface SourceWeight {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Extract score from response text
 */
function extractScore(content: string): { score: number | null; scoreText: string } {
  // Look for patterns like "Score: 75/100" or "**Score**: 75/100" or "Score: 75"
  const scorePatterns = [
    /\*\*Score\*\*:\s*(\d+)\/100/i,
    /Score:\s*(\d+)\/100/i,
    /\*\*Score\*\*:\s*(\d+)/i,
    /Score:\s*(\d+)/i,
    /(\d+)\/100/i, // Fallback: any number/100
  ];

  for (const pattern of scorePatterns) {
    const match = content.match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) {
        return { score, scoreText: `${score}/100` };
      }
    }
  }

  return { score: null, scoreText: "N/A" };
}

/**
 * Extract section 3.7 (Trust/Risk Score) content
 */
function extractScoreSection(content: string): string {
  // Look for section 3.7 or "Trust/Risk Score" heading
  const sectionPatterns = [
    /###\s*3\.7\s+Trust\/Risk\s+Score[^\n]*\n([\s\S]*?)(?=##|$)/i,
    /##\s*Trust\/Risk\s+Score[^\n]*\n([\s\S]*?)(?=##|$)/i,
    /\*\*Trust\/Risk\s+Score\*\*[^\n]*\n([\s\S]*?)(?=##|$)/i,
  ];

  for (const pattern of sectionPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

/**
 * Extract rationale, confidence level, risk factors, and trust factors
 */
function extractScoreDetails(scoreSection: string): {
  rationale: string;
  confidenceLevel: string;
  riskFactors: string[];
  trustFactors: string[];
} {
  let rationale = "";
  let confidenceLevel = "";
  const riskFactors: string[] = [];
  const trustFactors: string[] = [];

  // Extract rationale - capture multiline content until next section or end
  const rationalePatterns = [
    /\*\*Rationale\*\*:\s*([\s\S]*?)(?=\*\*(?:Confidence|Risk|Trust)|$)/i,
    /Rationale:\s*([\s\S]*?)(?=\*\*(?:Confidence|Risk|Trust)|$)/i,
  ];

  for (const pattern of rationalePatterns) {
    const match = scoreSection.match(pattern);
    if (match) {
      rationale = match[1].trim();
      break;
    }
  }

  // If no rationale found, try to get the main content of the score section
  if (!rationale && scoreSection) {
    // Get content before Confidence/Risk/Trust Factors
    const mainContent = scoreSection.split(/\*\*(?:Confidence|Risk|Trust)/i)[0].trim();
    if (mainContent && mainContent.length > 20) {
      rationale = mainContent;
    }
  }

  // Extract confidence level - only extract the value (High/Medium/Low), not the description
  const confidencePatterns = [
    // Match "Confidence Level: **High**" format (preferred - stops at closing **)
    /\*\*Confidence\s+Level\*\*:\s*\*\*([^*]+?)\*\*/i,
    /Confidence\s+Level:\s*\*\*([^*]+?)\*\*/i,
    // Match "Confidence: **High**" format (without "Level")
    /\*\*Confidence\*\*:\s*\*\*([^*]+?)\*\*/i,
    /Confidence:\s*\*\*([^*]+?)\*\*/i,
    // Match "Confidence Level: High." format (stop at first period, but only take first word/phrase)
    /\*\*Confidence\s+Level\*\*:\s*([^.\n]+?)(?:\.|$)/i,
    /Confidence\s+Level:\s*([^.\n]+?)(?:\.|$)/i,
    // Match "Confidence: High." format (without "Level")
    /\*\*Confidence\*\*:\s*([^.\n]+?)(?:\.|$)/i,
    /Confidence:\s*([^.\n]+?)(?:\.|$)/i,
  ];

  for (const pattern of confidencePatterns) {
    const match = scoreSection.match(pattern);
    if (match) {
      let extracted = match[1].trim();
      // Remove markdown formatting
      extracted = extracted.replace(/\*\*/g, '').replace(/\*/g, '').trim();

      // Extract only the confidence value word(s) - stop at first period or comma
      const beforePunctuation = extracted.split(/[.,;]/)[0].trim();

      // Try to extract just the confidence value (High, Medium, Low, Very High, etc.)
      // Look for common confidence level words
      const confidenceMatch = beforePunctuation.match(/\b(Very\s+)?(High|Medium|Low)\b/i);
      if (confidenceMatch) {
        confidenceLevel = confidenceMatch[0];
      } else {
        // If no match, take only the first word or first two words if they're short
        const words = beforePunctuation.split(/\s+/);
        if (words.length === 1) {
          confidenceLevel = words[0];
        } else if (words.length === 2 && (words[0] + ' ' + words[1]).length <= 15) {
          confidenceLevel = words[0] + ' ' + words[1];
        } else {
          // Just take the first word
          confidenceLevel = words[0];
        }
      }
      break;
    }
  }

  // Extract risk factors - capture multiline content until Trust Factors or end
  const riskPatterns = [
    /\*\*Risk\s+Factors\*\*:\s*([\s\S]*?)(?=\*\*Trust\s+Factors|$)/i,
    /Risk\s+Factors:\s*([\s\S]*?)(?=\*\*Trust\s+Factors|Trust\s+Factors|$)/i,
  ];

  for (const pattern of riskPatterns) {
    const match = scoreSection.match(pattern);
    if (match) {
      const factorsText = match[1].trim();
      // Split by lines but preserve markdown formatting
      // Each factor might be on its own line or have a heading followed by description
      const lines = factorsText.split(/\n/).map(l => l.trim()).filter(l => {
        // Filter out empty lines, whitespace-only lines, and section headers
        return l.length > 0 &&
               l.trim().length > 0 &&
               !l.match(/^#{1,6}\s/) &&
               !l.match(/^\s*$/);
      });
      for (const line of lines) {
        // Additional check: ensure line has actual content (not just punctuation or special chars)
        const contentOnly = line.replace(/[•\-\*\s:]/g, '').trim();
        if (contentOnly.length > 0) {
          riskFactors.push(line);
        }
      }
      break;
    }
  }

  // Extract trust factors - capture multiline content until end
  const trustPatterns = [
    /\*\*Trust\s+Factors\*\*:\s*([\s\S]*?)(?=\*\*(?:Risk|Confidence|Score)|$)/i,
    /Trust\s+Factors:\s*([\s\S]*?)(?=\*\*(?:Risk|Confidence|Score)|$)/i,
  ];

  for (const pattern of trustPatterns) {
    const match = scoreSection.match(pattern);
    if (match) {
      const factorsText = match[1].trim();
      // Split by lines but preserve markdown formatting
      const lines = factorsText.split(/\n/).map(l => l.trim()).filter(l => {
        // Filter out empty lines, whitespace-only lines, and section headers
        return l.length > 0 &&
               l.trim().length > 0 &&
               !l.match(/^#{1,6}\s/) &&
               !l.match(/^\s*$/);
      });
      for (const line of lines) {
        // Additional check: ensure line has actual content (not just punctuation or special chars)
        const contentOnly = line.replace(/[•\-\*\s:]/g, '').trim();
        if (contentOnly.length > 0) {
          trustFactors.push(line);
        }
      }
      break;
    }
  }

  return { rationale, confidenceLevel, riskFactors, trustFactors };
}

/**
 * Extract product name from response
 */
function extractProductName(content: string): string {
  // Look for "ToolSense AI Security Brief: [Product Name]" or section 1
  const patterns = [
    /##\s*ToolSense\s+AI\s+Security\s+Brief:\s*([^\n]+)/i,
    /##\s*1\.\s+Entity\s+&\s+Vendor\s+Identification[^\n]*\n[^\n]*\*\*Product\s+Name\*\*:\s*([^\n]+)/i,
    /\*\*Product\s+Name\*\*:\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "Unknown Product";
}

/**
 * Generate a summary from the response
 */
function generateSummary(content: string, scoreSection: string): string {
  // Try to extract key sections for summary
  const summaryParts: string[] = [];

  // Get product name
  const productName = extractProductName(content);
  if (productName !== "Unknown Product") {
    summaryParts.push(`Security assessment for **${productName}**`);
  }

  // Get taxonomy
  const taxonomyMatch = content.match(/##\s*2\.\s+Taxonomy\s+Classification[^\n]*\n([^\n]+(?:\n(?!##)[^\n]+)*)/i);
  if (taxonomyMatch) {
    const taxonomy = taxonomyMatch[1].trim().substring(0, 100);
    if (taxonomy) {
      summaryParts.push(`Category: ${taxonomy}`);
    }
  }

  // Get key points from score section - use rationale as primary summary
  if (scoreSection) {
    const { rationale, confidenceLevel } = extractScoreDetails(scoreSection);
    if (rationale) {
      // Preserve markdown formatting - use rationale as the main summary
      // Remove confidence level text from rationale if it's included
      let rationaleText = rationale.trim();

      // Remove confidence level mentions from rationale to avoid duplication
      rationaleText = rationaleText
        .replace(/\*\*Confidence\s+Level\*\*:\s*[^\n]+/gi, '')
        .replace(/Confidence\s+Level:\s*[^\n]+/gi, '')
        .replace(/\*\*Confidence\*\*:\s*[^\n]+/gi, '')
        .replace(/Confidence:\s*[^\n]+/gi, '')
        .trim();

      // Limit to reasonable length for preview
      if (rationaleText.length > 400) {
        // Try to cut at sentence boundary
        const cutPoint = rationaleText.lastIndexOf('.', 400);
        summaryParts.push(cutPoint > 200 ? rationaleText.substring(0, cutPoint + 1) : rationaleText.substring(0, 400) + "...");
      } else if (rationaleText.length > 0) {
        summaryParts.push(rationaleText);
      }
    }
    // Don't add confidence level to summary - it's displayed separately in the UI
  }

  // Fallback: use first meaningful paragraph from Security Posture Summary - preserve markdown
  if (summaryParts.length === 0 || (summaryParts.length === 1 && summaryParts[0].includes("Security assessment for"))) {
    // Try to get description from section 3.1
    const descriptionMatch = content.match(/###\s*3\.1\s+Description[^\n]*\n([\s\S]*?)(?=###|##|$)/i);
    if (descriptionMatch) {
      const description = descriptionMatch[1].trim();
      if (description.length > 20) {
        // Clean up list items - convert to proper markdown format
        let descText = description
          .replace(/^[-•*]\s+/gm, '- ') // Normalize bullet points
          .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers for summary
          .trim();
        descText = descText.length > 300 ? descText.substring(0, 300) + "..." : descText;
        summaryParts.push(descText);
      }
    }

    // If still no content, use first few paragraphs (skip headers) - preserve markdown
    if (summaryParts.length === 0 || (summaryParts.length === 1 && summaryParts[0].includes("Security assessment for"))) {
      const paragraphs = content
        .split(/\n\n+/)
        .filter(p => {
          const trimmed = p.trim();
          return trimmed.length > 0 && !trimmed.startsWith("#") && trimmed.length > 20;
        });
      summaryParts.push(...paragraphs.slice(0, 2).map(p => {
        let trimmed = p.trim();
        // Clean up list items for summary
        trimmed = trimmed
          .replace(/^[-•*]\s+/gm, '- ')
          .replace(/^\d+\.\s+/gm, '')
          .trim();
        return trimmed.length > 300 ? trimmed.substring(0, 300) + "..." : trimmed;
      }));
    }
  }

  // Join summary parts and ensure proper markdown formatting
  // Convert list items to plain text for summary (remove list markers)
  const cleanedParts = summaryParts.map(part => {
    // Convert list items to plain text paragraphs
    let cleaned = part
      .replace(/^[-•*]\s+/gm, '') // Remove bullet points
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n[-•*]\s+/g, '. ') // Convert list items to sentences
      .replace(/\n\d+\.\s+/g, '. ') // Convert numbered items to sentences
      // Remove confidence level mentions
      .replace(/\*\*Confidence\s+Level\*\*:\s*[^\n.]+/gi, '')
      .replace(/Confidence\s+Level:\s*[^\n.]+/gi, '')
      .replace(/\*\*Confidence\*\*:\s*[^\n.]+/gi, '')
      .replace(/Confidence:\s*[^\n.]+/gi, '')
      .trim();
    return cleaned;
  }).filter(part => part.length > 0); // Remove empty parts

  let summary = cleanedParts.join(". ").substring(0, 500);

  // Ensure markdown is properly formatted (fix broken bold/italic tags)
  // Fix incomplete bold tags at the end
  summary = summary
    .replace(/\*\*([^*\n]+)$/g, '**$1**') // Complete trailing bold tags
    .replace(/\*([^*\n]+)$/g, '*$1*') // Complete trailing italic tags
    .replace(/\*\*([^*]+)\*\*/g, '**$1**') // Ensure proper bold tags
    .replace(/\*([^*]+)\*/g, '*$1*') // Ensure proper italic tags
    .replace(/\*\*+$/g, '') // Remove trailing asterisks that aren't part of valid markdown
    .replace(/\*+$/g, '') // Remove trailing single asterisks
    .trim();

  return summary || "Security assessment report available. Click to view full details.";
}

/**
 * Extract and count source citations
 */
function extractSourceWeights(content: string): SourceWeight[] {
  const sourceCounts: Map<string, number> = new Map();

  // Patterns to match citations
  const citationPatterns = [
    /\[([^\]]+)\]\(([^)]+)\)/g, // Markdown links [text](url)
    /Source:\s*\[([^\]]+)\]\(([^)]+)\)/gi, // Source: [text](url)
    /Citation:\s*\[([^\]]+)\]\(([^)]+)\)/gi, // Citation: [text](url)
  ];

  // Extract all citations
  const citations: Array<{ text: string; url: string }> = [];
  for (const pattern of citationPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      citations.push({ text: match[1], url: match[2] });
    }
  }

  // Categorize sources
  for (const citation of citations) {
    const url = citation.url.toLowerCase();
    const text = citation.text.toLowerCase();

    let sourceType = "Other";

    if (url.includes("cve") || url.includes("cve.mitre.org") || text.includes("cve")) {
      sourceType = "CVE Database";
    } else if (url.includes("cisa.gov") || url.includes("kev") || text.includes("cisa") || text.includes("kev")) {
      sourceType = "CISA KEV";
    } else if (url.includes("soc") || text.includes("soc 2") || text.includes("soc2")) {
      sourceType = "SOC 2 Reports";
    } else if (url.includes("iso") || text.includes("iso 27001") || text.includes("iso27001")) {
      sourceType = "ISO Certifications";
    } else if (url.includes("psirt") || url.includes("security") || text.includes("psirt") || text.includes("security advisory")) {
      sourceType = "Security Advisories";
    } else if (url.includes("terms") || url.includes("tos") || url.includes("privacy") || text.includes("terms of service")) {
      sourceType = "Terms & Privacy";
    } else if (url.includes("gdpr") || text.includes("gdpr")) {
      sourceType = "GDPR Compliance";
    } else if (url.includes("bugbounty") || text.includes("bug bounty")) {
      sourceType = "Bug Bounty";
    } else if (url.includes("github") || url.includes("gitlab")) {
      sourceType = "Code Repository";
    } else if (url.includes("vendor") || url.includes("company") || url.includes(".com")) {
      sourceType = "Vendor Pages";
    }

    sourceCounts.set(sourceType, (sourceCounts.get(sourceType) || 0) + 1);
  }

  // Convert to array and calculate percentages
  const total = Array.from(sourceCounts.values()).reduce((sum, count) => sum + count, 0);
  const sourceWeights: SourceWeight[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return sourceWeights;
}

/**
 * Main parser function
 */
export function parseResponse(content: string): ParsedResponse {
  const { score, scoreText } = extractScore(content);
  const scoreSection = extractScoreSection(content);
  const { rationale, confidenceLevel, riskFactors, trustFactors } = extractScoreDetails(scoreSection);
  const productName = extractProductName(content);
  const summary = generateSummary(content, scoreSection);
  const sourceWeights = extractSourceWeights(content);

  return {
    score,
    scoreText,
    rationale: rationale || "Assessment based on comprehensive security analysis.",
    confidenceLevel: confidenceLevel || "Medium",
    riskFactors,
    trustFactors,
    summary: summary || content.substring(0, 500),
    sourceWeights,
    fullContent: content,
    productName,
  };
}

/**
 * Check if content is a security assessment report
 */
export function isSecurityAssessment(content: string): boolean {
  // Check for key indicators that this is a security assessment
  const indicators = [
    /ToolSense\s+AI\s+Security\s+Brief/i,
    /Trust\/Risk\s+Score/i,
    /Security\s+Posture\s+Summary/i,
    /Entity\s+&\s+Vendor\s+Identification/i,
    /Taxonomy\s+Classification/i,
  ];

  return indicators.some(pattern => pattern.test(content));
}

