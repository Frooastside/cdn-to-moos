import { fetchProfile } from "./api";
import { v1 } from "moos-api";
import readline from "readline";
import { promisify } from "util";

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = async (question: string): Promise<string> => {
  return new Promise((resolve, _reject) => {
    input.question(question, resolve);
  });
};

async function start() {
  const path = await question("Path: ");
  try {
    console.log(await fetchProfile());
  } catch (error) {
    console.error(error);
  }
}

start();
