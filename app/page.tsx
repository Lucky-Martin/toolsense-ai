"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Images */}
      <section className="h-screen flex items-center px-4 md:px-8 lg:px-16">
        <div className="container mx-auto grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Description and Button */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              ToolSense AI
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-6">
              Intelligent security assessment and trust analysis for software tools and services. Get comprehensive insights to make informed decisions about the tools you use.
            </p>

            {/* Water Saving Badge */}
            <div className="mb-8 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 w-fit">
              <svg className="w-5 h-5 text-[#006994] rotate-180" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.69c-3.37 0-6 2.63-6 6 0 3.37 6 10.31 6 10.31s6-6.94 6-10.31c0-3.37-2.63-6-6-6z" />
              </svg>
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-[#006994]">Smart caching</span>
              </span>
            </div>

            {user ? (
              <Link
                href="/chat"
                className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg transform hover:scale-105 w-fit"
              >
                Try Now
              </Link>
            ) : (
              <Link
                href="/login?mode=register"
                className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg transform hover:scale-105 w-fit"
              >
                Try Now
              </Link>
            )}
          </div>

          {/* Right Side - Images */}
          <div className="hidden md:flex items-center justify-center relative h-full">
            <div className="relative w-full max-w-2xl">
              {/* Main center image with shadow effect */}
              <div className="relative z-10 transform hover:scale-105 transition-transform duration-300">
                <Image
                  src="/example1.png"
                  alt="ToolSense AI Dashboard"
                  width={600}
                  height={400}
                  className="rounded-2xl w-full h-auto shadow-2xl"
                  priority
                />
              </div>

              {/* Floating side images */}
              <div className="absolute -left-8 top-1/4 transform -translate-y-1/2 z-20 opacity-90 hover:opacity-100 transition-opacity duration-300">
                <Image
                  src="/example2.png"
                  alt="Security Analysis"
                  width={280}
                  height={200}
                  className="rounded-xl w-full h-auto shadow-xl transform hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="absolute -right-8 bottom-1/4 transform translate-y-1/2 z-20 opacity-90 hover:opacity-100 transition-opacity duration-300">
                <Image
                  src="/example3.png"
                  alt="Trust Scoring"
                  width={280}
                  height={200}
                  className="rounded-xl w-full h-auto shadow-xl transform hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rest of the content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Security Assessment</h3>
              <p className="text-gray-600">
                Get comprehensive security analysis and risk assessment for any software tool or service
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600">
                Leverage advanced AI to analyze trust factors, risk indicators, and security metrics
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trust Scoring</h3>
              <p className="text-gray-600">
                Receive detailed trust scores and confidence levels to make informed decisions
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12 mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">How It Works</h2>
            <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
              Our intelligent system uses advanced AI to analyze software tools and provide comprehensive security assessments in just a few simple steps.
            </p>
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Enter Tool Name</h3>
                  <p className="text-gray-600 mb-3">
                    Simply provide the name of the software tool or service you want to assess. Our system supports a wide range of applications, from cloud services and development tools to security software and productivity apps.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>No registration required for basic queries</li>
                    <li>Works with any software tool or service name</li>
                    <li>Multi-language support for global tools</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Analysis</h3>
                  <p className="text-gray-600 mb-3">
                    Our advanced AI system analyzes multiple data sources simultaneously to evaluate security, trust factors, and potential risks. The analysis includes:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Security vulnerability assessments from multiple databases</li>
                    <li>Reputation analysis from user reviews and expert opinions</li>
                    <li>Compliance and certification verification</li>
                    <li>Privacy policy and data handling evaluation</li>
                    <li>Historical security incident tracking</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Comprehensive Report Generation</h3>
                  <p className="text-gray-600 mb-3">
                    Within seconds, receive a detailed report containing trust scores, risk factors, and actionable insights. Each report includes:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Overall trust/risk score (0-100 scale)</li>
                    <li>Detailed rationale explaining the score</li>
                    <li>Identified risk factors and security concerns</li>
                    <li>Positive trust indicators and strengths</li>
                    <li>Confidence level based on available data</li>
                    <li>Source attribution for transparency</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Make Informed Decisions</h3>
                  <p className="text-gray-600 mb-3">
                    Use the comprehensive analysis to make informed decisions about software adoption. Our reports help you:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Understand security implications before integration</li>
                    <li>Compare multiple tools side-by-side</li>
                    <li>Identify potential risks and mitigation strategies</li>
                    <li>Save time with automated research and analysis</li>
                    <li>Access historical reports anytime through your account</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-8 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tip</h4>
                <p className="text-gray-600 text-sm">
                  Responses are cached to save resources and provide faster results for frequently queried tools. When you see a cached response, you're also helping save water - each cached query saves approximately 20ml of water compared to a fresh AI analysis.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-gray-600">
              Join thousands of users making informed decisions about software tools
            </p>
            {user ? (
              <Link
                href="/chat"
                className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg"
              >
                Go to Chat
              </Link>
            ) : (
              <Link
                href="/login?mode=register"
                className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg"
              >
                Get Started Free
              </Link>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-16 text-center text-gray-500 text-sm">
            <p>© 2024 ToolSense AI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
