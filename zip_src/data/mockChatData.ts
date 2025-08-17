
import { ChatMessage } from "../components/chat/types";

const now = Date.now();
const minute = 60 * 1000;
const hour = 60 * minute;

export const mockChatData: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Analyze this code snippet and explain what it does: `const result = array.reduce((acc, val) => acc + val, 0);`",
    createdAt: now - 2 * hour,
  },
  {
    id: "2",
    role: "agent",
    content: "This code is using the `reduce` method to sum all elements in an array. Let me break it down for you:",
    reasoning: [
      "The code uses JavaScript's Array.reduce() method",
      "reduce() iterates through each element in the array",
      "It maintains an accumulator which starts with value 0",
      "For each element, it adds the element's value to the accumulator",
      "The final result is the sum of all elements in the array"
    ],
    createdAt: now - 2 * hour + 1 * minute,
  },
  {
    id: "3",
    role: "user",
    content: "Can you find the performance of this algorithm? How does it compare to using a for loop?",
    createdAt: now - 1 * hour,
  },
  {
    id: "4",
    role: "agent",
    content: "Let me analyze the time complexity and compare it with a for loop approach.",
    thinking: true,
    createdAt: now - 1 * hour + 20 * 1000,
    toolCall: {
      id: "tool-1",
      name: "analyze_performance",
      arguments: JSON.stringify({
        algorithm: "array.reduce",
        compareWith: "for-loop"
      }, null, 2)
    },
    toolResult: {
      content: "Analysis complete.\nTime complexity: O(n) for both approaches\nSpace complexity: O(1) for both approaches\nBenchmark results: reduce() is approximately 2-5% slower than for-loop in most JavaScript engines."
    },
    reasoning: [
      "Both reduce() and for loop have O(n) time complexity as they iterate through all n elements exactly once",
      "Both approaches use constant O(1) extra space",
      "The reduce() method has slightly more overhead due to callback function calls",
      "For small arrays (<1000 elements), performance difference is negligible",
      "For large arrays, a traditional for loop might be 2-5% faster in most JS engines",
      "Modern JS engines optimize both approaches well"
    ],
  },
  {
    id: "5",
    role: "user",
    content: "Can you rewrite this using a traditional for loop then?",
    createdAt: now - 30 * minute,
  },
  {
    id: "6",
    role: "agent",
    content: "Here's the same functionality implemented with a traditional for loop:\n\n```javascript\nlet result = 0;\nfor (let i = 0; i < array.length; i++) {\n  result += array[i];\n}\n```\n\nThis code initializes `result` to 0, then iterates through the array using a for loop with an index counter. For each element, it adds the element's value to the running total in `result`.",
    createdAt: now - 28 * minute,
  },
  {
    id: "7",
    role: "user",
    content: "Great, thank you! Can you also show me the forEach implementation?",
    createdAt: now - 5 * minute,
  },
  {
    id: "8",
    role: "agent",
    content: "Here's the same summing functionality implemented with the forEach method:\n\n```javascript\nlet result = 0;\narray.forEach(item => {\n  result += item;\n});\n```\n\nThis approach also works well and has similar performance characteristics to both the reduce and for loop implementations. It's more concise than a traditional for loop while being slightly more explicit about its purpose than reduce for simple operations like this.",
    reasoning: [
      "forEach is a higher-order function like reduce",
      "It has the same O(n) time complexity",
      "We need a variable outside the loop to accumulate the sum",
      "Performance is comparable to the for loop, but with cleaner syntax",
      "forEach might be slightly slower than a traditional for loop, but more readable for many developers"
    ],
    createdAt: now - 4 * minute,
  },
  {
    id: "9",
    role: "user",
    content: "Which implementation would you recommend for production code?",
    createdAt: now - 2 * minute,
  },
  {
    id: "10",
    role: "agent",
    content: "For summing an array in production code, I'd recommend the **reduce** approach for most scenarios:\n\n```javascript\nconst sum = array.reduce((acc, val) => acc + val, 0);\n```\n\nHere's why:\n\n1. It's idiomatic JavaScript and clearly communicates intent\n2. It's concise and reduces chance of errors\n3. Performance differences are negligible for most array sizes\n4. It's more declarative, focusing on what you want rather than how to do it\n\nHowever, if you're working with extremely large arrays (millions of elements) and performance is critical, the traditional for loop might give you a small edge.",
    toolCall: {
      id: "tool-2",
      name: "benchmark_array_methods",
      arguments: JSON.stringify({
        methods: ["reduce", "for-loop", "forEach"],
        arraySize: 1000000,
        iterations: 100
      }, null, 2)
    },
    toolResult: {
      content: "Benchmark results (ms):\nfor-loop: 8.2\nreduce: 9.1\nforEach: 8.9\n\nfor-loop is approximately 10% faster than reduce for 1M elements"
    },
    reasoning: [
      "reduce is the most idiomatic and semantically clear approach in modern JavaScript",
      "The performance difference is negligible for most real-world applications",
      "reduce makes the intent (summing) very clear compared to for loops",
      "reduce eliminates potential errors like improper initialization or loop boundary mistakes",
      "The choice ultimately depends on the specific context and performance requirements",
      "For extremely performance-critical applications with large arrays, a for loop might be better"
    ],
    createdAt: now - 1 * minute,
  },
];

export default mockChatData;
