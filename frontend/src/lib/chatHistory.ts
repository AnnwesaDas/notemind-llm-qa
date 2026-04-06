interface ChatHistoryItem {
  id: string;
  question: string;
  document: string;
  timestamp: number;
}

const STORAGE_KEY = "notemind_chat_history";
const MAX_HISTORY = 50;

export const getChatHistory = (): ChatHistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (question: string, document: string) => {
  const history = getChatHistory();
  const newItem: ChatHistoryItem = {
    id: Date.now().toString(),
    question,
    document,
    timestamp: Date.now(),
  };
  
  const updated = [newItem, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const deleteHistoryItem = (id: string) => {
  const history = getChatHistory();
  const updated = history.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};