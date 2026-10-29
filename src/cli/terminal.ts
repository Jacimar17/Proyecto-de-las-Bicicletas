import * as readline from "node:readline";

const prompt = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    prompt.question(question, (answer) => resolve(answer.trim()));
  });
}

export function closePrompt(): void {
  prompt.close();
}
