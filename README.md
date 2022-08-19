# SQLite DB of all Stable Diffusion generated images

Not too long ago, someone in the Stable Diffusion Discord server shared a text file of every prompt and a list of links of the generated images. This repository contains code to convert that file to a SQLite database. I am hosting a copy of the database ready for use [here]() (2.9gb)

Structure of the database is two tables:

- `prompts`, with a primary key `id` and a string `prompt`
- `data` which has a `promptId` and a `url`, among extra metadata columns

The converter is written using Node.js and better-sqlite3, and took 162 seconds to convert on my desktop.

There is also an implementation with Bun, but it doesn't work for me due to a bug. Were it to work, it would run over 3x faster than the node implementation.

To run, you need an extracted copy of [ImageLinks.zip](https://drive.google.com/file/d/14_CRrWMw20OSSd5ZA-7epXdWF3DlwM8g/view) (2.5gb). Then you can run `bun convert.ts` or `node convert.mjs`.
