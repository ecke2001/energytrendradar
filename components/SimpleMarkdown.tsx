import React from 'react';
import { parseSimpleMarkdown, type Inline } from '@/lib/simpleMarkdown';

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((it, i) =>
        it.bold ? <strong key={i} className="text-white">{it.text}</strong>
          : it.italic ? <em key={i} className="text-slate-400">{it.text}</em>
          : <React.Fragment key={i}>{it.text}</React.Fragment>,
      )}
    </>
  );
}

/** Renders the small Markdown subset used by advisor answers as React elements. */
export default function SimpleMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {parseSimpleMarkdown(text).map((block, i) => {
        if (block.type === 'heading') {
          return <div key={i} className="font-bold text-white pt-1"><Inlines items={block.inlines} /></div>;
        }
        if (block.type === 'bullet' || block.type === 'numbered') {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-cyan-400 shrink-0">{block.type === 'bullet' ? '•' : block.marker}</span>
              <span><Inlines items={block.inlines} /></span>
            </div>
          );
        }
        return <p key={i}><Inlines items={block.inlines} /></p>;
      })}
    </div>
  );
}
