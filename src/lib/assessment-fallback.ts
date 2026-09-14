import { createHash, randomUUID } from "node:crypto";
import type { AssessmentQuestion, CodingProblem, Difficulty, OptionId } from "@/lib/assessment-types";

type BankQuestion = Omit<AssessmentQuestion, "id" | "fingerprint">;

const javascriptQuestions: BankQuestion[] = [
  { prompt: "Which declaration creates a block-scoped variable that can be reassigned?", topic: "scope", options: [{ id: "A", text: "var" }, { id: "B", text: "let" }, { id: "C", text: "const" }, { id: "D", text: "static" }], correctOption: "B", explanation: "let is block scoped and can be reassigned." },
  { prompt: "What does Array.prototype.map return?", topic: "arrays", options: [{ id: "A", text: "The original array after mutation" }, { id: "B", text: "A boolean" }, { id: "C", text: "A new array of transformed values" }, { id: "D", text: "The first matching value" }], correctOption: "C", explanation: "map creates a new array from each callback result." },
  { prompt: "Which value represents an intentional empty object value in JavaScript?", topic: "values", options: [{ id: "A", text: "undefined" }, { id: "B", text: "null" }, { id: "C", text: "NaN" }, { id: "D", text: "false" }], correctOption: "B", explanation: "null is an intentional absence of an object value." },
  { prompt: "What does a Promise represent?", topic: "asynchrony", options: [{ id: "A", text: "An eventual asynchronous result" }, { id: "B", text: "A CSS selector" }, { id: "C", text: "A synchronous loop" }, { id: "D", text: "A type annotation" }], correctOption: "A", explanation: "A Promise represents a value that may be available later." },
  { prompt: "Which equality operator compares both value and type?", topic: "operators", options: [{ id: "A", text: "=" }, { id: "B", text: "==" }, { id: "C", text: "===" }, { id: "D", text: "=>" }], correctOption: "C", explanation: "Strict equality (===) does not coerce types." },
  { prompt: "Which method appends an item to the end of an array?", topic: "arrays", options: [{ id: "A", text: "shift" }, { id: "B", text: "push" }, { id: "C", text: "slice" }, { id: "D", text: "unshift" }], correctOption: "B", explanation: "push appends items to an array." },
  { prompt: "What is a closure?", topic: "functions", options: [{ id: "A", text: "A function retaining access to its lexical scope" }, { id: "B", text: "A closed TCP port" }, { id: "C", text: "A loop terminator" }, { id: "D", text: "A CSS reset" }], correctOption: "A", explanation: "Closures retain access to surrounding lexical variables." },
  { prompt: "Which method converts JSON text to a JavaScript value?", topic: "json", options: [{ id: "A", text: "JSON.stringify" }, { id: "B", text: "JSON.decode" }, { id: "C", text: "JSON.parse" }, { id: "D", text: "JSON.value" }], correctOption: "C", explanation: "JSON.parse reads JSON text into a JavaScript value." },
];

const typescriptQuestions: BankQuestion[] = [
  { prompt: "What is the key difference between 'type' and 'interface' in TypeScript?", topic: "types", options: [{ id: "A", text: "Interfaces can be merged with subsequent declarations; types cannot" }, { id: "B", text: "Types only work for primitives" }, { id: "C", text: "Interfaces cannot extend other interfaces" }, { id: "D", text: "Types are converted to runtime objects" }], correctOption: "A", explanation: "TypeScript interface declaration merging allows multiple interface blocks with the same name to combine." },
  { prompt: "What does the 'unknown' type represent in TypeScript?", topic: "types", options: [{ id: "A", text: "A type-safe counterpart of 'any' requiring narrowing before operations" }, { id: "B", text: "A value that never returns" }, { id: "C", text: "An undefined variable" }, { id: "D", text: "A strictly private class member" }], correctOption: "A", explanation: "unknown requires type checking or type assertion before operations can be safely performed." },
  { prompt: "Which operator asserts that an expression is not null or undefined?", topic: "operators", options: [{ id: "A", text: "Non-null assertion operator (!)" }, { id: "B", text: "Nullish coalescing (??)" }, { id: "C", text: "Optional chaining (?.)" }, { id: "D", text: "Bitwise NOT (~)" }], correctOption: "A", explanation: "The postfix exclamation mark tells TypeScript the value is guaranteed not to be null or undefined." },
  { prompt: "What is the return type of a function marked 'never'?", topic: "functions", options: [{ id: "A", text: "A function that either throws an error or never returns" }, { id: "B", text: "A function returning void" }, { id: "C", text: "A function returning undefined" }, { id: "D", text: "An asynchronous promise" }], correctOption: "A", explanation: "never represents values that never occur, such as functions with infinite loops or unconditional throws." },
  { prompt: "Which utility type constructs a type with all properties of T set to optional?", topic: "utility-types", options: [{ id: "A", text: "Partial<T>" }, { id: "B", text: "Required<T>" }, { id: "C", text: "Pick<T, K>" }, { id: "D", text: "Readonly<T>" }], correctOption: "A", explanation: "Partial<T> transforms all properties of T into optional fields." },
  { prompt: "What does 'Record<K, T>' construct in TypeScript?", topic: "utility-types", options: [{ id: "A", text: "An object type with keys of type K and values of type T" }, { id: "B", text: "An immutable array of T" }, { id: "C", text: "A database transaction" }, { id: "D", text: "A tuple of length K" }], correctOption: "A", explanation: "Record<K, T> maps property keys of type K to values of type T." },
];

const pythonQuestions: BankQuestion[] = [
  { prompt: "What is the difference between a list and a tuple in Python?", topic: "data-structures", options: [{ id: "A", text: "Lists are mutable; tuples are immutable" }, { id: "B", text: "Tuples can only store integers" }, { id: "C", text: "Lists cannot be indexed" }, { id: "D", text: "Tuples are dynamically resized" }], correctOption: "A", explanation: "Lists can be modified in place, whereas tuples cannot be altered after creation." },
  { prompt: "How does Python handle memory management?", topic: "runtime", options: [{ id: "A", text: "Reference counting combined with a generational garbage collector" }, { id: "B", text: "Manual allocation using malloc and free" }, { id: "C", text: "Mark and sweep without reference counts" }, { id: "D", text: "Static compile-time memory reservation" }], correctOption: "A", explanation: "Python tracks reference counts and uses cyclic GC for self-referencing collections." },
  { prompt: "What is the purpose of the 'yield' keyword in Python?", topic: "generators", options: [{ id: "A", text: "It turns a function into a generator that produces values lazily" }, { id: "B", text: "It immediately terminates the program" }, { id: "C", text: "It declares a static variable" }, { id: "D", text: "It pauses thread execution" }], correctOption: "A", explanation: "yield produces a value and suspends the generator function state until next iteration." },
  { prompt: "Which method is called when an instance is created in Python?", topic: "oop", options: [{ id: "A", text: "__init__" }, { id: "B", text: "__construct__" }, { id: "C", text: "__new_instance__" }, { id: "D", text: "__start__" }], correctOption: "A", explanation: "__init__ is the initializer method for new object instances." },
  { prompt: "What is a Python decorator?", topic: "functions", options: [{ id: "A", text: "A function that takes another function and extends its behavior without modifying it" }, { id: "B", text: "A CSS style for Jupyter notebooks" }, { id: "C", text: "A design pattern for database schemas" }, { id: "D", text: "A type annotation keyword" }], correctOption: "A", explanation: "Decorators wrap callable objects to modify or enhance their behavior dynamically." },
  { prompt: "What does the GIL (Global Interpreter Lock) in CPython do?", topic: "concurrency", options: [{ id: "A", text: "Prevents multiple native threads from executing Python bytecodes at once" }, { id: "B", text: "Encrypts bytecode on disk" }, { id: "C", text: "Locks files during read operations" }, { id: "D", text: "Ensures network sockets are thread-safe" }], correctOption: "A", explanation: "CPython's GIL ensures only one thread executes Python bytecode at any given moment." },
];

const reactQuestions: BankQuestion[] = [
  { prompt: "What is the primary rule of React Hooks?", topic: "hooks", options: [{ id: "A", text: "Only call hooks at the top level of React function components" }, { id: "B", text: "Hooks must be called inside standard loops" }, { id: "C", text: "Hooks only run in class components" }, { id: "D", text: "Hooks cannot access state" }], correctOption: "A", explanation: "Hooks must be called unconditionally at the top level to preserve consistent hook order." },
  { prompt: "Why is the 'key' prop necessary when rendering arrays in React?", topic: "reconciliation", options: [{ id: "A", text: "It helps React identify which items have changed, added, or removed" }, { id: "B", text: "It is required by CSS stylesheets" }, { id: "C", text: "It encrypts element data in the DOM" }, { id: "D", text: "It sets the database primary key" }], correctOption: "A", explanation: "Keys give stable identity to list items across renders for efficient diffing." },
  { prompt: "What does useEffect return if a cleanup function is provided?", topic: "lifecycle", options: [{ id: "A", text: "A function that runs before the component unmounts or re-executes the effect" }, { id: "B", text: "A promise resolving to DOM elements" }, { id: "C", text: "A boolean indicating render success" }, { id: "D", text: "The previous props" }], correctOption: "A", explanation: "The returned cleanup function cancels subscriptions, timers, or event handlers." },
  { prompt: "What is the purpose of React Server Components (RSC)?", topic: "architecture", options: [{ id: "A", text: "To render components on the server without sending their JS bundle to the client" }, { id: "B", text: "To run WebGL animations" }, { id: "C", text: "To replace all client-side state hooks" }, { id: "D", text: "To compile TypeScript to WebAssembly" }], correctOption: "A", explanation: "RSCs execute solely on the server, minimizing client JavaScript bundle size." },
  { prompt: "What does useCallback optimize in React?", topic: "performance", options: [{ id: "A", text: "Memoizes a callback function instance between renders" }, { id: "B", text: "Caches network HTTP responses" }, { id: "C", text: "Prevents CSS re-layouts" }, { id: "D", text: "Compiles JSX to bytecode" }], correctOption: "A", explanation: "useCallback returns a memoized version of the callback that only changes when dependencies change." },
];

const databaseQuestions: BankQuestion[] = [
  { prompt: "What is the ACID principle in transactional databases?", topic: "transactions", options: [{ id: "A", text: "Atomicity, Consistency, Isolation, Durability" }, { id: "B", text: "Asynchronous, Concurrent, Indexed, Distributed" }, { id: "C", text: "Authentication, Cryptography, Integrity, Decryption" }, { id: "D", text: "Application, Cluster, Interface, Driver" }], correctOption: "A", explanation: "ACID guarantees that database transactions are processed reliably." },
  { prompt: "What is the main advantage of a B-Tree index in relational databases?", topic: "indexes", options: [{ id: "A", text: "Efficient search, sequential access, insertions, and deletions in O(log n)" }, { id: "B", text: "Eliminating the need for foreign keys" }, { id: "C", text: "Compressing images stored in tables" }, { id: "D", text: "Automatic database sharding" }], correctOption: "A", explanation: "B-Trees keep data sorted and allow search, sequential access, and updates in logarithmic time." },
  { prompt: "What is the purpose of database normalization?", topic: "modeling", options: [{ id: "A", text: "To minimize data redundancy and prevent update anomalies" }, { id: "B", text: "To increase data duplication for speed" }, { id: "C", text: "To eliminate all secondary indexes" }, { id: "D", text: "To convert SQL queries to NoSQL" }], correctOption: "A", explanation: "Normalization organizes fields and table relationships to reduce redundant data." },
  { prompt: "In MongoDB, what does an index on a compound key { a: 1, b: 1 } support?", topic: "indexes", options: [{ id: "A", text: "Queries on 'a', and queries on both 'a' and 'b'" }, { id: "B", text: "Queries exclusively on 'b' only" }, { id: "C", text: "Only queries with no filters" }, { id: "D", text: "Full-text search queries only" }], correctOption: "A", explanation: "Compound indexes can serve queries matching any prefix of the indexed fields." },
];

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function shuffledOptions(question: BankQuestion) {
  const correctText = question.options.find((option) => option.id === question.correctOption)?.text;
  const ids: OptionId[] = ["A", "B", "C", "D"];
  const options = shuffle(question.options).map((option, index) => ({ id: ids[index], text: option.text }));
  return { options, correctOption: options.find((option) => option.text === correctText)?.id ?? "A" };
}

export function questionFingerprint(question: Pick<AssessmentQuestion, "prompt" | "options">) {
  return createHash("sha256").update(`${question.prompt}|${question.options.map((option) => option.text).sort().join("|")}`).digest("hex");
}

export function fallbackQuestionSet(skill: string, count: number, _difficulty: Difficulty, previousFingerprints: string[] = []) {
  const normalized = skill.trim().toLowerCase();
  let bank = javascriptQuestions;

  if (normalized.includes("typescript") || normalized === "ts") {
    bank = typescriptQuestions;
  } else if (normalized.includes("python") || normalized === "py") {
    bank = pythonQuestions;
  } else if (normalized.includes("react") || normalized.includes("next") || normalized.includes("frontend")) {
    bank = reactQuestions;
  } else if (normalized.includes("sql") || normalized.includes("data") || normalized.includes("mongo") || normalized.includes("postgres")) {
    bank = databaseQuestions;
  } else if (normalized.includes("javascript") || normalized === "js") {
    bank = javascriptQuestions;
  } else {
    bank = [...typescriptQuestions, ...javascriptQuestions, ...pythonQuestions, ...databaseQuestions];
  }

  const unseen = bank.filter((question) => !previousFingerprints.includes(questionFingerprint(question)));
  const pool = unseen.length >= count ? unseen : bank;
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length));

  return selected.map((question) => {
    const variant = shuffledOptions(question);
    const publicQuestion = { prompt: question.prompt, options: variant.options };
    return { ...question, ...variant, id: randomUUID(), fingerprint: questionFingerprint(publicQuestion) };
  });
}

export const fallbackCodingProblem: CodingProblem = {
  id: "first-repeat-js-v1",
  title: "First repeated value",
  statement: "Write a JavaScript function named firstRepeated that receives an array of integers and returns the first value that appears twice while scanning left to right. Return null when every value is unique.",
  constraints: ["Return a value; do not print it.", "The input array can contain negative integers.", "Use JavaScript only."],
  examples: [{ input: "[2, 1, 3, 2]", output: "2" }, { input: "[1, 2, 3]", output: "null" }],
  starterCode: "function firstRepeated(values) {\n  // Your solution\n}\n\nmodule.exports = { firstRepeated };\n",
  language: "javascript",
  hiddenTests: [{ input: [5, 8, 5, 8], expected: 5 }, { input: [-1, 0, 2, -1], expected: -1 }, { input: [1, 2, 3, 4], expected: null }],
};
