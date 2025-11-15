"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "../contexts/TranslationContext";
import { ParsedResponse } from "../utils/responseParser";

interface ReportSummaryProps {
  parsedResponse: ParsedResponse;
  isCached?: boolean;
}

export default function ReportSummary({ parsedResponse, isCached }: ReportSummaryProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    score,
    scoreText,
    rationale,
    confidenceLevel,
    riskFactors,
    trustFactors,
    summary,
    sourceWeights,
    fullContent,
    productName,
  } = parsedResponse;

  // Get score color based on value
  const getScoreColor = (score: number | null): string => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number | null): string => {
    if (score === null) return "bg-gray-100";
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    if (score >= 40) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  const getScoreRingColor = (score: number | null): string => {
    if (score === null) return "ring-gray-300";
    if (score >= 80) return "ring-green-300";
    if (score >= 60) return "ring-yellow-300";
    if (score >= 40) return "ring-orange-300";
    return "ring-red-300";
  };

  return (
    <div className="w-full">
      {/* Cached indicator */}
      {isCached && (
        <div className="mb-2 text-xs text-gray-500 italic flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t("chatbot.cachedResponse")} - <span className="text-[#006994] flex items-center gap-1"><svg className="w-3 h-3 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.69c-3.37 0-6 2.63-6 6 0 3.37 6 10.31 6 10.31s6-6.94 6-10.31c0-3.37-2.63-6-6-6z" /></svg>{t("chatbot.waterSaved")}</span>
        </div>
      )}

      {/* Collapsed View - Summary */}
      {!isExpanded && (
        <div
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${getScoreBgColor(score)}`}
          onClick={() => setIsExpanded(true)}
        >
          {/* Score Display */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${getScoreColor(
                  score
                )} ${getScoreBgColor(score)} ring-4 ${getScoreRingColor(score)}`}
              >
                {score !== null ? score : "?"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
                <p className="text-sm text-gray-600">Trust/Risk Score: {scoreText}</p>
                {confidenceLevel && (
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence:{" "}
                    <ReactMarkdown
                      components={{
                        strong: (props) => <strong className="font-semibold" {...props} />,
                        p: (props) => <span {...props} />,
                      }}
                    >
                      {confidenceLevel}
                    </ReactMarkdown>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">Click to expand</span>
              <svg
                className="w-5 h-5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <div className="text-sm text-gray-700 leading-relaxed">
              <ReactMarkdown
                components={{
                  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                  strong: (props) => <strong className="font-semibold" {...props} />,
                  em: (props) => <em className="italic" {...props} />,
                  a: (props) => (
                    <a
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  ul: (props) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                  ol: (props) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                  li: (props) => <li className="text-sm mb-1" {...props} />,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>

          {/* Rationale Preview */}
          {rationale && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-600 mb-1">Why this score?</h4>
              <div className={`text-xs text-gray-600 max-h-12 overflow-hidden relative`}>
                <ReactMarkdown
                  components={{
                    p: (props) => <p className="mb-1 last:mb-0" {...props} />,
                    strong: (props) => <strong className="font-semibold" {...props} />,
                    em: (props) => <em className="italic" {...props} />,
                    a: (props) => (
                      <a
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    ul: (props) => <ul className="list-disc list-inside mb-1 space-y-0.5" {...props} />,
                    ol: (props) => <ol className="list-decimal list-inside mb-1 space-y-0.5" {...props} />,
                    li: (props) => <li className="text-xs" {...props} />,
                  }}
                >
                  {rationale}
                </ReactMarkdown>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t pointer-events-none ${score !== null && score >= 80 ? "from-green-50" :
                      score !== null && score >= 60 ? "from-yellow-50" :
                        score !== null && score >= 40 ? "from-orange-50" :
                          score !== null ? "from-red-50" : "from-gray-100"
                    } to-transparent`}
                />
              </div>
            </div>
          )}

          {/* Source Weights Preview */}
          {sourceWeights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Sources Used:</h4>
              <div className="flex flex-wrap gap-2">
                {sourceWeights.slice(0, 3).map((source, index) => (
                  <div
                    key={index}
                    className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200"
                  >
                    {source.source} ({source.count})
                  </div>
                ))}
                {sourceWeights.length > 3 && (
                  <div className="px-2 py-1 bg-white rounded text-xs text-gray-500 border border-gray-200">
                    +{sourceWeights.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded View - Full Response */}
      {isExpanded && (
        <div className="border border-gray-200 rounded-lg bg-gray-50">
          {/* Header with collapse button */}
          <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getScoreColor(
                  score
                )} ${getScoreBgColor(score)} ring-2 ${getScoreRingColor(score)}`}
              >
                {score !== null ? score : "?"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
                <p className="text-sm text-gray-600">Trust/Risk Score: {scoreText}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span>Collapse</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
          </div>

          {/* Score Details Section */}
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Rationale */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Why this score?</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{rationale}</p>
                {confidenceLevel && (
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Confidence Level:</span>{" "}
                    <ReactMarkdown
                      components={{
                        strong: (props) => <strong className="font-semibold" {...props} />,
                        p: (props) => <span {...props} />,
                      }}
                    >
                      {confidenceLevel}
                    </ReactMarkdown>
                  </p>
                )}
              </div>

              {/* Source Weights */}
              {sourceWeights.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Source Distribution</h4>
                  <div className="space-y-2">
                    {sourceWeights.map((source, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{source.source}</span>
                            <span className="text-xs text-gray-500">{source.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${score !== null && score >= 80 ? "bg-green-200" :
                                  score !== null && score >= 60 ? "bg-yellow-200" :
                                    score !== null && score >= 40 ? "bg-orange-200" :
                                      score !== null ? "bg-red-200" : "bg-gray-200"
                                }`}
                              style={{ width: `${source.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{source.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Risk and Trust Factors */}
            {(riskFactors.length > 0 || trustFactors.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                {riskFactors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-3">Risk Factors</h4>
                    <div className="space-y-2">
                      {riskFactors
                        .filter(factor => {
                          // Filter out empty or whitespace-only factors
                          const trimmed = factor.trim();
                          if (!trimmed || trimmed.length === 0) return false;
                          // Check if it has actual content (not just bullets, dashes, colons, etc.)
                          const contentOnly = trimmed.replace(/[•\-\*\s:]/g, '').trim();
                          return contentOnly.length > 0;
                        })
                        .map((factor, index) => (
                          <div key={index} className="text-xs text-gray-700">
                            <ReactMarkdown
                              components={{
                                p: (props) => <p className="mb-1 last:mb-0" {...props} />,
                                strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
                                em: (props) => <em className="italic" {...props} />,
                                ul: (props) => <ul className="list-disc list-inside ml-2 space-y-0.5" {...props} />,
                                ol: (props) => <ol className="list-decimal list-inside ml-2 space-y-0.5" {...props} />,
                                li: (props) => <li className="text-xs" {...props} />,
                                a: (props) => (
                                  <a
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  />
                                ),
                              }}
                            >
                              {factor.startsWith("-") || factor.startsWith("*") || factor.startsWith("•")
                                ? factor
                                : `- ${factor}`}
                            </ReactMarkdown>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {trustFactors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-3">Trust Factors</h4>
                    <div className="space-y-2">
                      {trustFactors
                        .filter(factor => {
                          // Filter out empty or whitespace-only factors
                          const trimmed = factor.trim();
                          if (!trimmed || trimmed.length === 0) return false;
                          // Check if it has actual content (not just bullets, dashes, colons, etc.)
                          const contentOnly = trimmed.replace(/[•\-\*\s:]/g, '').trim();
                          return contentOnly.length > 0;
                        })
                        .map((factor, index) => (
                          <div key={index} className="text-xs text-gray-700">
                            <ReactMarkdown
                              components={{
                                p: (props) => <p className="mb-1 last:mb-0" {...props} />,
                                strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
                                em: (props) => <em className="italic" {...props} />,
                                ul: (props) => <ul className="list-disc list-inside ml-2 space-y-0.5" {...props} />,
                                ol: (props) => <ol className="list-decimal list-inside ml-2 space-y-0.5" {...props} />,
                                li: (props) => <li className="text-xs" {...props} />,
                                a: (props) => (
                                  <a
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  />
                                ),
                              }}
                            >
                              {factor.startsWith("-") || factor.startsWith("*") || factor.startsWith("•")
                                ? factor
                                : `- ${factor}`}
                            </ReactMarkdown>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Full Content */}
          <div className="p-6">
            <div className="markdown-content overflow-x-hidden break-words">
              <ReactMarkdown
                components={{
                  h1: (props) => (
                    <h1
                      className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2 break-words"
                      {...props}
                    />
                  ),
                  h2: (props) => (
                    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 break-words" {...props} />
                  ),
                  h3: (props) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 break-words" {...props} />
                  ),
                  h4: (props) => (
                    <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800 break-words" {...props} />
                  ),
                  p: (props) => (
                    <p className="mb-3 leading-7 text-gray-700 break-words" {...props} />
                  ),
                  ul: (props) => (
                    <ul className="list-disc list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                  ),
                  ol: (props) => (
                    <ol className="list-decimal list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                  ),
                  li: (props) => <li className="pl-2 leading-7 break-words" {...props} />,
                  strong: (props) => (
                    <strong className="font-semibold text-gray-900 break-words" {...props} />
                  ),
                  em: (props) => <em className="italic text-gray-700 break-words" {...props} />,
                  code: ({ node, className, children, ...props }: any) => {
                    const isInline = !className || !className.startsWith("language-");
                    return isInline ? (
                      <code
                        className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 break-words"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className="text-sm font-mono text-gray-800" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: (props) => (
                    <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3 text-sm whitespace-pre-wrap break-words" {...props} />
                  ),
                  hr: (props) => <hr className="my-6 border-gray-300" {...props} />,
                  a: (props) => (
                    <a
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  blockquote: (props) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600 break-words" {...props} />
                  ),
                  table: (props) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-gray-300" {...props} />
                    </div>
                  ),
                  thead: (props) => <thead className="bg-gray-100" {...props} />,
                  tbody: (props) => <tbody {...props} />,
                  th: (props) => (
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold break-words" {...props} />
                  ),
                  td: (props) => (
                    <td className="border border-gray-300 px-4 py-2 break-words" {...props} />
                  ),
                }}
              >
                {fullContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

