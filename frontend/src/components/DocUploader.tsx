import { Upload, FileUp } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const DocUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (loading) return;

    const allowedTypes = [".pdf", ".txt"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or TXT file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File must be under 50MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      toast({
        title: "Success",
        description: `${data.filename} uploaded successfully`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        className="hidden"
      />
      <div
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/5 glow-violet"
            : "border-border/50 glass"
        } ${loading ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
            {isDragging ? (
              <FileUp className="h-6 w-6 text-primary animate-bounce" />
            ) : (
              <Upload className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {loading ? "Uploading..." : "Drop your first note"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, TXT — up to 50MB
            </p>
          </div>
          <button
            onClick={handleBrowseClick}
            disabled={loading}
            className="mt-2 text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            or browse files
          </button>
        </div>
      </div>
    </>
  );
};

export default DocUploader;
