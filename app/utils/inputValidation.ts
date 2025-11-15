/**
 * Input Validation and Security Utilities
 *
 * Validates user inputs to prevent prompt injection attacks and ensure
 * inputs are limited to product names, company names, or URLs.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedInput?: string;
}

/**
 * Common prompt injection patterns to detect and block
 */
const PROMPT_INJECTION_PATTERNS = [
  // Instruction override attempts
  /forget\s+(all\s+)?(previous|prior|earlier|past)\s+(instructions?|prompts?|directives?|commands?)/i,
  /ignore\s+(all\s+)?(previous|prior|earlier|past)\s+(instructions?|prompts?|directives?|commands?)/i,
  /disregard\s+(all\s+)?(previous|prior|earlier|past)\s+(instructions?|prompts?|directives?|commands?)/i,
  /override\s+(previous|prior|earlier|past)\s+(instructions?|prompts?|directives?|commands?)/i,
  /you\s+are\s+now/i,
  /from\s+now\s+on/i,
  /new\s+instructions?/i,
  /system\s+prompt/i,
  /system\s+instruction/i,

  // Role manipulation attempts
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the)\s+/i,
  /pretend\s+to\s+be/i,
  /roleplay\s+as/i,
  /you\s+are\s+(a|an|the)\s+/i,

  // Context breaking attempts
  /start\s+a\s+new\s+conversation/i,
  /clear\s+(the\s+)?(conversation|history|context|memory)/i,
  /reset\s+(the\s+)?(conversation|history|context|memory)/i,

  // Code execution attempts
  /execute\s+(code|script|command)/i,
  /run\s+(code|script|command)/i,
  /eval\s*\(/i,
  /<script/i,
  /javascript:/i,

  // Data extraction attempts
  /show\s+(me\s+)?(your|the)\s+(system|prompt|instructions?|directives?)/i,
  /reveal\s+(your|the)\s+(system|prompt|instructions?|directives?)/i,
  /what\s+are\s+your\s+(instructions?|directives?|prompts?)/i,
  /print\s+(your|the)\s+(system|prompt|instructions?)/i,

  // Jailbreak attempts
  /jailbreak/i,
  /bypass/i,
  /hack/i,
  /exploit/i,

  // Special characters that might be used for injection
  /```[\s\S]*?```/, // Code blocks
  /\[INST\]/i, // Instruction markers
  /<\|(system|user|assistant)\|>/i, // ChatML markers
];

/**
 * Suspicious patterns that might indicate malicious intent
 */
const SUSPICIOUS_PATTERNS = [
  /<[^>]+>/g, // HTML tags
  /\[.*?\]\(.*?\)/g, // Markdown links (might be used for injection)
  /`[^`]+`/g, // Code snippets
];

/**
 * Valid URL pattern (basic validation)
 * Supports http://, https://, or domain-only formats
 */
const URL_PATTERN = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.\-]*)*\/?$/i;

/**
 * Valid product/company name pattern
 * Allows letters, numbers, spaces, hyphens, underscores, and common punctuation
 * Must be between 1 and 200 characters
 */
const PRODUCT_NAME_PATTERN = /^[a-zA-Z0-9\s\-_.,&()]+$/;

/**
 * Maximum input length
 */
const MAX_INPUT_LENGTH = 500;

/**
 * Minimum meaningful input length (after trimming)
 */
const MIN_INPUT_LENGTH = 1;

/**
 * Checks if input contains prompt injection patterns
 */
function containsPromptInjection(input: string): boolean {
  const normalizedInput = input.toLowerCase().trim();

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalizedInput)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if input contains suspicious patterns
 */
function containsSuspiciousPatterns(input: string): boolean {
  // Check for HTML tags (always suspicious)
  if (/<[^>]+>/.test(input)) {
    return true;
  }

  // Check for code blocks (suspicious if multiple)
  const codeBlocks = input.match(/`[^`]+`/g);
  if (codeBlocks && codeBlocks.length > 2) {
    return true; // Too many code blocks
  }

  // Check for markdown links (suspicious if multiple)
  const markdownLinks = input.match(/\[.*?\]\(.*?\)/g);
  if (markdownLinks && markdownLinks.length > 3) {
    return true; // Too many markdown links
  }

  // URLs are allowed, so don't flag them as suspicious
  // (URL validation happens separately)

  return false;
}

/**
 * Validates if input is a valid URL
 */
function isValidURL(input: string): boolean {
  const trimmed = input.trim();

  // Check if it matches URL pattern
  if (!URL_PATTERN.test(trimmed)) {
    return false;
  }

  // Additional validation: must contain a dot (for domain)
  if (!trimmed.includes('.')) {
    return false;
  }

  // Try to parse as URL if it doesn't start with http
  try {
    const urlToTest = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(urlToTest);
    // Valid URL must have a hostname
    return url.hostname.length > 0 && url.hostname.includes('.');
  } catch {
    // If URL parsing fails but pattern matches, it might still be a valid domain
    // Check if it looks like a domain (has TLD)
    const parts = trimmed.replace(/^https?:\/\//, '').split('/')[0].split('.');
    return parts.length >= 2 && parts[parts.length - 1].length >= 2;
  }
}

/**
 * Validates if input is a valid product/company name
 */
function isValidProductOrCompanyName(input: string): boolean {
  // Remove common prefixes/suffixes that might be part of natural language
  // But keep the original for validation to be more lenient
  const cleaned = input
    .replace(/^(analyze|assess|check|evaluate|review|tell me about|what is|who is|show me|get|find)\s+/i, '')
    .replace(/\s+(security|assessment|report|analysis|tool|software|service|platform|product)$/i, '')
    .trim();

  // Use cleaned version for pattern matching, but check original length
  if (cleaned.length < MIN_INPUT_LENGTH) {
    return false;
  }

  // Check if it matches product/company name pattern (allow more characters)
  // Allow letters, numbers, spaces, hyphens, underscores, dots, commas, parentheses, ampersands
  const namePattern = /^[a-zA-Z0-9\s\-_.,&()]+$/;
  if (!namePattern.test(cleaned)) {
    return false;
  }

  // Must have at least one letter (not just numbers/symbols)
  if (!/[a-zA-Z]/.test(cleaned)) {
    return false;
  }

  // Check length (use original input length for max check)
  if (input.length > MAX_INPUT_LENGTH) {
    return false;
  }

  // Reject if it looks like code or script (multiple special characters in sequence)
  if (/[<>{}[\]\\|`~!@#$%^&*+=?;:'"]{2,}/.test(input)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes input by removing potentially dangerous content
 */
function sanitizeInput(input: string): string {
  let sanitized = input.trim();

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }

  return sanitized;
}

/**
 * Main validation function
 * Validates that input is either:
 * 1. A valid URL
 * 2. A valid product/company name
 * 3. Not containing prompt injection patterns
 */
export function validateInput(input: string): ValidationResult {
  // Check if input is provided
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: 'Input is required and must be a string',
    };
  }

  // Sanitize input
  const sanitized = sanitizeInput(input);

  // Check minimum length
  if (sanitized.length < MIN_INPUT_LENGTH) {
    return {
      isValid: false,
      error: 'Input is too short. Please provide a product name, company name, or URL.',
    };
  }

  // Check maximum length
  if (sanitized.length > MAX_INPUT_LENGTH) {
    return {
      isValid: false,
      error: `Input is too long. Maximum length is ${MAX_INPUT_LENGTH} characters.`,
    };
  }

  // Check for prompt injection patterns
  if (containsPromptInjection(sanitized)) {
    return {
      isValid: false,
      error: 'Invalid input detected. Please provide only a product name, company name, or URL.',
    };
  }

  // Check for suspicious patterns (but allow URLs)
  if (containsSuspiciousPatterns(sanitized) && !isValidURL(sanitized)) {
    return {
      isValid: false,
      error: 'Input contains suspicious patterns. Please provide only a product name, company name, or URL.',
    };
  }

  // Validate that input is either a URL or a product/company name
  const isURL = isValidURL(sanitized);
  const isProductOrCompany = isValidProductOrCompanyName(sanitized);

  if (!isURL && !isProductOrCompany) {
    return {
      isValid: false,
      error: 'Invalid input format. Please provide a product name, company name, or URL.',
    };
  }

  return {
    isValid: true,
    sanitizedInput: sanitized,
  };
}

/**
 * Validates conversation history to prevent injection through history
 */
export function validateHistory(history: Array<{ role: string; content: string }>): ValidationResult {
  if (!Array.isArray(history)) {
    return {
      isValid: false,
      error: 'History must be an array',
    };
  }

  // Limit history length to prevent abuse
  if (history.length > 50) {
    return {
      isValid: false,
      error: 'Conversation history is too long',
    };
  }

  // Validate each message in history
  for (const message of history) {
    if (!message.role || !message.content) {
      return {
        isValid: false,
        error: 'Invalid message format in history',
      };
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      return {
        isValid: false,
        error: 'Invalid role in history',
      };
    }

    // Only validate user messages for injection patterns
    if (message.role === 'user') {
      const validation = validateInput(message.content);
      if (!validation.isValid) {
        return validation;
      }
    }

    // Check length of assistant messages
    if (message.role === 'assistant' && message.content.length > 50000) {
      return {
        isValid: false,
        error: 'Assistant message in history is too long',
      };
    }
  }

  return {
    isValid: true,
  };
}

