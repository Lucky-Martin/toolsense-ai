import React from "react";
import ReactMarkdown from "react-markdown";

/**
 * Render markdown to HTML string for PDF generation
 */
export async function renderMarkdownToHTML(content: string): Promise<string> {
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = '800px';
  document.body.appendChild(tempContainer);

  const { createRoot } = await import('react-dom/client');
  const root = createRoot(tempContainer);

  root.render(
    React.createElement(ReactMarkdown, {
      components: {
        h1: ({ children, ...props }: any) => React.createElement('h1', props, children),
        h2: ({ children, ...props }: any) => React.createElement('h2', props, children),
        h3: ({ children, ...props }: any) => React.createElement('h3', props, children),
        h4: ({ children, ...props }: any) => React.createElement('h4', props, children),
        p: ({ children, ...props }: any) => React.createElement('p', props, children),
        ul: ({ children, ...props }: any) => React.createElement('ul', props, children),
        ol: ({ children, ...props }: any) => React.createElement('ol', props, children),
        li: ({ children, ...props }: any) => React.createElement('li', props, children),
        strong: ({ children, ...props }: any) => React.createElement('strong', props, children),
        em: ({ children, ...props }: any) => React.createElement('em', props, children),
        code: ({ children, className, ...props }: any) => {
          return React.createElement('code', { ...props, className }, children);
        },
        pre: ({ children, ...props }: any) => React.createElement('pre', props, children),
        blockquote: ({ children, ...props }: any) => React.createElement('blockquote', props, children),
        a: ({ children, href, ...props }: any) => React.createElement('a', { ...props, href, target: '_blank', rel: 'noopener noreferrer' }, children),
        hr: (props: any) => React.createElement('hr', props),
        table: ({ children, ...props }: any) => React.createElement('table', props, children),
        thead: ({ children, ...props }: any) => React.createElement('thead', props, children),
        tbody: ({ children, ...props }: any) => React.createElement('tbody', props, children),
        tr: ({ children, ...props }: any) => React.createElement('tr', props, children),
        th: ({ children, ...props }: any) => React.createElement('th', props, children),
        td: ({ children, ...props }: any) => React.createElement('td', props, children),
      },
    }, content)
  );

  await new Promise(resolve => setTimeout(resolve, 200));

  const renderedContent = tempContainer.innerHTML;

  root.unmount();
  document.body.removeChild(tempContainer);

  return renderedContent;
}

/**
 * Generate PDF HTML content
 */
export function generatePDFHTML(userQuery: string, renderedContent: string, isEdited = false): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @media print {
      @page {
        margin: 1in;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 30px;
      font-size: 2em;
    }
    h2 {
      margin-top: 30px;
      margin-bottom: 15px;
      color: #222;
      font-size: 1.5em;
    }
    h3 {
      margin-top: 25px;
      margin-bottom: 10px;
      color: #333;
      font-size: 1.2em;
    }
    h4 {
      margin-top: 20px;
      margin-bottom: 10px;
      color: #444;
      font-size: 1.1em;
    }
    p {
      margin-bottom: 15px;
    }
    ul, ol {
      margin-bottom: 15px;
      padding-left: 30px;
    }
    li {
      margin-bottom: 8px;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background-color: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin-bottom: 15px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 20px;
      margin: 20px 0;
      color: #666;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: 600;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 30px 0;
    }
    .metadata {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <div class="metadata">
    <p><strong>Tool:</strong> ${userQuery}</p>
    <p><strong>Generated by:</strong> ToolSense AI</p>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    ${isEdited ? `<p><strong>Edited:</strong> ${new Date().toLocaleString()}</p>` : ''}
  </div>
  <div id="content">
    ${renderedContent}
  </div>
</body>
</html>
`;
}

/**
 * Create safe filename from user query
 */
export function createSafeFilename(userQuery: string, suffix = ""): string {
  const safeFilename = userQuery
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50) || "security-assessment";

  return suffix ? `${safeFilename}-${suffix}` : safeFilename;
}

