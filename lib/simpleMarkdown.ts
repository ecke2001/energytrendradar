// Minimal Markdown subset for advisor answers: headings (#…), list items (-, *, 1.),
// paragraphs, **bold** and _italic_. Produces plain data that is rendered as
// React elements – no HTML strings, so untrusted text cannot inject markup.

export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface Block {
  type: 'heading' | 'paragraph' | 'bullet' | 'numbered';
  marker?: string;
  inlines: Inline[];
}

export function parseInline(text: string): Inline[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_\s][^_]*_)/g).filter(Boolean);
  return parts.map(part => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return { text: part.slice(2, -2), bold: true };
    if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) return { text: part.slice(1, -1), italic: true };
    return { text: part };
  });
}

export function parseSimpleMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) blocks.push({ type: 'heading', inlines: parseInline(m[1]) });
    else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) blocks.push({ type: 'bullet', inlines: parseInline(m[1]) });
    else if ((m = line.match(/^\s*(\d+)\.\s+(.*)$/))) blocks.push({ type: 'numbered', marker: `${m[1]}.`, inlines: parseInline(m[2]) });
    else blocks.push({ type: 'paragraph', inlines: parseInline(line.trim()) });
  }
  return blocks;
}
