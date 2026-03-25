import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText } from "lucide-react";
import {
  getUploadedDocs,
  hydrateUploadedDocsFromBackend,
  subscribeUploadedDocs,
} from "@/lib/uploadedDocs";

interface DocSelectorProps {
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  compact?: boolean;
}

const DocSelector = ({ selected: controlledSelected, onSelectionChange, compact = false }: DocSelectorProps) => {
  const [availableDocs, setAvailableDocs] = useState(getUploadedDocs());
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selected = controlledSelected ?? internalSelected;

  useEffect(() => {
    void hydrateUploadedDocsFromBackend();

    const sync = () => setAvailableDocs(getUploadedDocs());
    const unsubscribe = subscribeUploadedDocs(sync);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setInternalSelected((prev) => prev.filter((id) => availableDocs.some((doc) => doc.id === id)));
  }, [availableDocs]);

  const docs = useMemo(() => availableDocs, [availableDocs]);

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setInternalSelected(next);
    onSelectionChange?.(next);
  };

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      {docs.length === 0 && (
        <p className="px-2.5 py-1.5 text-xs text-muted-foreground">No uploaded documents yet.</p>
      )}

      {docs.map((doc) => (
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
            <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-foreground truncate`}>{doc.filename}</p>
            {!compact && (
              <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium mt-0.5 text-primary border-primary/30 bg-primary/10">
                Uploaded
              </span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
};

export default DocSelector;
