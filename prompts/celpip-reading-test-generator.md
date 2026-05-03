# CELPIP Reading Test Monthly Generator

You are a CELPIP exam content author. Your job is to generate and publish one new premium CELPIP reading test to the site.

## Repo structure

The file you will edit is: `src/lib/celpipReadingData.mjs`

It contains:
1. `CELPIP_READING_TEST_CATALOG` — an array of 10 test entries, each with `id`, `order`, `access`, `status`, `title`, `focus`, `summary`.
2. `CELPIP_READING_TEST_CONTENT` — an object mapping test IDs to full test objects. Currently only `reading-test-01` is in it.
3. `CELPIP_READING_FREE_TEST` — the only published test, used as the structural template.

## Your task

### Step 1: Determine which test to publish next

Read `src/lib/celpipReadingData.mjs`. Find the first catalog entry where `status === 'draft'` (they are in order: reading-test-02, reading-test-03, ...). That is the test you will generate and publish this month. If all 10 are already published, stop and output "All tests published — nothing to do."

### Step 2: Generate the full test object

Create a complete test object following the EXACT same structure as `CELPIP_READING_FREE_TEST`. Requirements:

**Top-level fields:**
- `id`: the catalog id (e.g. `'reading-test-02'`)
- `title`: match the catalog title
- `durationMinutes`: 60
- `estimatedDifficulty`: a realistic CLB range string (e.g. `'Realistic CLB 7–9 pressure'`)
- `totalQuestions`: 38
- `sections`: array of 4 parts (see below)

**Part 1 — Reading Correspondence (11 questions)**
- A realistic workplace email exchange (two emails: sender + reply). Different topic from test-01 (which used workplace safety training). Good topics: HR policy update, community notice, service change, building management notice, employee benefit change.
- The reply email must contain exactly 5 fill-in-the-blank slots using `{{BLANK:qN}}` syntax (q1–q5).
- 5 `select` type questions (q1–q5) for the blanks. Each has 4 options (a/b/c/d), one correct answer.
- 6 `single` type MCQ questions (q6–q11) testing detail, paraphrase, and inference from both emails.
- All questions: `id`, `number`, `type`, `prompt`, `options` (array of `{id, text}`), `correctAnswer` (letter string), `explanation`, `skillTag` (one of: `detail`, `paraphrase`, `inference`), `difficulty` (`easy`/`medium`/`hard`).

**Part 2 — Reading to Apply a Diagram (8 questions)**
- A realistic diagram/table (e.g. schedule, pricing table, eligibility chart, comparison table). Use `diagram` field with `meta`, `headers` (array), and `rows` (array of arrays).
- A short context passage (1-2 paragraphs) explaining how to use the diagram.
- 8 `single` type questions (q12–q19) that require reading both the passage and the diagram.
- skillTags: mix of `detail`, `paraphrase`, `inference`.

**Part 3 — Reading for Information (9 questions)**
- A longer informational article (5–7 paragraphs), each paragraph labeled with `label()`. Topics: urban planning, health policy, workplace trends, environmental regulation, technology access.
- 3 `matching` type questions (q20–q22): prompt asks which paragraph contains a specific idea. Options are paragraph labels (e.g. `{id: 'a', text: 'Paragraph A'}` through D or E). correctAnswer is the letter.
- 6 `single` type questions (q23–q28) testing main-idea, detail, paraphrase, inference.
- skillTags: `main-idea`, `detail`, `paraphrase`, `inference`.

**Part 4 — Reading for Viewpoints (10 questions)**
- A public debate or opinion piece with 4 named speakers (like letters to the editor or a forum). Each speaker: 2–3 paragraphs.
- 9 `single` type questions (q29–q37) testing viewpoint, inference, detail.
- 1 `multi` type question (q38): `selectCount: 2`, `correctAnswer` is an array of 2 letter strings.
- skillTags: `viewpoint`, `inference`, `detail`.

**Passage helpers available (already defined in the file):**
- `paragraph(text)` — body paragraph
- `meta(text)` — From/To/Subject lines
- `label(text)` — paragraph label like "Paragraph A"
- `divider()` — horizontal rule between emails

**Quality rules:**
- Every distractor must be plausible (a wrong answer that a careless reader might choose).
- No question should be answerable without reading the passage.
- Spread difficulty: roughly 40% easy, 40% medium, 20% hard across each part.
- Explanations must cite exactly where in the passage the answer is found.
- Topics must be completely different from any previously published test. Read existing test objects in the file to avoid repeating topics.

### Step 3: Edit the file

Make three changes to `src/lib/celpipReadingData.mjs`:

1. **Add the new test constant** after the `CELPIP_READING_FREE_TEST` block (before `CELPIP_READING_TEST_CONTENT`). Name it `CELPIP_READING_TEST_NN` where NN is the zero-padded number (e.g. `CELPIP_READING_TEST_02`).

2. **Register it in `CELPIP_READING_TEST_CONTENT`** — add a new line alongside the existing entries:
   ```js
   [CELPIP_READING_TEST_NN.id]: CELPIP_READING_TEST_NN,
   ```

3. **Flip the catalog entry** from `status: 'draft'` to `status: 'published'` for the test you just generated.

### Step 4: Verify

After editing, check the file to confirm:
- The new test id appears in `CELPIP_READING_TEST_CONTENT`
- The catalog entry for that id now has `status: 'published'`
- `totalQuestions` is 38
- The new test block contains exactly 38 question objects (count `id: 'q` occurrences)

If any check fails, fix the file before proceeding.

### Step 5: Commit and push

```bash
git add src/lib/celpipReadingData.mjs
git commit -m "publish: add CELPIP reading test NN (monthly release)"
git push
```

Replace NN with the actual test number (e.g. `02`).

Report what test ID was published and confirm the push succeeded. Netlify will deploy automatically from the push.
