# Grammar Lesson Excellence Rubric

This is the quality bar for all grammar lessons going forward.  
Target learner baseline for explanation clarity: **CLB 6 readability**, even for higher-level topics.

## 1) Content Excellence (70 points)

1. Topic fidelity (20)
- The lesson must teach exactly what the title promises.
- Title keywords should appear in explanation, examples, errors, and practice.
- No generic filler that could fit any random grammar topic.

2. Explanation clarity (15)
- `Topic Explanation and Use` must define the point in plain language.
- Average sentence length should stay short enough for CLB 6 comprehension.
- Avoid dense jargon and abstract metalanguage.
- Include direct usage bullets and clear “rules to keep in mind.”

3. Real examples quality (10)
- At least two high-quality weak/strong contrasts.
- Examples must be real-world (daily life, school, work, civic context), not meta “about grammar itself.”
- Each pair includes a short “why it works” line.

4. Error coaching quality (10)
- At least three error cards.
- Every card has `Weak`, `Strong`, and `Fix`.
- Fix lines are specific and actionable.

5. Practice quality (5)
- At least three structured practice cards.
- Include both correction and production tasks (write/rewrite/build).

6. Answer guidance quality (10)
- Answers explain reasoning, not only final forms.
- Guidance helps learners self-correct future attempts.

## 2) Form Excellence (30 points)

1. Required structure (10)
- Must include:
  - `Topic Explanation and Use`
  - `Real-World Examples ...`
  - `Common Errors with ...`
  - `Practice`
  - `Answer Guide`
  - `Interactive Exercise Test`

2. Forbidden headings (hard fail if present)
- `Goal`
- `What ...`
- `Key Rule in Plain Language`

3. Interaction quality (10)
- Exactly one interactive exercise type per lesson page.
- Accordion layout for errors/practice/answers must be present and clear.

4. Scanability and readability (10)
- Strong bullet/list structure for quick navigation.
- Limited long-sentence density.
- Visual hierarchy should make reading feel guided, not wall-of-text.

## 3) Pass Threshold

- **Excellent threshold:** 85/100 minimum.
- <85 requires rewrite before acceptance.

## 4) Enforcement

- Automated audit script: `scripts/audit-grammar-lesson-excellence.mjs`
- Command:
  - `npm run lesson:audit:excellence`
  - optional strict threshold: `npm run lesson:audit:excellence -- --fail-below=90`

