import { FileText } from "lucide-react";

interface CitationChipProps {
  file: string;
  chunk: number;
  score?: number;
}

const CitationChip = ({ file, chunk, score }: CitationChipProps) => {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer">
      <FileText className="h-3 w-3" />
      {file} · §{chunk}
      {score !== undefined && (
        <span className="ml-1 text-primary/70">{Math.round(score * 100)}% match</span>
      )}
    </span>
  );
};

export default CitationChip;