export interface UploadedDoc {
  id: string;
  filename: string;
  uploadedAtIso: string;
  numChunks?: number;
}

interface BackendUploadedDoc {
  filename: string;
  uploaded_at_iso: string;
  num_chunks?: number;
}

const STORAGE_KEY = "notemind.uploadedDocs";
const UPDATED_EVENT = "notemind-uploaded-docs-updated";
const API_BASE_URL = "http://127.0.0.1:8000";

let hydrationInFlight: Promise<void> | null = null;

function readStorage(): UploadedDoc[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as UploadedDoc[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function writeStorage(docs: UploadedDoc[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

export function getUploadedDocs(): UploadedDoc[] {
  return readStorage();
}

export function addUploadedDoc(filename: string, numChunks?: number) {
  const docs = readStorage();
  const nextDoc: UploadedDoc = {
    id: filename,
    filename,
    uploadedAtIso: new Date().toISOString(),
    numChunks,
  };

  const withoutExisting = docs.filter((doc) => doc.id !== nextDoc.id);
  const next = [nextDoc, ...withoutExisting];
  writeStorage(next);
}

export function subscribeUploadedDocs(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = () => onChange();
  window.addEventListener(UPDATED_EVENT, listener);

  return () => {
    window.removeEventListener(UPDATED_EVENT, listener);
  };
}

export async function hydrateUploadedDocsFromBackend(): Promise<void> {
  if (hydrationInFlight) {
    return hydrationInFlight;
  }

  hydrationInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const docs = Array.isArray(data?.documents)
        ? (data.documents as BackendUploadedDoc[])
        : [];

      const next = docs.map((backendDoc) => ({
        id: backendDoc.filename,
        filename: backendDoc.filename,
        uploadedAtIso: backendDoc.uploaded_at_iso || new Date().toISOString(),
        numChunks: typeof backendDoc.num_chunks === "number" ? backendDoc.num_chunks : undefined,
      }));

      const sorted = next.sort((left, right) =>
        right.uploadedAtIso.localeCompare(left.uploadedAtIso)
      );

      writeStorage(sorted);
    } catch {
      return;
    }
  })();

  try {
    await hydrationInFlight;
  } finally {
    hydrationInFlight = null;
  }
}
