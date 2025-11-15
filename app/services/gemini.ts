/**
 * Gemini API Service
 *
 * This service provides a clean interface for interacting with the Gemini API.
 * Optimized for security assessment and tool analysis tasks.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  success: boolean;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;
  private systemInstruction: string;

  constructor() {
    // Use gemini-2.5-pro for best research and analysis capabilities
    // Pro models are required for complex research tasks like security assessments
    // Only Pro models are used - no Flash models
    this.modelName = "gemini-2.5-pro";
    this.systemInstruction = `You are ToolSense AI, a specialized security assessment assistant for CISOs and security teams. Your role is to analyze software tools, applications, and services to provide comprehensive, CISO-ready trust briefs with sources.

When analyzing a tool (given by name, vendor, or URL), you MUST provide a structured security assessment that includes ALL of the following sections.

**IMPORTANT**: Start your response directly with the report. Do NOT include any introductory phrases like "Of course", "Here is", "I'll provide", etc. Begin immediately with "## ToolSense AI Security Brief: [Product Name]" or the first section heading.

## 1. Entity & Vendor Identification
- **Product Name**: Official product name
- **Vendor**: Company/vendor name (including parent company if applicable)
- **Official Website**: Primary website URL
- **Entity Resolution**: Any aliases, common names, or related products

## 2. Taxonomy Classification
Classify the software into clear categories. Examples:
- File sharing/Storage
- GenAI tool
- SaaS CRM
- Endpoint agent
- Collaboration platform
- Development tool
- Security tool
- Communication platform
- Project management
- etc.

Provide primary classification and any secondary classifications.

## 3. Security Posture Summary (with citations)

You MUST cover ALL of the following subsections with specific details and citations:

### 3.1 Description and Primary Use Cases
- What the tool does
- Primary use cases
- Target user base
- Key features

### 3.2 Vendor Reputation and Market Position
- Company size and market presence
- Years in business
- Notable customers/partners
- Market share (if available)
- Financial stability indicators
- Industry recognition/awards

### 3.3 CVE Trend Summaries
- Recent CVE history (last 2-3 years)
- Severity trends (Critical, High, Medium, Low)
- Patching responsiveness
- Notable vulnerabilities
- CISA KEV (Known Exploited Vulnerabilities) status
- Citation: CVE database, CISA KEV catalog

### 3.4 Security Incidents and Abuse Signals
- Publicly disclosed security incidents
- Data breaches
- Abuse reports
- Security advisories
- Bug bounty program status
- Incident response track record
- Citation: Vendor PSIRT pages, security advisories, news sources

### 3.5 Data Handling and Compliance
- Data residency and storage locations
- Data encryption (at rest, in transit)
- Compliance certifications:
  - SOC 2 Type II (with date)
  - ISO 27001 (with date)
  - GDPR compliance
  - HIPAA (if applicable)
  - Other relevant certifications
- Data Processing Agreements (DPA) availability
- Privacy policy highlights
- Citation: Vendor security pages, compliance pages, Terms of Service

### 3.6 Deployment and Administrative Controls
- Deployment models (SaaS, on-premise, hybrid)
- Authentication methods (SSO, MFA, etc.)
- Access controls and permissions
- Audit logging capabilities
- Administrative controls available
- Integration capabilities
- API security

### 3.7 Trust/Risk Score (0-100)
**MANDATORY**: Provide a transparent trust/risk score with:
- **Score**: X/100 (where 100 = highest trust, lowest risk)
- **Rationale**: Detailed explanation of factors considered
- **Confidence Level**: High/Medium/Low confidence in the assessment
- **Risk Factors**: Key risk factors identified
- **Trust Factors**: Key trust factors identified

## 4. Safer Alternatives
Suggest exactly 1-2 alternative tools with:
- Tool name and vendor
- Brief rationale for why it's safer/better
- Key differentiators

**Critical Guidelines**:
- **Sources**: Focus on high-signal sources:
  - Vendor security/PSIRT pages
  - Terms of Service/Data Processing Agreements
  - SOC 2 reports and ISO attestations
  - Reputable advisories/CERTs
  - CISA KEV catalog
  - CVE databases
  - Vendor disclosure/bug bounty sites

- **Claim Labeling**: ALWAYS distinguish between:
  - Vendor-stated claims (e.g., "Vendor claims SOC 2 compliance")
  - Independent security research (e.g., "Independent security audit found...")
  - Public evidence (e.g., "Public CVE database shows...")

- **Insufficient Evidence**: When data is scarce, explicitly state "Insufficient public evidence" rather than speculating

- **Citations**: Provide specific citations and sources for ALL claims. Format as:
  - [Source Name](URL) or
  - Source: [Description](URL)

- **Completeness**: Ensure EVERY section above is addressed. If information is not available, state "No public information available" rather than omitting the section.

- **Format**: Use clear markdown formatting with proper headings, bullet points, and emphasis for readability.

- **Non-Tool Queries**: If the query is not about tool analysis, respond naturally as a helpful AI assistant.

Your response must be comprehensive, well-sourced, and decision-ready for CISOs.`;
  }

  private initializeGenAI(): GoogleGenerativeAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured. Please set it in your environment variables.");
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  /**
   * Send a message to Gemini and get a response
   * @param message - The user's message
   * @param history - Optional conversation history
   * @param language - Language code (e.g., "en", "fr", "es") - defaults to "en"
   * @returns The assistant's response
   */
  async sendMessage(
    message: string,
    history: ChatMessage[] = [],
    language: string = "en"
  ): Promise<string> {
    try {
      const genAI = this.initializeGenAI();

      // Build language-specific system instruction
      const languageInstruction = language !== "en"
        ? `\n\n**LANGUAGE REQUIREMENT**: Generate the entire report in ${language} language. All sections, headings, and content must be in ${language}.`
        : "";

      const fullSystemInstruction = this.systemInstruction + languageInstruction;

      // Build conversation history for Gemini
      const chatHistory = history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      // Try to get the model with systemInstruction support
      // Newer models (1.5-flash, 2.5-flash) support systemInstruction
      let model;

      try {
        // Use gemini-2.5-pro with systemInstruction (best for research)
        model = genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: fullSystemInstruction,
        });
      } catch (error) {
        // If gemini-2.5-pro is overloaded/unavailable, try gemini-2.5-flash
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("overloaded") || errorMessage.includes("503") || errorMessage.includes("not available")) {
          console.warn(`Model ${this.modelName} unavailable/overloaded, trying gemini-2.5-flash`);
          try {
            model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: fullSystemInstruction,
            });
          } catch (flashError) {
            console.warn("gemini-2.5-flash initialization failed:", flashError);
            // Fallback to gemini-1.5-pro if gemini-2.5-flash is not available
            console.warn("gemini-2.5-flash not available, trying gemini-1.5-pro");
            try {
              model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                systemInstruction: fullSystemInstruction,
              });
            } catch (fallbackError) {
              console.warn("gemini-1.5-pro initialization failed:", fallbackError);
              // Last resort: use gemini-pro
              console.warn("gemini-1.5-pro not available, trying gemini-pro");
              try {
                model = genAI.getGenerativeModel({
                  model: "gemini-pro",
                  systemInstruction: fullSystemInstruction,
                });
              } catch (finalError) {
                console.warn("gemini-pro initialization with system instruction failed:", finalError);
                // Final fallback: use gemini-pro without systemInstruction
                console.warn("gemini-pro with systemInstruction not available, using gemini-pro without systemInstruction");
                model = genAI.getGenerativeModel({
                  model: "gemini-pro",
                });
              // Prepend system instruction to message if model doesn't support it
              if (chatHistory.length === 0) {
                message = `${fullSystemInstruction}\n\nUser query: ${message}`;
              }
              }
            }
          }
        } else {
          // For other errors, try gemini-1.5-pro directly
          console.warn(`Model ${this.modelName} error, trying gemini-1.5-pro`);
          try {
            model = genAI.getGenerativeModel({
              model: "gemini-1.5-pro",
              systemInstruction: fullSystemInstruction,
            });
          } catch (fallbackError) {
            console.warn("gemini-1.5-pro initialization failed:", fallbackError);
            // Last resort: use gemini-pro
            console.warn("gemini-1.5-pro not available, trying gemini-pro");
            try {
              model = genAI.getGenerativeModel({
                model: "gemini-pro",
                systemInstruction: fullSystemInstruction,
              });
            } catch (finalError) {
              console.warn("gemini-pro initialization with system instruction failed:", finalError);
              // Final fallback: use gemini-pro without systemInstruction
              console.warn("gemini-pro with systemInstruction not available, using gemini-pro without systemInstruction");
              model = genAI.getGenerativeModel({
                model: "gemini-pro",
              });
              // Prepend system instruction to message if model doesn't support it
              if (chatHistory.length === 0) {
                message = `${fullSystemInstruction}\n\nUser query: ${message}`;
              }
            }
          }
        }
      }

      // Start a chat session
      const chat = model.startChat({
        history: chatHistory,
      });

      // Send the message and get response
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Gemini API error details:", errorMessage);
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  /**
   * Get a streaming response from Gemini
   * @param message - The user's message
   * @param history - Optional conversation history
   * @returns An async generator that yields response chunks
   */
  async* streamMessage(
    message: string,
    history: ChatMessage[] = [],
    language: string = "en"
  ): AsyncGenerator<string, void, unknown> {
    try {
      const genAI = this.initializeGenAI();

      // Build language-specific system instruction
      const languageInstruction = language !== "en"
        ? `\n\n**LANGUAGE REQUIREMENT**: Generate the entire report in ${language} language. All sections, headings, and content must be in ${language}.`
        : "";

      const fullSystemInstruction = this.systemInstruction + languageInstruction;

      const chatHistory = history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      // Use gemini-2.5-pro with systemInstruction (best for research)
      let model;
      try {
        model = genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: fullSystemInstruction,
        });
      } catch (error) {
        // If gemini-2.5-pro is overloaded/unavailable, try gemini-2.5-flash
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("overloaded") || errorMessage.includes("503") || errorMessage.includes("not available")) {
          console.warn(`Model ${this.modelName} unavailable/overloaded, trying gemini-2.5-flash`);
          try {
            model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: fullSystemInstruction,
            });
          } catch (flashError) {
            console.warn("gemini-2.5-flash initialization failed:", flashError);
            // Fallback to gemini-1.5-pro if gemini-2.5-flash is not available
            console.warn("gemini-2.5-flash not available, trying gemini-1.5-pro");
            try {
              model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                systemInstruction: fullSystemInstruction,
              });
            } catch (fallbackError) {
              console.warn("gemini-1.5-pro initialization failed:", fallbackError);
              // Last resort: use gemini-pro
              console.warn("gemini-1.5-pro not available, trying gemini-pro");
              try {
                model = genAI.getGenerativeModel({
                  model: "gemini-pro",
                  systemInstruction: fullSystemInstruction,
                });
              } catch (finalError) {
                console.warn("gemini-pro initialization with system instruction failed:", finalError);
                model = genAI.getGenerativeModel({
                  model: "gemini-pro",
                });
                if (chatHistory.length === 0) {
                  message = `${this.systemInstruction}\n\nUser query: ${message}`;
                }
              }
            }
          }
        } else {
          // For other errors, try gemini-1.5-pro directly
          console.warn(`Model ${this.modelName} error, trying gemini-1.5-pro`);
          try {
            model = genAI.getGenerativeModel({
              model: "gemini-1.5-pro",
              systemInstruction: fullSystemInstruction,
            });
          } catch (fallbackError) {
            console.warn("gemini-1.5-pro initialization failed:", fallbackError);
            // Last resort: use gemini-pro
            console.warn("gemini-1.5-pro not available, trying gemini-pro");
            try {
              model = genAI.getGenerativeModel({
                model: "gemini-pro",
                systemInstruction: fullSystemInstruction,
              });
            } catch (finalError) {
              console.warn("gemini-pro initialization with system instruction failed:", finalError);
              model = genAI.getGenerativeModel({
                model: "gemini-pro",
              });
              if (chatHistory.length === 0) {
                message = `${this.systemInstruction}\n\nUser query: ${message}`;
              }
            }
          }
        }
      }

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessageStream(message);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Gemini streaming error:", errorMessage);
      throw new Error(`Gemini streaming error: ${errorMessage}`);
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService();

