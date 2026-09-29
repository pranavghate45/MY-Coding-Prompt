"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, ExternalLink, Code2 } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  id?: string;
}

export function MarkdownRenderer({ content, id = "md" }: MarkdownRendererProps) {
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  if (!content) return null;

  // Split text into code blocks vs non-code markdown chunks
  const parts = content.split(/(```[\s\S]*?```)/g);

  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code.trim());
    setCopiedBlockId(blockId);
    setTimeout(() => setCopiedBlockId(null), 2000);
  };

  const renderInlineFormattedText = (inlineStr: string, keyPrefix: string) => {
    // Process markdown formatting: bold, italic, inline code, links, images
    const tokens: React.ReactNode[] = [];
    let text = inlineStr;

    // Split by inline code first
    const codeParts = text.split(/(`[^`]+`)/g);

    codeParts.forEach((part, cIdx) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        tokens.push(
          <code
            key={`${keyPrefix}-code-${cIdx}`}
            className="font-mono text-xs text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shadow-inner"
          >
            {part.slice(1, -1)}
          </code>
        );
        return;
      }

      // Process bold, italic, links in text segment
      const inline = part
        .replace(/\*\*(.*?)\*\*/g, (_m, p1) => `__BOLD__${p1}__ENDBOLD__`)
        .replace(/\*(.*?)\*/g, (_m, p1) => `__ITALIC__${p1}__ENDITALIC__`)
        .replace(/\[(.*?)\]\((.*?)\)/g, (_m, p1, p2) => `__LINK__${p1}::${p2}__ENDLINK__`);

      const subRegex = /__BOLD__|__ITALIC__|__LINK__/g;
      let cursor = 0;
      let match: RegExpExecArray | null;

      while ((match = subRegex.exec(inline)) !== null) {
        const start = match.index;
        if (start > cursor) {
          tokens.push(<span key={`${keyPrefix}-txt-${cursor}`}>{inline.slice(cursor, start)}</span>);
        }

        if (match[0] === "__BOLD__") {
          const end = inline.indexOf("__ENDBOLD__", subRegex.lastIndex);
          const val = inline.slice(subRegex.lastIndex, end);
          tokens.push(
            <strong
              key={`${keyPrefix}-b-${start}`}
              className="font-bold text-white bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20"
            >
              {val}
            </strong>
          );
          subRegex.lastIndex = end + "__ENDBOLD__".length;
          cursor = subRegex.lastIndex;
        } else if (match[0] === "__ITALIC__") {
          const end = inline.indexOf("__ENDITALIC__", subRegex.lastIndex);
          const val = inline.slice(subRegex.lastIndex, end);
          tokens.push(
            <em key={`${keyPrefix}-i-${start}`} className="italic text-indigo-200">
              {val}
            </em>
          );
          subRegex.lastIndex = end + "__ENDITALIC__".length;
          cursor = subRegex.lastIndex;
        } else if (match[0] === "__LINK__") {
          const end = inline.indexOf("__ENDLINK__", subRegex.lastIndex);
          const val = inline.slice(subRegex.lastIndex, end);
          const [label, url] = val.split("::");
          tokens.push(
            <a
              key={`${keyPrefix}-a-${start}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition inline-flex items-center gap-0.5"
            >
              <span>{label}</span>
              <ExternalLink size={10} className="inline opacity-70" />
            </a>
          );
          subRegex.lastIndex = end + "__ENDLINK__".length;
          cursor = subRegex.lastIndex;
        }
      }

      if (cursor < inline.length) {
        tokens.push(<span key={`${keyPrefix}-rest-${cursor}`}>{inline.slice(cursor)}</span>);
      }
    });

    return tokens;
  };

  const renderMarkdownBlock = (blockText: string, blockIdx: number) => {
    const lines = blockText.split("\n");
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listType: "ul" | "ol" | null = null;
    let listItems: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = (keySuffix: string) => {
      if (inList && listItems.length > 0) {
        if (listType === "ol") {
          elements.push(
            <ol key={`ol-${keySuffix}`} className="my-3 space-y-1.5 pl-2 font-sans text-sm text-slate-200">
              {listItems}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${keySuffix}`} className="my-3 space-y-1.5 pl-2 font-sans text-sm text-slate-200">
              {listItems}
            </ul>
          );
        }
        inList = false;
        listType = null;
        listItems = [];
      }
    };

    const flushTable = (keySuffix: string) => {
      if (inTable && tableRows.length > 0) {
        const header = tableRows[0];
        const bodyRows = tableRows.slice(1).filter((r) => !r.every((cell) => cell.trim().startsWith("---")));

        elements.push(
          <div key={`table-${keySuffix}`} className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-xl">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-indigo-300 font-semibold">
                  {header.map((col, cIdx) => (
                    <th key={`th-${cIdx}`} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                      {renderInlineFormattedText(col.trim(), `th-${cIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {bodyRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-800/40 transition">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`} className="py-2.5 px-4 font-normal">
                        {renderInlineFormattedText(cell.trim(), `td-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        inTable = false;
        tableRows = [];
      }
    };

    lines.forEach((rawLine, lIdx) => {
      const line = rawLine.trimEnd();

      // Check Table Row: | Col 1 | Col 2 |
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        flushList(`${blockIdx}-${lIdx}`);
        inTable = true;
        const cells = line
          .trim()
          .slice(1, -1)
          .split("|");
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(`${blockIdx}-${lIdx}`);
      }

      // Horizontal Rule
      if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
        flushList(`${blockIdx}-${lIdx}`);
        elements.push(<hr key={`hr-${blockIdx}-${lIdx}`} className="my-5 border-slate-800/80" />);
        return;
      }

      // Headings
      if (line.startsWith("# ")) {
        flushList(`${blockIdx}-${lIdx}`);
        elements.push(
          <h1 key={`h1-${blockIdx}-${lIdx}`} className="text-2xl font-extrabold text-white tracking-tight border-b border-slate-800/80 pb-2 mb-3 mt-5 flex items-center gap-2">
            {renderInlineFormattedText(line.slice(2), `h1-${lIdx}`)}
          </h1>
        );
        return;
      }
      if (line.startsWith("## ")) {
        flushList(`${blockIdx}-${lIdx}`);
        elements.push(
          <h2 key={`h2-${blockIdx}-${lIdx}`} className="text-xl font-bold text-slate-100 mb-2.5 mt-4 text-indigo-200 border-l-2 border-indigo-500 pl-2.5">
            {renderInlineFormattedText(line.slice(3), `h2-${lIdx}`)}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        flushList(`${blockIdx}-${lIdx}`);
        elements.push(
          <h3 key={`h3-${blockIdx}-${lIdx}`} className="text-lg font-semibold text-slate-200 mb-2 mt-3">
            {renderInlineFormattedText(line.slice(4), `h3-${lIdx}`)}
          </h3>
        );
        return;
      }

      // Blockquotes (> Quote)
      if (line.startsWith("> ")) {
        flushList(`${blockIdx}-${lIdx}`);
        elements.push(
          <blockquote key={`bq-${blockIdx}-${lIdx}`} className="border-l-4 border-indigo-500 bg-indigo-950/20 px-4 py-2.5 rounded-r-xl text-slate-300 italic text-sm my-3 shadow-inner">
            {renderInlineFormattedText(line.slice(2), `bq-${lIdx}`)}
          </blockquote>
        );
        return;
      }

      // Unordered List (- or *)
      if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!inList || listType !== "ul") {
          flushList(`${blockIdx}-${lIdx}`);
          inList = true;
          listType = "ul";
        }
        listItems.push(
          <li key={`li-ul-${lIdx}`} className="flex items-start space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-2 shadow-sm shadow-cyan-500/50" />
            <span>{renderInlineFormattedText(line.slice(2), `li-ul-${lIdx}`)}</span>
          </li>
        );
        return;
      }

      // Ordered List (1. 2.)
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        if (!inList || listType !== "ol") {
          flushList(`${blockIdx}-${lIdx}`);
          inList = true;
          listType = "ol";
        }
        listItems.push(
          <li key={`li-ol-${lIdx}`} className="flex items-start space-x-2">
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold rounded-md shrink-0 mt-0.5 border border-indigo-500/30">
              {numMatch[1]}
            </span>
            <span>{renderInlineFormattedText(numMatch[2], `li-ol-${lIdx}`)}</span>
          </li>
        );
        return;
      }

      // Standard Paragraph
      if (line.trim() === "") {
        flushList(`${blockIdx}-${lIdx}`);
        elements.push(<div key={`empty-${blockIdx}-${lIdx}`} className="h-2" />);
        return;
      }

      flushList(`${blockIdx}-${lIdx}`);
      elements.push(
        <p key={`p-${blockIdx}-${lIdx}`} className="text-sm leading-relaxed text-slate-200 my-1 font-sans">
          {renderInlineFormattedText(line, `p-${lIdx}`)}
        </p>
      );
    });

    flushList(`${blockIdx}-end`);
    flushTable(`${blockIdx}-end`);

    return <div key={`block-${blockIdx}`} className="space-y-1">{elements}</div>;
  };

  return (
    <div className="space-y-4 font-sans text-sm text-slate-200 leading-relaxed selection:bg-indigo-500/30">
      {parts.map((part, idx) => {
        // Fenced Code Block
        if (part.startsWith("```") && part.endsWith("```")) {
          const rawContent = part.slice(3, -3);
          const firstLineEnd = rawContent.indexOf("\n");
          const lang = firstLineEnd !== -1 ? rawContent.slice(0, firstLineEnd).trim() : "CODE";
          const codeText = firstLineEnd !== -1 ? rawContent.slice(firstLineEnd + 1) : rawContent;
          const blockId = `${id}-code-${idx}`;

          return (
            <div key={blockId} className="my-4 overflow-hidden rounded-xl border border-slate-800 bg-[#0B0F17] shadow-2xl">
              {/* Code Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-2.5 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="flex space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block shadow-sm" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block shadow-sm" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block shadow-sm" />
                  </span>
                  <span className="font-mono text-[11px] uppercase font-bold text-indigo-300 tracking-wider">
                    {lang || "CODE"}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCode(codeText, blockId)}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition text-[11px] font-mono border border-slate-700/60 shadow-sm"
                >
                  {copiedBlockId === blockId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedBlockId === blockId ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs text-indigo-100 overflow-x-auto leading-relaxed selection:bg-indigo-500/30">
                {codeText}
              </pre>
            </div>
          );
        }

        return renderMarkdownBlock(part, idx);
      })}
    </div>
  );
}
