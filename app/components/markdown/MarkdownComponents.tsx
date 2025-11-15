import React from "react";

/**
 * Shared markdown components configuration
 */
export const markdownComponents = {
  h1: (props: any) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2 break-words" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 break-words" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 break-words" {...props} />
  ),
  h4: (props: any) => (
    <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800 break-words" {...props} />
  ),
  p: (props: any) => (
    <p className="mb-3 leading-7 text-gray-700 break-words" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
  ),
  li: (props: any) => (
    <li className="pl-2 leading-7 break-words" {...props} />
  ),
  strong: (props: any) => (
    <strong className="font-semibold text-gray-900 break-words" {...props} />
  ),
  em: (props: any) => (
    <em className="italic text-gray-700 break-words" {...props} />
  ),
  code: ({ node, className, children, ...props }: any) => {
    const isInline = !className || !className.startsWith('language-');
    return isInline ? (
      <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 break-words" {...props}>
        {children}
      </code>
    ) : (
      <code className="text-sm font-mono text-gray-800" {...props}>
        {children}
      </code>
    );
  },
  pre: (props: any) => (
    <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3 text-sm whitespace-pre-wrap break-words" {...props} />
  ),
  hr: (props: any) => (
    <hr className="my-6 border-gray-300" {...props} />
  ),
  a: (props: any) => (
    <a className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600 break-words" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-300" {...props} />
    </div>
  ),
  thead: (props: any) => (
    <thead className="bg-gray-100" {...props} />
  ),
  tbody: (props: any) => (
    <tbody {...props} />
  ),
  th: (props: any) => (
    <th className="border border-gray-300 px-4 py-2 text-left font-semibold break-words" {...props} />
  ),
  td: (props: any) => (
    <td className="border border-gray-300 px-4 py-2 break-words" {...props} />
  ),
};

