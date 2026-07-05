import type { Source } from '../lib/api';

interface Props {
  source: Source;
}

export default function CitationCard({ source }: Props) {
  return (
    <span
      title={source.filepath}
      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 cursor-default select-none hover:bg-slate-200 transition-colors"
    >
      <span className="font-medium text-slate-800">{source.filename}</span>
      <span className="text-slate-400">·</span>
      <span>chunk {source.chunkIndex}</span>
    </span>
  );
}
