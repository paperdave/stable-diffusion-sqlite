import { unlinkSync, existsSync, openSync, readSync } from "fs";

const Database = process.isBun
  ? (await import("bun:sqlite")).Database
  : (await import("better-sqlite3")).default;

const start = performance.now();

if (existsSync("ImageLinks.db")) {
  unlinkSync("ImageLinks.db");
}
if (existsSync("ImageLinks.db-journal")) {
  unlinkSync("ImageLinks.db-journal");
}

// Bun has stream issues
const db = new Database("ImageLinks.db", {
  create: true,
  readwrite: true,
});

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

let promptId = -1;
let dataId = 0;

let num = 0;
let lastCheckPointAt = performance.now();

const transation = db.transaction(() => {
  function doLine(line) {
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

  const decoder = new TextDecoder();

  let carry = "";

  const fd = openSync("ImageLinksFinal.txt");
  const buffer = new Uint8Array(128 * 1024); // 1MB

  while (true) {
    const bytes = readSync(fd, buffer, 0, buffer.length, null);
    if (bytes === 0) {
      break;
    }
    const lines = (carry + decoder.decode(buffer.subarray(0, bytes))).split(
      "\n"
    );
    carry = lines.pop();

    for (const line of lines) {
      doLine(line);
    }
  }

  if (carry.length > 0) {
    doLine(carry);
  }
});

transation();

db.exec(`CREATE INDEX IF NOT EXISTS data_promptid_idx ON data(promptid)`);

const end = performance.now();

console.log(
  "Entire operation took " + ((end - start) / 1000).toFixed(2) + " seconds"
);
