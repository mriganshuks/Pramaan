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

const foundationsQuestions: BankQuestion[] = [
  { prompt: "What is the primary purpose of a unit test?", topic: "testing", options: [{ id: "A", text: "To test a small behavior in isolation" }, { id: "B", text: "To replace code review" }, { id: "C", text: "To deploy an application" }, { id: "D", text: "To encrypt a database" }], correctOption: "A", explanation: "Unit tests verify small units of behavior in isolation." },
  { prompt: "Which data structure generally provides average O(1) key lookup?", topic: "data structures", options: [{ id: "A", text: "Array scan" }, { id: "B", text: "Hash map" }, { id: "C", text: "Linked-list traversal" }, { id: "D", text: "Bubble sort" }], correctOption: "B", explanation: "Hash maps have average constant-time lookup." },
  { prompt: "What does an HTTP 404 response indicate?", topic: "web", options: [{ id: "A", text: "A request succeeded" }, { id: "B", text: "Authentication is required" }, { id: "C", text: "The requested resource was not found" }, { id: "D", text: "The server executed too slowly" }], correctOption: "C", explanation: "404 means the requested resource could not be found." },
  { prompt: "Why should secrets be stored in environment variables rather than browser code?", topic: "security", options: [{ id: "A", text: "They become public in browser code" }, { id: "B", text: "It improves CSS rendering" }, { id: "C", text: "It makes databases faster" }, { id: "D", text: "It removes the need for validation" }], correctOption: "A", explanation: "Browser-delivered code can be inspected by anyone." },
  { prompt: "What is the main purpose of an index in a database?", topic: "databases", options: [{ id: "A", text: "To format HTML" }, { id: "B", text: "To speed up selected queries" }, { id: "C", text: "To replace data validation" }, { id: "D", text: "To encrypt every record" }], correctOption: "B", explanation: "Indexes improve lookup performance for suitable queries." },
  { prompt: "What is a race condition?", topic: "concurrency", options: [{ id: "A", text: "A UI animation" }, { id: "B", text: "A bug caused by unsynchronised operation ordering" }, { id: "C", text: "A syntax error" }, { id: "D", text: "A database backup" }], correctOption: "B", explanation: "Race conditions arise when outcomes depend on timing of concurrent work." },
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
  const bank = normalized === "javascript" || normalized === "js" ? javascriptQuestions : foundationsQuestions;
  const unseen = bank.filter((question) => !previousFingerprints.includes(questionFingerprint(question)));
  const selected = shuffle(unseen.length >= count ? unseen : bank).slice(0, Math.min(count, bank.length));
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
