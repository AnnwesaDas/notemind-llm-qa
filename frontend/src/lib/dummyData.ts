export interface Document {
  id: string;
  name: string;
  courseTag: string;
  courseColor: "blue" | "green" | "amber" | "rose";
  uploadDate: string;
  wordCount: number;
}

export const documents: Document[] = [
  { id: "1", name: "CS101_Lecture3.pdf", courseTag: "CS101", courseColor: "blue", uploadDate: "Mar 15, 2024", wordCount: 4280 },
  { id: "2", name: "BIO_Week4.pdf", courseTag: "BIO201", courseColor: "green", uploadDate: "Mar 12, 2024", wordCount: 3150 },
  { id: "3", name: "HIST_Essay.pdf", courseTag: "HIST110", courseColor: "amber", uploadDate: "Mar 10, 2024", wordCount: 5920 },
  { id: "4", name: "MATH_Notes.pdf", courseTag: "MATH301", courseColor: "rose", uploadDate: "Mar 8, 2024", wordCount: 2640 },
];

export const courseColorMap: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rose: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  citations?: { file: string; chunk: number }[];
}

export const dummyChatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "What are the key differences between binary trees and BSTs?",
  },
  {
    id: "2",
    role: "ai",
    content:
      "A binary tree is a tree data structure where each node has at most two children. A Binary Search Tree (BST) is a special type of binary tree where the left child contains values less than the parent, and the right child contains values greater than the parent. This ordering property makes BSTs efficient for searching, insertion, and deletion operations with O(log n) average time complexity.",
    citations: [
      { file: "CS101_Lecture3", chunk: 4 },
      { file: "CS101_Lecture3", chunk: 7 },
    ],
  },
  {
    id: "3",
    role: "user",
    content: "How does virtual memory work in operating systems?",
  },
  {
    id: "4",
    role: "ai",
    content:
      "Virtual memory creates an illusion of a very large main memory by using both hardware and software to map virtual addresses to physical addresses. The OS uses page tables to track where virtual pages are stored in physical memory. When a program accesses a page not in physical memory, a page fault occurs and the OS loads the required page from disk into RAM.",
    citations: [
      { file: "CS101_Lecture3", chunk: 12 },
      { file: "MATH_Notes", chunk: 3 },
    ],
  },
];

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export const dummyFlashcards: Flashcard[] = [
  { id: "1", question: "What is the time complexity of binary search?", answer: "O(log n) — it halves the search space with each comparison." },
  { id: "2", question: "Define osmosis in biology.", answer: "The movement of water molecules through a semipermeable membrane from a region of lower solute concentration to higher solute concentration." },
  { id: "3", question: "What caused the fall of the Roman Empire?", answer: "A combination of internal decay (political instability, economic troubles) and external pressures (barbarian invasions), culminating in 476 AD." },
  { id: "4", question: "What is the derivative of sin(x)?", answer: "cos(x)" },
  { id: "5", question: "Explain the concept of a page fault.", answer: "A page fault occurs when a program accesses a memory page not currently in physical RAM, triggering the OS to load it from disk." },
  { id: "6", question: "What is Big-O notation?", answer: "A mathematical notation describing the upper bound of an algorithm's time or space complexity as input size grows." },
  { id: "7", question: "What is mitosis?", answer: "A type of cell division resulting in two daughter cells with the same number of chromosomes as the parent cell." },
  { id: "8", question: "Define the Magna Carta.", answer: "A 1215 charter of rights agreed to by King John of England, establishing that everyone, including the king, was subject to the law." },
  { id: "9", question: "What is the quadratic formula?", answer: "x = (-b ± √(b² - 4ac)) / 2a — used to solve quadratic equations ax² + bx + c = 0." },
  { id: "10", question: "What is a hash table?", answer: "A data structure that maps keys to values using a hash function, providing O(1) average time for lookups, insertions, and deletions." },
  { id: "11", question: "What is photosynthesis?", answer: "The process by which plants convert light energy, CO₂, and water into glucose and oxygen." },
  { id: "12", question: "What was the Renaissance?", answer: "A cultural movement from the 14th to 17th century emphasizing classical learning, art, science, and humanism, originating in Italy." },
  { id: "13", question: "What is a linked list?", answer: "A linear data structure where elements are stored in nodes, each pointing to the next, allowing efficient insertions and deletions." },
  { id: "14", question: "What is the chain rule in calculus?", answer: "If y = f(g(x)), then dy/dx = f'(g(x)) · g'(x). It's used to differentiate composite functions." },
  { id: "15", question: "What is natural selection?", answer: "The process where organisms with favorable traits are more likely to survive and reproduce, driving evolution over time." },
];
