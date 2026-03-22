import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText } from "lucide-react";
import { documents, courseColorMap } from "@/lib/dummyData";

interface DocSelectorProps {
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  compact?: boolean;
}

const DocSelector = ({ selected: controlledSelected, onSelectionChange, compact = false }: DocSelectorProps) => {
  const [internalSelected, setInternalSelected] = useState<string[]>(["1", "3"]);
  const selected = controlledSelected ?? internalSelected;

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setInternalSelected(next);
    onSelectionChange?.(next);
  };

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      {documents.map((doc) => (
        <label
          key={doc.id}
          className={`flex items-center ${compact ? "gap-2 rounded-md px-2.5 py-1.5" : "gap-3 rounded-lg px-3 py-2.5"} cursor-pointer transition-all ${
            selected.includes(doc.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-surface-hover border border-transparent"
          }`}
        >
          <Checkbox
            checked={selected.includes(doc.id)}
            onCheckedChange={() => toggle(doc.id)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <FileText className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0 ${selected.includes(doc.id) ? "text-primary" : "text-muted-foreground"}`} />
          <div className="min-w-0 flex-1">
            <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-foreground truncate`}>{doc.name}</p>
            {!compact && (
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium mt-0.5 ${courseColorMap[doc.courseColor]}`}>
                {doc.courseTag}
              </span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
};

export default DocSelector;
