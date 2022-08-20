import { Database } from "bun:sqlite";
import { unlinkSync, existsSync } from "fs";

const start = performance.now();

if (existsSync("ImageLinks.db")) {
  unlinkSync("ImageLinks.db");
}
if (existsSync("ImageLinks.db-journal")) {
  unlinkSync("ImageLinks.db-journal");
}

const stream = Bun.file("ImageLinks.txt").stream();
const db = new Database("ImageLinks.db", { create: true, readwrite: true });

db.exec(`CREATE TABLE IF NOT EXISTS prompts(id INT PRIMARY KEY, prompt TEXT)`);
db.exec(
  `CREATE TABLE data(id INT PRIMARY KEY, promptid INT, url TEXT, timestamp INT, height INT, width INT, cfgscale FLOAT, num INT, grid TINYINT, steps INT, seed INT)`
);

const insertPrompt = db.prepare(
  "INSERT INTO prompts (id, prompt) VALUES (?, ?)"
);
const insertData = db.prepare(
  "INSERT INTO data (id, promptid, url, height, width, cfgscale, num, grid, steps, seed, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

const decoder = new TextDecoder();

const reader = stream.getReader();
let carry = "";

let promptId = -1;
let dataId = 0;

let num = 0;
let lastCheckPointAt = performance.now();

const transation = db.transaction((current) => {
  for (const line of current) {
    // Checkpoint
    num++;
    if (num % 100000 === 0) {
      const now = performance.now();
      console.log(
        "100000 lines took " +
          (now - lastCheckPointAt).toFixed(1) +
          "ms" +
          " at #" +
          num
      );
      lastCheckPointAt = now;
    }

    if (line.startsWith("!")) {
      promptId++;
      if (promptId > 0) {
        const prompt = line.slice(1).replace(/  +/g, " ").trim();
        insertPrompt.run(promptId, prompt);
      }
    } else {
      if (promptId > 0) {
        dataId++;

        insertData.run(
          dataId,
          promptId,
          line,
          Number(line.match(/(?:-H_)(\d+)/)?.[1] ?? 512),
          Number(line.match(/(?:-W_)(\d+)/)?.[1] ?? 512),
          Number(line.match(/(?:-C_)([\d\.]+)/)?.[1] ?? 7),
          Number(line.match(/(?:-n_)(\d+)/)?.[1] ?? 1),
          line.includes("-g") ? 1 : 0,
          Number(line.match(/(?:-s_)(\d+)/)?.[1] ?? 50),
          Number(line.match(/(?:-S_)(\d+)/)?.[1] ?? 0),
          Number(line.match(/(?:ts-)(\d+)/)?.[1] ?? -1)
        );
      }
    }
  }
});

let data = await reader.read();
do {
  const current = (carry + decoder.decode(data.value))
    .replace(/\r/g, "")
    .split("\n");
  carry = current.pop()!;

  transation(current);
} while (data.done === false);

if (carry.length > 0) {
  transation([carry]);
}

db.exec(`CREATE INDEX IF NOT EXISTS data_promptid_idx ON data(promptid)`);

const end = performance.now();

console.log(
  "Entire operation took " + ((end - start) / 1000).toFixed(2) + " seconds"
);
