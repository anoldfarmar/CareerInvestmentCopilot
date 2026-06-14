type MarkdownPreviewProps = {
  content?: string | null;
  maxHeight?: number | string;
};

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string; key: string }
  | { type: "paragraph"; text: string; key: string }
  | { type: "list"; items: string[]; key: string };

function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let listItems: string[] = [];

  function flushList(index: number) {
    if (!listItems.length) return;
    blocks.push({ type: "list", items: listItems, key: `list-${index}` });
    listItems = [];
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(index);
      return;
    }

    const listMatch = line.match(/^[-*+]\s+(.+)$/) ?? line.match(/^\d+[.)]\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList(index);

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
        key: `heading-${index}`,
      });
      return;
    }

    blocks.push({ type: "paragraph", text: line, key: `paragraph-${index}` });
  });

  flushList(lines.length);
  return blocks;
}

export function MarkdownPreview({ content, maxHeight }: MarkdownPreviewProps) {
  const blocks = parseMarkdown(content?.trim() || "");

  if (!blocks.length) {
    return <p className="muted">暂无可预览内容</p>;
  }

  return (
    <article className="markdown-preview" style={maxHeight ? { maxHeight } : undefined}>
      {blocks.map((block) => {
        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return <Tag key={block.key}>{block.text}</Tag>;
        }

        if (block.type === "list") {
          return (
            <ul key={block.key}>
              {block.items.map((item, index) => (
                <li key={`${block.key}-${index}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return <p key={block.key}>{block.text}</p>;
      })}
    </article>
  );
}
