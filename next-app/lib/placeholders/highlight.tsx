import { Fragment } from "react";

export function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) {
    return <>{text}</>;
  }

  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  const segments: { value: string; highlighted: boolean }[] = [];
  let index = 0;

  while (index < text.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, index);
    if (matchIndex === -1) {
      segments.push({ value: text.slice(index), highlighted: false });
      break;
    }

    if (matchIndex > index) {
      segments.push({ value: text.slice(index, matchIndex), highlighted: false });
    }

    segments.push({
      value: text.slice(matchIndex, matchIndex + normalizedQuery.length),
      highlighted: true,
    });
    index = matchIndex + normalizedQuery.length;
  }

  return (
    <Fragment>
      {segments.map((segment, segmentIndex) =>
        segment.highlighted ? (
          <mark key={segmentIndex} className="bg-yellow-200 text-gray-900">
            {segment.value}
          </mark>
        ) : (
          <Fragment key={segmentIndex}>{segment.value}</Fragment>
        )
      )}
    </Fragment>
  );
}
