import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Zap, Trash2, FileText } from "lucide-react";
import DocUploader from "@/components/DocUploader";
import {
  getUploadedDocs,
  hydrateUploadedDocsFromBackend,
  subscribeUploadedDocs,
  type UploadedDoc,
} from "@/lib/uploadedDocs";

const bentoSizes = [
  "sm:col-span-2 sm:row-span-1",
  "sm:col-span-1 sm:row-span-2",
  "sm:col-span-1 sm:row-span-1",
  "sm:col-span-2 sm:row-span-1",
];

const Dashboard = () => {
  const [documents, setDocuments] = useState<UploadedDoc[]>(getUploadedDocs());

  useEffect(() => {
    void hydrateUploadedDocsFromBackend();

    const sync = () => setDocuments(getUploadedDocs());
    const unsubscribe = subscribeUploadedDocs(sync);
    return unsubscribe;
  }, []);

  const formatUploadDate = (uploadedAtIso: string) => {
    const date = new Date(uploadedAtIso);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="border-b border-border/50 px-6 py-3 flex items-center justify-between backdrop-blur-sm sticky top-0 z-20 bg-background/80">
        <Link to="/" className="flex items-center">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            <span className="text-primary">Note</span>
            <span className="text-foreground">Mind</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/chat">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <MessageSquare className="h-4 w-4 mr-1.5" /> Chat
            </Button>
          </Link>
          <Link to="/flashcards">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Zap className="h-4 w-4 mr-1.5" /> Flashcards
            </Button>
          </Link>
          <Link to="/compare">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Compare
            </Button>
          </Link>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/80 border-0">
            <Plus className="h-4 w-4 mr-1.5" /> New Upload
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Upload and manage your study documents</p>
        </div>

        <DocUploader />

        <div>
          <h2 className="font-serif text-xl text-foreground mb-4">Your Documents</h2>
          {documents.length === 0 && (
            <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
              No uploaded documents yet. Upload a PDF or TXT file above.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 auto-rows-min">
            {documents.map((doc, i) => (
              <div
                key={doc.id}
                className={`animate-fade-up glass glass-hover rounded-2xl p-5 space-y-4 ${bentoSizes[i] || ""}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/15">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatUploadDate(doc.uploadedAtIso)}{typeof doc.numChunks === "number" ? ` · ${doc.numChunks} chunks` : ""}</p>
                  </div>
                </div>

                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-primary border-primary/30 bg-primary/10">
                  Uploaded
                </span>

                <div className="flex gap-2 pt-1">
                  <Link to="/chat" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg glass border-border/50">
                      <MessageSquare className="h-3.5 w-3.5" /> Chat
                    </Button>
                  </Link>
                  <Link to="/flashcards">
                    <Button variant="outline" size="sm" className="rounded-lg glass border-border/50">
                      <Zap className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="rounded-lg glass border-border/50 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
