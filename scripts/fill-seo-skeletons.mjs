#!/usr/bin/env node
/**
 * fill-seo-skeletons.mjs
 * Replaces placeholder bodies in seo-2026-03-25-*.md files with real lesson content.
 * Keeps frontmatter intact, overwrites only the body.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('src/content/lessons');

function escapeAttr(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

// ---------------------------------------------------------------------------
// Content map: filename-slug -> lesson body HTML
// ---------------------------------------------------------------------------
const CONTENT = {

  'seo-2026-03-25-01-ielts-writing-ielts-task-2-opinion-essay-framework': {
    intro: `An opinion essay requires one clear position stated in the introduction and defended through every paragraph. Most Band 5-6 writers drift mid-essay or present both views equally, which costs Task Achievement marks regardless of grammar quality.`,
    weak: `There are many advantages and disadvantages to this idea. Some people agree but others do not. I think it depends on the situation.`,
    strong: `Governments should make public transport free, because the long-term reduction in road congestion and carbon emissions outweighs the short-term cost to taxpayers.`,
    analysis: `The strong version commits to a specific position in one sentence and gives the reason in the same breath. The examiner sees Task Achievement immediately.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The four-paragraph frame</p>
    <p><strong>Introduction:</strong> paraphrase the question, state your position.<br>
    <strong>Body 1:</strong> main reason + specific example.<br>
    <strong>Body 2:</strong> second reason or concession + rebuttal.<br>
    <strong>Conclusion:</strong> restate position in new words only.</p>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When to use this frame</p>
    <ul>
      <li>Question says "To what extent do you agree or disagree?"</li>
      <li>Question says "Do you think...?" or "Give your own opinion."</li>
      <li>Any prompt asking you to take a clear stance.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Key sentences</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">I <strong>firmly believe</strong> that [position] because [reason].</div>
      <div class="lesson-pattern-sentence">The <strong>primary reason</strong> is that [specific point].</div>
      <div class="lesson-pattern-sentence">For these reasons, [restate position in new words].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>State your view in sentence 1 of the introduction — not sentence 3.</li>
      <li>Never use "I think" and "In my opinion" in the same sentence.</li>
      <li>The conclusion must restate, not re-open, the debate.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Sitting on the fence', weak: '"Both sides have valid points and it is hard to say."', strong: '"While both sides have merit, the economic case for free transit is stronger."', fix: 'Acknowledge the other side, then override it with your view.' },
      { label: 'New argument in conclusion', weak: '"In conclusion, the government should also invest in cycling infrastructure."', strong: '"In conclusion, free public transport remains the most cost-effective solution."', fix: 'Conclusions restate — they do not introduce.' },
    ],
    choiceQ: 'Which introduction scores highest for Task Achievement?',
    choiceOptions: ['This essay will discuss both sides of the argument about public transport.', 'I believe free public transport is essential because it reduces inequality and pollution.', 'There are many reasons why people use public transport in different countries.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 states a clear position with two supporting reasons immediately.',
    choiceWrong: 'Not quite. The strongest opening names a position and at least one reason — not a plan to discuss or a vague observation.',
    orderChunks: ['Free public transport', '||', 'reduces car use', '||', 'and lowers urban emissions.'],
    orderAnswer: 'Free public transport||reduces car use||and lowers urban emissions.',
    orderCorrect: 'Correct. Subject + main verb + result is the tightest pattern for a body sentence.',
    orderWrong: 'Not yet. Start with the subject (Free public transport), then the action (reduces), then the outcome.',
    sortRows: [
      { text: 'I believe renewable energy should replace fossil fuels within a decade.', target: 'Strong' },
      { text: 'Both options have good and bad points depending on your point of view.', target: 'Weak' },
      { text: 'Stricter penalties are the most effective deterrent against speeding.', target: 'Strong' },
      { text: 'It is difficult to say which side is right in this complex debate.', target: 'Weak' },
    ],
    sortCategories: ['Strong', 'Weak'],
    sortCorrect: 'Correct. Strong opinion language commits to a position. Weak language hedges without committing.',
    sortWrong: 'Check again. Strong sentences make a claim; weak ones avoid taking a side.',
    whyText: `Task Achievement accounts for 25% of your IELTS Writing score. An unclear or absent opinion drops this criterion to Band 5 regardless of how accurate your grammar is. Stating a clear, consistent position is the single highest-leverage change most Band 5-6 writers can make.`,
  },

  'seo-2026-03-25-02-ielts-writing-ielts-task-2-discussion-essay-structure': {
    intro: `A discussion essay asks you to present both views fairly and then give your own opinion. The most common mistake is treating it like two separate opinion essays — one for each side — with no personal position at the end. The examiner needs to know where you stand.`,
    weak: `Some people think technology is good for education. Other people think it is bad. There are many arguments on both sides. In my opinion both views have good points.`,
    strong: `Advocates of educational technology argue that digital tools give students access to resources once limited to elite institutions. Critics counter that screen dependence shortens concentration spans. On balance, I believe the access benefits outweigh the risks, provided schools set clear usage limits.`,
    analysis: `The strong version presents each view in one precise sentence, uses contrast signposting, and ends with a conditional opinion — showing nuance rather than fence-sitting.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Structure</p>
    <p><strong>Introduction:</strong> paraphrase + signal that you will discuss both views + state your position.<br>
    <strong>Body 1:</strong> View A — strongest argument + one example.<br>
    <strong>Body 2:</strong> View B — strongest argument + one example.<br>
    <strong>Conclusion:</strong> weigh the two views, restate your opinion.</p>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When to use this</p>
    <ul>
      <li>Question says "Discuss both views and give your own opinion."</li>
      <li>Two clear positions are presented in the question prompt.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Key phrases</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence"><strong>Proponents of X argue that</strong> [point A].</div>
      <div class="lesson-pattern-sentence"><strong>Critics, however, contend that</strong> [point B].</div>
      <div class="lesson-pattern-sentence"><strong>On balance, I believe</strong> [your position], <strong>provided that</strong> [condition].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Give each view roughly equal space — one body paragraph each.</li>
      <li>Use reporting verbs (argue, contend, suggest) to distance yourself from View A or B.</li>
      <li>Your own opinion must appear — "both have merit" is not an opinion.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'No personal opinion', weak: '"Both sides have valid points and society must decide."', strong: '"On balance, I believe stricter regulation is necessary despite the cost to industry."', fix: 'Choose a side and state it clearly in the conclusion.' },
      { label: 'Using "I" to present View A or B', weak: '"I think technology is good because students learn faster."', strong: '"Advocates argue that technology accelerates learning through instant feedback."', fix: 'Use reporting verbs for the views; keep "I" for your own conclusion.' },
    ],
    choiceQ: 'Which sentence correctly presents View A without expressing the writer\'s own opinion?',
    choiceOptions: ['I think social media is harmful for teenagers.', 'Opponents of social media argue that it increases anxiety among teenagers.', 'Social media is bad and the government should ban it.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Opponents argue" presents the view neutrally using a reporting verb.',
    choiceWrong: 'Not yet. Look for the sentence that uses a reporting verb (argue, contend, suggest) rather than "I think" or a direct claim.',
    orderChunks: ['Critics contend that', '||', 'screen dependence', '||', 'reduces sustained concentration.'],
    orderAnswer: 'Critics contend that||screen dependence||reduces sustained concentration.',
    orderCorrect: 'Correct. Reporting verb + subject + result is the standard pattern for presenting a view.',
    orderWrong: 'Not yet. Start with the reporting phrase (Critics contend that), then the cause (screen dependence), then the effect.',
    sortRows: [
      { text: 'Supporters argue that renewable energy creates long-term jobs.', target: 'Presents view neutrally' },
      { text: 'I believe renewable energy is the only solution.', target: 'Personal opinion' },
      { text: 'Critics suggest that the transition cost is too high for developing nations.', target: 'Presents view neutrally' },
      { text: 'On balance, I think the benefits outweigh the costs.', target: 'Personal opinion' },
    ],
    sortCategories: ['Presents view neutrally', 'Personal opinion'],
    sortCorrect: 'Correct. Neutral presentation uses reporting verbs; personal opinion uses first person with a stance.',
    sortWrong: 'Check again. Reporting verbs (argue, suggest, contend) signal neutral presentation; "I believe/think" signals personal opinion.',
    whyText: `IELTS Task 2 discussion essays are marked on whether you address all parts of the task. If you omit your own opinion, you cap Task Achievement at Band 5. If you fail to present both views fairly, you lose marks on Coherence and Cohesion. This structure ensures both criteria are met.`,
  },

  'seo-2026-03-25-03-ielts-writing-ielts-task-2-problem-solution-response-blueprint': {
    intro: `Problem-solution essays require you to identify a real problem, explain why it exists or what it causes, and then propose a concrete solution with a clear mechanism. Most writers list problems and solutions without connecting them — which costs marks for coherence.`,
    weak: `Traffic congestion is a big problem in cities. The government should build more roads and people should use public transport.`,
    strong: `Urban congestion stems primarily from an over-reliance on private vehicles, which is itself caused by inadequate public transport networks. The most effective solution is therefore to invest in high-frequency bus and metro systems first, making alternatives genuinely viable before discouraging car use through congestion charges.`,
    analysis: `The strong version traces cause to problem to solution in a logical chain. "Therefore" and "before" make the reasoning explicit for the examiner.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The cause-solution chain</p>
    <p>Each problem in your essay should follow this chain:<br>
    <strong>Cause → Problem → Effect → Solution → Mechanism</strong><br>
    If you skip "mechanism" (how the solution works), the essay sounds like a wish list.</p>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When to use this</p>
    <ul>
      <li>Question asks "What are the causes and what solutions can you suggest?"</li>
      <li>Question asks "What problems does X cause and how can they be solved?"</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Key patterns</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">X is caused by [root cause], which leads to [effect].</div>
      <div class="lesson-pattern-sentence">One effective solution is [action], because it [mechanism].</div>
      <div class="lesson-pattern-sentence">If governments [action], [effect] would [change] within [timeframe].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Match each problem to a specific solution — do not propose generic fixes.</li>
      <li>Explain how each solution works, not just what it is.</li>
      <li>Use causal language: stems from, leads to, results in, consequently.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Solution without mechanism', weak: '"The government should educate people about the environment."', strong: '"Mandatory environmental literacy modules in secondary schools would ensure every citizen understands the personal cost of carbon emissions by age 18."', fix: 'State what the solution achieves and how it achieves it.' },
      { label: 'Listing without connecting', weak: '"There are three problems: pollution, traffic, and noise. There are three solutions: trees, buses, and laws."', strong: '"Pollution from traffic can be reduced by electrifying bus fleets, which addresses two of the three problems simultaneously."', fix: 'Connect problems to solutions explicitly rather than listing them in parallel.' },
    ],
    choiceQ: 'Which sentence best explains a solution with a mechanism?',
    choiceOptions: ['The government should reduce pollution.', 'Introducing congestion charges would reduce car trips by making driving more expensive than public transport.', 'People need to be more aware of environmental issues.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 names the solution, explains the mechanism (pricing), and links it to the desired outcome.',
    choiceWrong: 'Not quite. Look for the option that explains HOW the solution works, not just what it is.',
    orderChunks: ['Urban congestion', '||', 'stems from poor transit infrastructure,', '||', 'so expanding metro networks is the priority.'],
    orderAnswer: 'Urban congestion||stems from poor transit infrastructure,||so expanding metro networks is the priority.',
    orderCorrect: 'Correct. Problem + cause + solution in one sentence shows clear logical thinking.',
    orderWrong: 'Not yet. Start with the problem (Urban congestion), then the cause (stems from...), then the solution (so...).',
    sortRows: [
      { text: 'Obesity rates rise because ultra-processed food is cheaper than fresh produce.', target: 'Cause identified' },
      { text: 'The solution is for people to eat healthier food.', target: 'No mechanism' },
      { text: 'Subsidising fruit and vegetables would make healthy choices affordable for low-income families.', target: 'Solution with mechanism' },
      { text: 'Governments should do something about the obesity problem.', target: 'No mechanism' },
    ],
    sortCategories: ['Solution with mechanism', 'No mechanism'],
    sortCorrect: 'Correct. A strong solution sentence explains what changes and why that change produces the desired outcome.',
    sortWrong: 'Check again. "Should do something" and "people should eat better" give no mechanism. Subsidising prices explains how the change happens.',
    whyText: `Task Achievement in a problem-solution essay requires that your solutions are clearly connected to the problems you identify. Examiners penalise responses where solutions are generic or disconnected. Coherence and Cohesion also requires logical sequencing — the cause-solution chain provides exactly that.`,
  },

  'seo-2026-03-25-04-ielts-writing-ielts-task-1-academic-overview-sentences': {
    intro: `The overview is the most important sentence in an IELTS Task 1 Academic response. It summarises the main trend or dominant feature of the data without quoting specific numbers. Missing or weak overviews are the leading cause of Band 5 Task Achievement scores in Task 1.`,
    weak: `The graph shows data about internet usage in five countries between 2000 and 2020. There are many different numbers in the graph.`,
    strong: `Overall, internet usage rose significantly in all five countries over the period, with South Korea showing the steepest growth and France the most modest.`,
    analysis: `The strong overview identifies the dominant trend (all rose), notes a key comparison (steepest vs most modest), and uses no specific figures. It could be written before looking at the numbers in detail.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">What an overview must do</p>
    <ul>
      <li>Identify the main trend or dominant feature (not every detail).</li>
      <li>Make a comparison if one is obvious (highest, lowest, fastest).</li>
      <li>Use no specific numbers — those belong in the detail paragraphs.</li>
      <li>Appear at the end of the introduction or as a separate short paragraph.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Apply to every chart type</p>
    <ul>
      <li>Line graphs: identify the overall direction and any outlier.</li>
      <li>Bar/pie charts: identify the largest and smallest category.</li>
      <li>Tables: identify the highest total and the most striking difference.</li>
      <li>Process diagrams: identify the number of stages and the start/end state.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Overview starters</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence"><strong>Overall,</strong> [main trend], with [key comparison].</div>
      <div class="lesson-pattern-sentence"><strong>In general,</strong> [dominant feature], although [notable exception].</div>
      <div class="lesson-pattern-sentence"><strong>It is clear that</strong> [main trend] throughout the period.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Write the overview before the detail paragraphs, not as a conclusion.</li>
      <li>No numbers in the overview — save them for the body.</li>
      <li>Two sentences maximum; one is often enough.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Overview with specific numbers', weak: '"Overall, internet usage in South Korea rose from 20% to 95% between 2000 and 2020."', strong: '"Overall, internet usage rose dramatically in all countries, with South Korea recording the largest increase."', fix: 'Remove specific figures from the overview; describe direction and scale instead.' },
      { label: 'Describing the chart rather than the data', weak: '"The bar chart shows information about five countries using different coloured bars."', strong: '"Overall, energy consumption per capita was highest in North America and lowest in Africa across all years shown."', fix: 'Describe what the data shows, not what the chart looks like.' },
    ],
    choiceQ: 'Which sentence works best as a Task 1 Academic overview?',
    choiceOptions: ['The graph shows the percentage of people using the internet from 2000 to 2020.', 'Overall, internet adoption grew in all countries, though the rate varied considerably.', 'In 2000, 5% of people used the internet, and by 2020 this had risen to 90% in some countries.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 states the main trend (growth) and a key nuance (varying rates) without specific numbers.',
    choiceWrong: 'Not quite. Option 1 describes the chart rather than the data. Option 3 includes specific numbers, which belong in the body.',
    orderChunks: ['Overall,', '||', 'electricity consumption rose in all regions,', '||', 'with Asia recording the sharpest increase.'],
    orderAnswer: 'Overall,||electricity consumption rose in all regions,||with Asia recording the sharpest increase.',
    orderCorrect: 'Correct. Opener + main trend + key comparison is the standard overview structure.',
    orderWrong: 'Not yet. Start with "Overall," then state what happened to the data generally, then add the standout comparison.',
    sortRows: [
      { text: 'Overall, car ownership increased in most countries over the decade.', target: 'Good overview' },
      { text: 'In 2010, Germany had 500 cars per 1000 people.', target: 'Detail — not overview' },
      { text: 'In general, renewable energy accounted for the smallest share of production throughout.', target: 'Good overview' },
      { text: 'The table shows six countries and four types of energy from 2000 to 2020.', target: 'Detail — not overview' },
    ],
    sortCategories: ['Good overview', 'Detail — not overview'],
    sortCorrect: 'Correct. Overviews describe trends and comparisons; details give specific numbers and describe the chart.',
    sortWrong: 'Check again. Overviews state the big picture without numbers. Specific figures and chart descriptions belong in the body.',
    whyText: `IELTS Academic Task 1 awards a full 25% of marks to Task Achievement, and the band descriptors explicitly require a clear overview of main trends. Without one, Band 7 is unreachable regardless of grammar quality. Writing the overview is a 30-second habit that protects your score.`,
  },

  'seo-2026-03-25-05-ielts-writing-ielts-task-1-data-comparison-language': {
    intro: `Task 1 Academic requires precise language to compare data points — not just "more" and "less." Examiners look for a range of comparison structures, accurate proportional language, and correct use of prepositions with numbers.`,
    weak: `In 2000 the UK used more energy than France. In 2020 the UK still used more energy. France used less energy than the UK.`,
    strong: `The UK consumed roughly twice as much energy as France in 2000, and this gap widened further by 2020, when UK consumption exceeded France's by approximately 40%.`,
    analysis: `The strong version uses a ratio (twice as much), a trend verb (widened), and a precise approximation (approximately 40%) — all in two sentences instead of three repetitive ones.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Comparison toolkit</p>
    <ul>
      <li><strong>Ratio:</strong> twice/three times as much as, half the level of</li>
      <li><strong>Margin:</strong> exceeded X by 20%, higher than X by a factor of two</li>
      <li><strong>Approximation:</strong> approximately, roughly, just under/over, nearly</li>
      <li><strong>Trend:</strong> the gap widened/narrowed, X overtook Y, X converged with Y</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Which structure to use when</p>
    <ul>
      <li>Gap is a round multiple: use ratio language (twice as much).</li>
      <li>Gap is a percentage: use "exceeded by" or "higher by".</li>
      <li>Trend changes direction: use overtook, surpassed, converged.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Key patterns</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">X was <strong>approximately twice as high as</strong> Y in [year].</div>
      <div class="lesson-pattern-sentence">X <strong>exceeded</strong> Y <strong>by</strong> roughly 30% by [year].</div>
      <div class="lesson-pattern-sentence">The gap between X and Y <strong>narrowed significantly</strong> over the period.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Never write "more higher" or "more faster" — use the comparative alone.</li>
      <li>Use "than" not "then" in comparisons.</li>
      <li>Approximate numbers honestly: "approximately 45%" not "45% exactly" unless the chart shows an exact figure.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Repeating "more than" for every comparison', weak: '"China used more energy than India. China produced more steel than India. China had more factories than India."', strong: '"China led India in energy use, steel production, and industrial output across all years shown."', fix: 'Consolidate parallel comparisons into one sentence with a list.' },
      { label: 'Wrong preposition after figures', weak: '"Sales increased of 20% in Q3."', strong: '"Sales increased by 20% in Q3."', fix: 'Use "by" for change amounts; "to" for new levels; "at" for rates.' },
    ],
    choiceQ: 'Which sentence uses comparison language most effectively?',
    choiceOptions: ['The USA used more oil than Japan in every year.', 'The USA consumed roughly three times as much oil as Japan throughout the period.', 'The USA had higher oil usage and Japan had lower oil usage.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Three times as much" is precise and concise; it avoids repeating "higher/lower."',
    choiceWrong: 'Not quite. Look for the option that uses a specific ratio or margin rather than vague "more/higher" language.',
    orderChunks: ['China\'s output exceeded India\'s', '||', 'by approximately 40%', '||', 'throughout the decade.'],
    orderAnswer: 'China\'s output exceeded India\'s||by approximately 40%||throughout the decade.',
    orderCorrect: 'Correct. Subject + exceeded + by + margin + timeframe is the standard margin comparison pattern.',
    orderWrong: 'Not yet. The verb "exceeded" is followed by the object (India\'s), then "by" and the margin, then the time reference.',
    sortRows: [
      { text: 'Germany produced twice as much renewable energy as Poland in 2015.', target: 'Precise comparison' },
      { text: 'Germany made more energy than Poland.', target: 'Vague comparison' },
      { text: 'The gap between the two countries narrowed by 2020.', target: 'Precise comparison' },
      { text: 'The numbers became more similar later.', target: 'Vague comparison' },
    ],
    sortCategories: ['Precise comparison', 'Vague comparison'],
    sortCorrect: 'Correct. Precise comparison uses ratios, margins, and trend verbs. Vague comparison uses only "more/less/similar."',
    sortWrong: 'Check again. "Twice as much" and "narrowed" are precise; "more" and "similar" are vague without a quantity.',
    whyText: `Lexical Resource accounts for 25% of your Task 1 score. Using only "more than" and "less than" signals a limited range and caps Lexical Resource at Band 5. A varied comparison toolkit — ratios, margins, trend verbs — demonstrates the range examiners need to award Band 7.`,
  },

  'seo-2026-03-25-06-ielts-writing-ielts-cohesion-techniques-for-band-7': {
    intro: `Cohesion is how sentences and paragraphs connect. Band 6 writers use connectors like "however" and "furthermore" but apply them mechanically at the start of every sentence. Band 7 writers vary their cohesive devices and embed them within sentences — which is what this lesson covers.`,
    weak: `Firstly, pollution is a major problem. Furthermore, it affects health. In addition, it harms the economy. However, some argue it is exaggerated. In conclusion, it is serious.`,
    strong: `Pollution poses a serious public health risk, the economic consequences of which are often underestimated. While some minimise its severity, the evidence from WHO reports suggests otherwise.`,
    analysis: `The strong version uses a relative clause ("the consequences of which"), a concession ("While some minimise"), and a reference chain ("its severity / the evidence") — three different cohesive devices with no mechanical connector in sight.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Three cohesion layers</p>
    <ul>
      <li><strong>Reference:</strong> it, this, these, such, the former/latter — link back to previous noun.</li>
      <li><strong>Substitution:</strong> "do so," "this approach," "such policies" — replace a phrase without repeating it.</li>
      <li><strong>Connectors:</strong> use sparingly (max 1 per paragraph); embed mid-sentence when possible.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When each device works best</p>
    <ul>
      <li>Between clauses in the same sentence: relative clauses, participle phrases.</li>
      <li>Between sentences: reference chains (this issue, such measures).</li>
      <li>Between paragraphs: topic sentence that echoes the previous paragraph's conclusion.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Embedded connectors</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Urban congestion, <strong>which stems from</strong> car dependency, costs cities billions annually.</div>
      <div class="lesson-pattern-sentence"><strong>Despite this cost,</strong> few governments have committed to congestion pricing.</div>
      <div class="lesson-pattern-sentence"><strong>Such reluctance</strong> reflects the political difficulty of taxing drivers.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Never start three sentences in a row with a connector word.</li>
      <li>Use "this" to refer to the previous idea — not to something mentioned two paragraphs ago.</li>
      <li>Vary: one relative clause, one reference, one connector per paragraph is enough.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Connector at the start of every sentence', weak: '"Firstly... Furthermore... Moreover... In addition... Finally..."', strong: 'Mix: one connector per paragraph, plus relative clauses and reference chains for the rest.', fix: 'Count your connectors per paragraph; reduce to one explicit one and use implicit cohesion for the rest.' },
      { label: 'Unclear pronoun reference', weak: '"Governments should act on pollution. It is a major issue."', strong: '"Governments should act on air pollution, which has become a major public health issue."', fix: 'Replace vague "it" with a specific noun or a relative clause.' },
    ],
    choiceQ: 'Which pair of sentences shows the best cohesion?',
    choiceOptions: [
      'Climate change is serious. Furthermore, it causes problems. Moreover, governments must act.',
      'Climate change poses an existential threat, the full cost of which will fall on future generations. Despite this, policy responses remain inadequate.',
      'Climate change is bad. However, some people disagree. In addition, scientists worry.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses a relative clause (the cost of which) and an embedded connector (Despite this) — varied and natural.',
    choiceWrong: 'Not quite. Avoid starting consecutive sentences with connectors. Look for the option that embeds cohesion within sentences.',
    orderChunks: ['Urban poverty,', '||', 'which limits access to education,', '||', 'perpetuates inequality across generations.'],
    orderAnswer: 'Urban poverty,||which limits access to education,||perpetuates inequality across generations.',
    orderCorrect: 'Correct. A non-defining relative clause is one of the most natural cohesive tools — it embeds the connection inside the sentence.',
    orderWrong: 'Not yet. The main noun (Urban poverty) comes first, then the relative clause (which limits...), then the main verb and result.',
    sortRows: [
      { text: 'Plastic pollution endangers marine life, the effects of which may be irreversible.', target: 'Embedded cohesion' },
      { text: 'Furthermore, plastic pollution is bad for fish. Moreover, it harms the ocean.', target: 'Mechanical connectors' },
      { text: 'Such damage is difficult to reverse once ecosystems are disrupted.', target: 'Embedded cohesion' },
      { text: 'In addition, the economy is affected. Also, tourism suffers.', target: 'Mechanical connectors' },
    ],
    sortCategories: ['Embedded cohesion', 'Mechanical connectors'],
    sortCorrect: 'Correct. Embedded cohesion (relative clauses, "such") sounds natural. Mechanical connectors stacked at sentence starts sound formulaic.',
    sortWrong: 'Check again. "Furthermore/Moreover/In addition" at sentence starts = mechanical. Relative clauses and "such/this" inside sentences = embedded.',
    whyText: `Coherence and Cohesion is worth 25% of your Task 2 score. The Band 7 descriptor requires cohesive devices to be used "flexibly." Using only sentence-initial connectors is the exact pattern described in Band 6. Embedding cohesion within sentences is the single change that most reliably lifts Band 6 writers to Band 7 on this criterion.`,
  },

  'seo-2026-03-25-07-ielts-writing-ielts-grammar-accuracy-under-time-pressure': {
    intro: `Grammatical Range and Accuracy is not just about knowing complex structures — it is about producing them correctly under timed conditions. The most common error pattern is not lack of knowledge but lack of a final-check system.`,
    weak: `Many people thinks that government should investing more money in public transport because it reducing traffic and pollution.`,
    strong: `Many people believe that governments should invest more in public transport, as this would reduce both traffic congestion and urban pollution.`,
    analysis: `Three errors fixed: subject-verb agreement (thinks → believe), verb form after modal (investing → invest), and non-finite clause replaced with a cleaner "as this would" construction.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The 3-minute final check</p>
    <p>In the final 3 minutes, scan only for these four error types in order:</p>
    <ol>
      <li><strong>Subject-verb agreement:</strong> every third-person singular subject needs -s.</li>
      <li><strong>Verb form after modals:</strong> should/would/can + bare infinitive (no -ing, no to).</li>
      <li><strong>Article errors:</strong> a/an/the vs zero article before countable nouns.</li>
      <li><strong>Missing -ed on past participles:</strong> "is concern" → "is concerned."</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When each error appears most often</p>
    <ul>
      <li>Subject-verb agreement: complex subjects (the number of people, each of the governments).</li>
      <li>Modal + verb form: recommendation sentences (should investing, must to reduce).</li>
      <li>Articles: first mention of a noun, abstract nouns, plural nouns.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Quick-fix patterns</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">The number of cars <strong>has</strong> increased. (singular subject)</div>
      <div class="lesson-pattern-sentence">Governments should <strong>invest</strong> in infrastructure. (bare infinitive)</div>
      <div class="lesson-pattern-sentence">This is <strong>a</strong> complex issue with <strong>no</strong> easy solution. (articles)</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Check modals first — they cause the most errors per minute.</li>
      <li>"The number of" is singular; "a number of" is plural.</li>
      <li>Abstract nouns (education, poverty) usually take zero article.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Modal + -ing', weak: '"Governments should investing in renewable energy."', strong: '"Governments should invest in renewable energy."', fix: 'After should/would/can/must: use the bare infinitive (invest, reduce, build).' },
      { label: 'Subject-verb mismatch with complex subject', weak: '"The number of students who fail their exams are increasing."', strong: '"The number of students who fail their exams is increasing."', fix: '"The number of" is singular — the verb must match the head noun "number," not the noun in the relative clause.' },
    ],
    choiceQ: 'Which sentence is grammatically correct?',
    choiceOptions: ['Governments must to reduce carbon emissions immediately.', 'Governments must reduce carbon emissions immediately.', 'Governments must reducing carbon emissions immediately.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Must + bare infinitive: no "to," no "-ing."',
    choiceWrong: 'Not quite. After modal verbs (must, should, can, will), always use the bare infinitive — no "to," no "-ing."',
    orderChunks: ['The number of electric vehicles', '||', 'on the road', '||', 'has doubled since 2018.'],
    orderAnswer: 'The number of electric vehicles||on the road||has doubled since 2018.',
    orderCorrect: 'Correct. "The number of" takes a singular verb (has), not "have."',
    orderWrong: 'Not yet. The head noun is "number" (singular), so the verb must be "has," not "have."',
    sortRows: [
      { text: 'Many researchers believes that climate change is accelerating.', target: 'Error' },
      { text: 'Many researchers believe that climate change is accelerating.', target: 'Correct' },
      { text: 'The government should to invest more in public health.', target: 'Error' },
      { text: 'The government should invest more in public health.', target: 'Correct' },
    ],
    sortCategories: ['Correct', 'Error'],
    sortCorrect: 'Correct. "Researchers believe" (no -s after plural subject) and "should invest" (bare infinitive after modal).',
    sortWrong: 'Check again. Plural subjects take bare verb forms. Modals (should, must, can) are followed by bare infinitives only.',
    whyText: `Grammatical Range and Accuracy contributes 25% of your IELTS Writing score. A final 3-minute scan targeting subject-verb agreement, modal forms, articles, and past participles catches the four most frequent error types. Most Band 6 writers already know these rules — the issue is not checking.`,
  },

  'seo-2026-03-25-08-ielts-writing-ielts-lexical-resource-upgrade-plan': {
    intro: `Lexical Resource rewards precision and range, not length. Using ten ordinary words is worth less than using four precise ones. The goal is to replace vague everyday words with specific academic equivalents and to use them in natural collocations — not random substitution.`,
    weak: `More people are using the internet now. This is good for society. It helps people do things faster and gives them information.`,
    strong: `Internet adoption has expanded rapidly, bringing measurable social benefits: it accelerates access to information and enables remote participation in economic and civic life.`,
    analysis: `Six vague words replaced: "using" → "adoption," "good" → "measurable social benefits," "things faster" → "accelerates access," "gives information" → "enables participation." Each replacement is a natural collocation, not a thesaurus swap.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Upgrade in three steps</p>
    <ol>
      <li>Identify the vague word: good, bad, big, do, get, thing, people, use.</li>
      <li>Ask: what is specifically true here? (good for health → improves wellbeing)</li>
      <li>Check the collocation: "improve wellbeing" is natural; "ameliorate wellbeing" is not.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">High-frequency upgrade pairs</p>
    <ul>
      <li>good/bad → beneficial/detrimental, advantageous/harmful</li>
      <li>big/small → substantial/marginal, significant/negligible</li>
      <li>people → residents, citizens, practitioners, stakeholders</li>
      <li>use → adopt, employ, utilise (only when the word fits)</li>
      <li>do → implement, undertake, carry out</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Key collocations</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">have a <strong>significant impact</strong> on / pose a <strong>serious threat</strong> to</div>
      <div class="lesson-pattern-sentence"><strong>address</strong> the problem / <strong>tackle</strong> the issue / <strong>combat</strong> the challenge</div>
      <div class="lesson-pattern-sentence"><strong>implement</strong> a policy / <strong>introduce</strong> a measure / <strong>enforce</strong> a regulation</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Do not swap every common word — natural common words score fine.</li>
      <li>Upgrade where precision adds meaning, not just to sound formal.</li>
      <li>Learn collocations as chunks: "tackle the problem," not just "tackle."</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Random thesaurus swap', weak: '"Governments should utilise diverse methodologies to ameliorate societal predicaments."', strong: '"Governments should use several strategies to address social problems."', fix: 'Uncommon words used wrongly score lower than common words used correctly. Precision beats rarity.' },
      { label: 'Vague noun', weak: '"This is a big problem for society."', strong: '"This poses a significant threat to public health and social cohesion."', fix: 'Replace "problem" with the specific kind of problem and replace "society" with the affected group.' },
    ],
    choiceQ: 'Which sentence best demonstrates Band 7 Lexical Resource?',
    choiceOptions: ['Many people use the internet to do things more quickly.', 'Internet adoption enables citizens to access information and services with greater efficiency.', 'A plethora of individuals utilise cyberspace for multifarious expeditious purposes.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses precise, natural collocations: "enables," "access," "greater efficiency." No unnecessary complexity.',
    choiceWrong: 'Not quite. Option 1 is vague; Option 3 uses rare words incorrectly, which examiners penalise under Lexical Resource.',
    orderChunks: ['Air pollution', '||', 'poses a significant threat', '||', 'to urban public health.'],
    orderAnswer: 'Air pollution||poses a significant threat||to urban public health.',
    orderCorrect: 'Correct. "Poses a significant threat to" is a precise, natural collocation for describing a serious risk.',
    orderWrong: 'Not yet. The subject (Air pollution) + collocation verb (poses) + noun phrase (a significant threat) + preposition (to) + specific context.',
    sortRows: [
      { text: 'Governments should implement stricter environmental regulations.', target: 'Precise' },
      { text: 'Governments should do more things about the environment.', target: 'Vague' },
      { text: 'Rising unemployment poses a threat to social stability.', target: 'Precise' },
      { text: 'More people not having jobs is bad for society.', target: 'Vague' },
    ],
    sortCategories: ['Precise', 'Vague'],
    sortCorrect: 'Correct. Precise language uses specific verbs (implement, pose) and nouns (regulations, stability). Vague language uses do, things, bad, society.',
    sortWrong: 'Check again. "Implement regulations" and "poses a threat to social stability" are precise collocations. "Do more things" and "bad for society" are vague.',
    whyText: `Lexical Resource is 25% of your Task 2 score. Band 7 requires "sufficient range to allow some flexibility and precision." Using precise collocations (not rare words) is how flexibility is demonstrated. Upgrading the eight most common vague words — good, bad, big, do, get, thing, people, use — covers the majority of lexical upgrade opportunities in any Task 2 essay.`,
  },

  'seo-2026-03-25-09-ielts-speaking-ielts-speaking-part-1-high-score-answer-pattern': {
    intro: `Part 1 questions are short and personal — about daily life, habits, preferences. Most test-takers give one-sentence answers and stop, or ramble for 30 seconds without structure. The ideal Part 1 answer is 2-3 sentences: a direct answer, a reason or detail, and an optional extension.`,
    weak: `"Do you like cooking?" → "Yes, I like cooking. It is good."`,
    strong: `"Do you like cooking?" → "Yes, quite a lot actually — I find it a good way to switch off after work. I particularly enjoy making dishes from scratch rather than following a recipe too closely."`,
    analysis: `The strong answer gives a direct reply (yes), a reason tied to a real experience (switch off after work), and a natural extension (from scratch vs recipe). It takes about 15 seconds — long enough to show fluency, short enough not to ramble.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The 2-3 sentence frame</p>
    <ol>
      <li><strong>Answer:</strong> direct response to the question (yes/no + one word).</li>
      <li><strong>Reason/detail:</strong> why, when, how often, or a specific example.</li>
      <li><strong>Extension (optional):</strong> contrast, follow-up, or preference.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Target length</p>
    <ul>
      <li>Yes/no questions: 2-3 sentences, 10-20 seconds.</li>
      <li>How often / When / Where: 2-3 sentences, same target.</li>
      <li>Do not ask the examiner to repeat unless you genuinely did not hear.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Useful answer starters</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Yes, <strong>quite a lot actually</strong> — [reason].</div>
      <div class="lesson-pattern-sentence">Not really, to be honest — [reason]. I much prefer [alternative].</div>
      <div class="lesson-pattern-sentence">It depends, I suppose — [condition A vs condition B].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Never repeat the question back as your first sentence.</li>
      <li>Give a reason even for simple yes/no answers.</li>
      <li>End naturally — do not trail off with "...and so on" or "...etc."</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'One-word answer', weak: '"Do you enjoy reading?" → "Yes."', strong: '"Do you enjoy reading?" → "Yes, very much — I read mostly non-fiction, especially books about history and economics. I find it a more focused way to learn than watching videos."', fix: 'Always follow yes/no with a reason and at least one specific detail.' },
      { label: 'Repeating the question', weak: '"Do you like sports?" → "I like sports. Sports are good for health."', strong: '"Do you like sports?" → "Yes, I do — I play tennis twice a week and I try to go running on weekends too."', fix: 'Start with your answer and reason, not a repetition of the question words.' },
    ],
    choiceQ: 'Which Part 1 answer best demonstrates Band 7 Speaking?',
    choiceOptions: [
      '"Do you cook?" → "Yes, I cook every day."',
      '"Do you cook?" → "Yes, most evenings actually — I find it quite relaxing and it\'s a good way to avoid eating out too often."',
      '"Do you cook?" → "Well, cooking is very important in my culture and many people cook and also some people do not cook because they are busy."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 is direct, gives a reason, and adds a natural extension — all in two sentences.',
    choiceWrong: 'Not quite. Option 1 is too short. Option 3 drifts from the personal question into a general statement.',
    orderChunks: ['Yes, I enjoy it quite a lot —', '||', 'I find cooking from scratch', '||', 'a good way to unwind after a long day.'],
    orderAnswer: 'Yes, I enjoy it quite a lot —||I find cooking from scratch||a good way to unwind after a long day.',
    orderCorrect: 'Correct. Direct answer + specific activity + reason/feeling is the natural Part 1 response structure.',
    orderWrong: 'Not yet. Start with the direct answer (Yes, I enjoy it), then the specific detail, then the reason.',
    sortRows: [
      { text: 'Yes, I read quite a lot — mostly science fiction and the occasional biography.', target: 'Good Part 1 answer' },
      { text: 'Reading is a good habit and many people read books in their free time.', target: 'Too general' },
      { text: 'Not really — I prefer podcasts because I can listen while commuting.', target: 'Good Part 1 answer' },
      { text: 'Well, there are many types of books and different people like different things.', target: 'Too general' },
    ],
    sortCategories: ['Good Part 1 answer', 'Too general'],
    sortCorrect: 'Correct. Good answers are personal and specific. Too-general answers could apply to anyone.',
    sortWrong: 'Check again. Part 1 answers should be personal (I, my, for me) and specific. General statements about "people" miss the mark.',
    whyText: `IELTS Speaking Part 1 tests whether you can communicate comfortably about familiar topics. The examiner is listening for natural fluency and appropriate length — not complexity. A 2-3 sentence answer with a clear reason demonstrates both. One-sentence answers interrupt fluency; 30-second rambles reduce coherence.`,
  },

  'seo-2026-03-25-10-ielts-speaking-ielts-speaking-part-2-story-development-strategy': {
    intro: `Part 2 gives you a cue card and 1 minute to prepare. You must speak for 1-2 minutes. The most common failure is running out of things to say at 40 seconds. The fix is a simple story arc: set the scene, describe the event, explain the significance.`,
    weak: `"Describe a memorable journey." → "I went to Japan. It was very beautiful. The food was good. I liked it a lot. That is all I can say."`,
    strong: `"Describe a memorable journey." → "I'd like to talk about a trip I took to Kyoto about three years ago. I went with two university friends during cherry blossom season, which made the timing particularly special. What made the journey memorable wasn't just the temples — it was getting completely lost trying to find a small restaurant my friend had read about, and ending up eating at a tiny noodle bar where nobody spoke English. It turned into one of those moments you remember precisely because it went off-plan."`,
    analysis: `The strong answer uses: a scene-setter (time, who, context), a specific event (getting lost), a reflection (why it was memorable). All three together fill 90 seconds naturally.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The three-part arc</p>
    <ol>
      <li><strong>Scene:</strong> when, where, who with, any relevant context.</li>
      <li><strong>Event:</strong> what happened — one specific moment, not a list of things.</li>
      <li><strong>Significance:</strong> why you remember it, how you felt, what changed.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Use your preparation minute to</p>
    <ul>
      <li>Choose one specific memory, not the most impressive one.</li>
      <li>Jot three bullet points: scene / event / why it mattered.</li>
      <li>Think of 2-3 sensory or emotional details for the event.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Useful phrases</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">I'd like to talk about [topic] — it happened about [time] ago.</div>
      <div class="lesson-pattern-sentence">What made it particularly [adjective] was [specific event].</div>
      <div class="lesson-pattern-sentence">Looking back, I think what I remember most is [reflection].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Specific beats general: one vivid detail is worth three vague ones.</li>
      <li>Keep past tense consistent — switch to present only for reflections.</li>
      <li>Aim for 90 seconds; stop naturally before the 2-minute bell if you finish.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Listing instead of narrating', weak: '"We went to the museum, then we had lunch, then we went to the park, then we had dinner."', strong: '"The highlight was getting to the museum just as it opened — we had the whole Egyptian wing to ourselves for about twenty minutes."', fix: 'Pick one moment and develop it with sensory and emotional detail, rather than listing everything that happened.' },
      { label: 'Running out of content', weak: '(Silence after 40 seconds)', strong: 'Use the arc: add the significance layer ("What I took away from that experience was...") to extend naturally.', fix: 'When you feel you are running out, move to the significance/reflection layer — it always gives you 20-30 more seconds.' },
    ],
    choiceQ: 'Which Part 2 opening best sets up a full 90-second answer?',
    choiceOptions: [
      '"I will talk about a holiday I took."',
      '"I\'d like to describe a trip I took to Vietnam about two years ago with my older sister — it was the first time either of us had been to Southeast Asia."',
      '"Travelling is very important and I have been to many countries in my life."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 gives time, place, companion, and context — four details that set up the rest of the story.',
    choiceWrong: 'Not quite. Option 1 is too vague to develop. Option 3 is a general statement, not a personal story.',
    orderChunks: ['What made the trip memorable', '||', 'was getting completely lost', '||', 'and stumbling on a market we never would have found otherwise.'],
    orderAnswer: 'What made the trip memorable||was getting completely lost||and stumbling on a market we never would have found otherwise.',
    orderCorrect: 'Correct. "What made X [adjective] was [specific event]" is one of the most natural ways to develop a Part 2 narrative.',
    orderWrong: 'Not yet. Start with the topic clause (What made it memorable), then "was" and the specific event, then the result.',
    sortRows: [
      { text: 'The moment I remember most clearly is standing at the top of the hill as the sun set.', target: 'Vivid and specific' },
      { text: 'It was a nice place and we did many things there.', target: 'Vague' },
      { text: 'What struck me was how quiet the streets were at 6am — completely different from home.', target: 'Vivid and specific' },
      { text: 'The food was good and the weather was fine during our trip.', target: 'Vague' },
    ],
    sortCategories: ['Vivid and specific', 'Vague'],
    sortCorrect: 'Correct. Vivid answers include a specific moment, sensory detail, or comparison. Vague answers use general adjectives with no detail.',
    sortWrong: 'Check again. "Standing at the top as the sun set" and "6am quiet streets" are specific sensory moments. "Nice place" and "good food" give the examiner nothing to score.',
    whyText: `IELTS Speaking Part 2 is marked on Fluency and Coherence above all. Running dry at 40 seconds is a fluency failure even if your grammar is perfect. The scene/event/significance arc gives you a reliable structure that fills 90 seconds without rambling — because each layer adds meaning rather than repetition.`,
  },

  'seo-2026-03-25-11-ielts-speaking-ielts-speaking-part-3-argument-depth-technique': {
    intro: `Part 3 questions ask for opinions on abstract social topics. One-sentence answers score Band 5. Band 7 requires you to develop a point — give a reason, add an example or qualification, then reflect on implications.`,
    weak: `"Should governments control social media?" → "Yes, I think so. It can be dangerous."`,
    strong: `"Should governments control social media?" → "To some extent, yes — particularly around data privacy and the spread of demonstrably false information. Without regulation, platforms have little incentive to self-police. That said, heavy-handed censorship creates its own problems, so I think the ideal model is independent oversight rather than direct government control."`,
    analysis: `The strong answer takes a qualified position, gives two specific reasons, raises a counterpoint, and resolves it with a nuanced conclusion — all in under 30 seconds.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The depth formula</p>
    <ol>
      <li><strong>Position:</strong> state your view (qualified is fine).</li>
      <li><strong>Reason:</strong> one specific reason why.</li>
      <li><strong>Evidence or example:</strong> real or plausible illustration.</li>
      <li><strong>Qualification:</strong> when it might not apply, or the opposing risk.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Useful qualifiers</p>
    <ul>
      <li>To some extent... / Up to a point...</li>
      <li>It depends on... / That said...</li>
      <li>In theory... but in practice...</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Depth phrases</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">I think [position], mainly because [reason].</div>
      <div class="lesson-pattern-sentence">Take [example] — it shows that [point].</div>
      <div class="lesson-pattern-sentence">That said, [qualification], which is why I think [resolution].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Never stop at the first sentence — always add a reason.</li>
      <li>One real example is worth more than three vague claims.</li>
      <li>Qualifications show sophistication, not weakness.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Position with no reason', weak: '"Yes, I think governments should control social media."', strong: '"Yes, primarily because platforms currently have no legal obligation to remove dangerous misinformation."', fix: 'Every position statement needs a "because" or "since" immediately after it.' },
      { label: 'Vague example', weak: '"For example, many people have been affected by fake news."', strong: '"For example, during the 2020 vaccine rollout, false safety claims spread faster than official corrections on every major platform."', fix: 'Name a specific event, time period, or group — vague "many people" examples add no score value.' },
    ],
    choiceQ: 'Which Part 3 answer shows the best argument depth?',
    choiceOptions: [
      '"I think technology is good for education because it helps students."',
      '"Technology benefits education mainly by expanding access — a student in a rural area can now reach the same resources as someone at a top university, which was impossible twenty years ago. The risk, though, is that screen-based learning can reduce the kind of collaborative thinking that classrooms develop."',
      '"Some people think technology is good and some people think it is bad for education."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 gives a specific reason, a concrete example, and a qualification — the three marks of Part 3 depth.',
    choiceWrong: 'Not quite. Look for position + specific reason + real example + qualification. Vague claims and both-sides summaries score Band 5.',
    orderChunks: ['I think independent regulation is preferable,', '||', 'mainly because governments have an incentive', '||', 'to suppress criticism rather than protect users.'],
    orderAnswer: 'I think independent regulation is preferable,||mainly because governments have an incentive||to suppress criticism rather than protect users.',
    orderCorrect: 'Correct. Position + "mainly because" + specific reason is the core Part 3 sentence structure.',
    orderWrong: 'Not yet. State the position first, then "mainly because," then the specific reason that makes the position defensible.',
    sortRows: [
      { text: 'I think remote work benefits productivity, mainly because it eliminates commuting time that most workers spend passively.', target: 'Has depth' },
      { text: 'Remote work is good because people can work from home.', target: 'No depth' },
      { text: 'That said, isolation is a real risk, which is why hybrid models seem more sustainable long-term.', target: 'Has depth' },
      { text: 'But there are also some disadvantages that people should think about.', target: 'No depth' },
    ],
    sortCategories: ['Has depth', 'No depth'],
    sortCorrect: 'Correct. Depth means a specific reason or qualification. Circular statements ("good because good") and vague references ("some disadvantages") add nothing.',
    sortWrong: 'Check again. Depth requires specificity: name the reason, the group affected, or the condition. Vague claims are not depth.',
    whyText: `Part 3 is where Band 7 and Band 8 are separated. The examiner is explicitly assessing your ability to express and justify opinions. One-sentence answers can score fluency marks but miss Lexical Resource and Grammatical Range marks that only appear when you sustain a longer, structured argument.`,
  },

  'seo-2026-03-25-12-ielts-speaking-ielts-fluency-and-coherence-repair-methods': {
    intro: `Fluency is not about speaking without stopping — it is about recovering smoothly when you do stop. Natural speakers pause, self-correct, and reformulate constantly. What separates Band 6 from Band 7 is whether those repairs sound deliberate and controlled or panicked and disjointed.`,
    weak: `"Um... I think... um... the... um... government... should... uh... do something about... uh... the environment."`,
    strong: `"I think governments have a responsibility here — or rather, a shared responsibility with industry, because you can't expect individual behaviour change without systemic incentives."`,
    analysis: `The strong answer uses "or rather" to self-correct smoothly, then extends with a qualification. The brief pause before "or rather" sounds like thinking, not hesitation.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Five repair phrases</p>
    <ul>
      <li><strong>Self-correction:</strong> "or rather," "what I mean is," "actually, to be more precise"</li>
      <li><strong>Buying time:</strong> "That's an interesting question," "Let me think about that for a second"</li>
      <li><strong>Reformulation:</strong> "In other words," "To put it another way"</li>
      <li><strong>Extension:</strong> "and what's more," "beyond that," "what's particularly relevant is"</li>
      <li><strong>Return:</strong> "Anyway, coming back to the main point"</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When to use each</p>
    <ul>
      <li>You said something imprecise: use self-correction (or rather).</li>
      <li>You need a moment: use a filler phrase (That's a good question to consider).</li>
      <li>You've gone off-track: use return (anyway, back to the point).</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">In practice</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">It's mostly beneficial — <strong>or rather,</strong> beneficial when implemented carefully.</div>
      <div class="lesson-pattern-sentence"><strong>What I mean is,</strong> the policy works in theory but fails in application.</div>
      <div class="lesson-pattern-sentence"><strong>To put it another way,</strong> cost is the main barrier, not willingness.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>One "um" or "uh" is fine; four in a row signals anxiety to the examiner.</li>
      <li>Repair phrases must be followed by actual content — they buy time, not replace it.</li>
      <li>A deliberate pause (2 seconds) sounds more natural than a chain of fillers.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Filler chain with no follow-up', weak: '"Um, well, you know, it\'s kind of, um, I think it\'s, um, complicated."', strong: '"That\'s a nuanced question — I think the answer depends on whether we\'re talking about short-term or long-term impact."', fix: 'Replace the filler chain with one deliberate pause and a real repair phrase followed by content.' },
      { label: 'Stopping mid-sentence', weak: '"The government should... [long silence] ...do things."', strong: '"The government should — or rather, governments at all levels should — coordinate a unified response."', fix: 'Use "or rather" or "what I mean is" to redirect rather than leaving a dead silence.' },
    ],
    choiceQ: 'Which response uses repair language most effectively?',
    choiceOptions: [
      '"Um, I think, um, technology is, um, good for, um, the environment."',
      '"Technology helps the environment — or rather, certain technologies do, particularly in the energy sector."',
      '"Technology is good. It is very helpful. Many people use it."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Or rather" smoothly narrows an overstatement and adds precision — exactly what Band 7 repair looks like.',
    choiceWrong: 'Not quite. Filler chains (um, um, um) score Band 5. Repetitive simple sentences lack fluency range. Look for the controlled self-correction.',
    orderChunks: ['I think education is the key —', '||', 'or rather, early education,', '||', 'before attitudes become fixed.'],
    orderAnswer: 'I think education is the key —||or rather, early education,||before attitudes become fixed.',
    orderCorrect: 'Correct. Initial claim + "or rather" self-correction + specification is a natural and fluent repair pattern.',
    orderWrong: 'Not yet. The initial claim comes first, then the repair signal (or rather), then the more precise version.',
    sortRows: [
      { text: 'What I mean is, the real barrier is cost, not lack of awareness.', target: 'Controlled repair' },
      { text: 'Um, well, people, um, they don\'t, um, like changes.', target: 'Uncontrolled filler' },
      { text: 'To put it another way, policy without enforcement is just a statement of intent.', target: 'Controlled repair' },
      { text: 'You know, it\'s like, um, complicated, I think, yeah.', target: 'Uncontrolled filler' },
    ],
    sortCategories: ['Controlled repair', 'Uncontrolled filler'],
    sortCorrect: 'Correct. Controlled repair uses deliberate phrases (What I mean is, To put it another way) followed by clear content. Fillers delay without delivering.',
    sortWrong: 'Check again. Repair phrases followed by a clear point = controlled. Multiple um/uh/you know with no clear point = uncontrolled filler.',
    whyText: `Fluency and Coherence is one of four equal IELTS Speaking criteria. The Band 7 descriptor says "some hesitation but mostly able to maintain flow." Repair phrases are what maintain flow when hesitation occurs. Without them, hesitation becomes a stall, which drops Fluency to Band 5-6.`,
  },

  'seo-2026-03-25-13-ielts-speaking-ielts-pronunciation-clarity-for-band-7': {
    intro: `Band 7 pronunciation does not mean a native accent — it means consistent clarity. Examiners listen for word stress, sentence stress, and whether your spoken output requires effort to understand. The three highest-impact areas are word stress placement, final consonant clarity, and sentence rhythm.`,
    weak: `"pho-TO-graph-y" (stress on second syllable) / dropping final -ed: "I walk to work" instead of "I walked to work"`,
    strong: `"pho-TOG-ra-phy" (correct stress on second syllable) / clear -ed endings: "I walked" / "it developed" / "they introduced"`,
    analysis: `Word stress errors make familiar words unrecognisable. Final consonant drops change grammatical meaning (past vs present). Both are high-frequency errors that drag pronunciation scores below Band 6.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Three priority areas</p>
    <ul>
      <li><strong>Word stress:</strong> place stress on the correct syllable of academic words (pho-TOG-ra-phy, e-CO-no-my, u-NI-ver-si-ty).</li>
      <li><strong>Final consonants:</strong> pronounce -ed, -t, -d, -s clearly — they carry grammatical meaning.</li>
      <li><strong>Sentence stress:</strong> stress content words (nouns, verbs, adjectives) and reduce function words (a, the, of, to).</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Common stress errors</p>
    <ul>
      <li>pho-TO-graph → pho-TOG-ra-phy (noun shifts stress)</li>
      <li>ECO-no-my → e-CON-o-my</li>
      <li>AD-ver-tise → ad-VER-tise-ment</li>
      <li>po-LIT-ic → POL-i-tics</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Sentence stress pattern</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence"><strong>GOV-ern-ments</strong> should <strong>IN-vest</strong> in <strong>PUB-lic</strong> trans<strong>PORT</strong>.</div>
      <div class="lesson-pattern-sentence">Stressed: Governments, invest, public, transport. Reduced: should, in.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Record yourself and listen back — you cannot self-monitor in real time.</li>
      <li>Slow down for important words; speed is not fluency.</li>
      <li>Clarity beats accent — a clear L1 accent with correct stress scores Band 7.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Wrong syllable stress on academic words', weak: '"The e-CO-no-my of the country..."', strong: '"The e-CON-o-my of the country..."', fix: 'Learn the stressed syllable as part of the word — mark it when you note new vocabulary.' },
      { label: 'Dropping final -ed', weak: '"The government introduce a new policy last year."', strong: '"The government introduced a new policy last year."', fix: '-ed after voiceless consonants = /t/ (walked); after voiced consonants = /d/ (developed). Practise both sounds.' },
    ],
    choiceQ: 'Which sentence has correct word stress placement for all underlined words?',
    choiceOptions: [
      '"The pho-TO-graph-y course improved my tech-NI-cal skills."',
      '"The pho-TOG-ra-phy course improved my TECH-ni-cal skills."',
      '"The PHO-to-graph-y course improved my tech-ni-CAL skills."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. pho-TOG-ra-phy and TECH-ni-cal are both correctly stressed.',
    choiceWrong: 'Not quite. In English, word stress follows patterns: -graphy words stress the syllable before the suffix; TECH-ni-cal stresses the first syllable.',
    orderChunks: ['The ECON-o-my', '||', 'has grown sig-NIF-i-cant-ly', '||', 'since the RE-forms were in-TRO-duced.'],
    orderAnswer: 'The ECON-o-my||has grown sig-NIF-i-cant-ly||since the RE-forms were in-TRO-duced.',
    orderCorrect: 'Correct. Sentence stress falls on content words: economy, grown, significantly, reforms, introduced.',
    orderWrong: 'Not yet. In English sentences, nouns and main verbs carry the primary stress. Function words (the, has, since, were) are reduced.',
    sortRows: [
      { text: 'e-CON-o-my', target: 'Correct stress' },
      { text: 'e-CO-no-my', target: 'Wrong stress' },
      { text: 'pho-TOG-ra-phy', target: 'Correct stress' },
      { text: 'PHO-to-graph-y', target: 'Wrong stress' },
    ],
    sortCategories: ['Correct stress', 'Wrong stress'],
    sortCorrect: 'Correct. e-CON-o-my and pho-TOG-ra-phy place stress on the syllable before the suffix — standard in English.',
    sortWrong: 'Check again. Stress shifts when suffixes (-phy, -my, -tion) are added. The stressed syllable is usually the one immediately before the suffix.',
    whyText: `Pronunciation contributes 25% of your IELTS Speaking score. Band 7 requires that your speech is "generally easy to understand" with "some mispronunciations." Word stress errors are the most common reason listeners struggle to understand, because they make familiar words unrecognisable. Fixing the top 20 academic word stress patterns has a disproportionate impact on this criterion.`,
  },

  'seo-2026-03-25-14-ielts-speaking-ielts-speaking-grammar-range-without-risk': {
    intro: `Grammatical Range and Accuracy rewards variety — but only accurate variety. Using complex structures incorrectly scores lower than using simple structures correctly. The strategy is to build a small set of reliable complex structures and use them deliberately.`,
    weak: `"I think working from home is good because people can relax. It is also cheaper. People do not need to travel."`,
    strong: `"Working from home tends to improve wellbeing, primarily because it eliminates the daily commute, which many employees find more stressful than the work itself."`,
    analysis: `The strong version uses: a gerund subject (Working from home), a degree adverb (primarily), a relative clause (which many employees find), and a comparative (more stressful than). All four are accurate — that is what makes it Band 7.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Four reliable complex structures</p>
    <ul>
      <li><strong>Non-defining relative clause:</strong> "..., which is particularly important for..."</li>
      <li><strong>Gerund subject:</strong> "Reducing emissions requires..."</li>
      <li><strong>Conditional:</strong> "If governments invested more, the impact would be..."</li>
      <li><strong>Participle phrase:</strong> "Having lived abroad, I understand how..."</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When to deploy each</p>
    <ul>
      <li>Adding information: relative clause (which/where/who).</li>
      <li>Introducing a topic: gerund subject.</li>
      <li>Speculating: conditional (if/would).</li>
      <li>Personal experience: participle phrase (Having + past participle).</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Model sentences</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Remote work <strong>has become increasingly common</strong>, which has changed how teams collaborate.</div>
      <div class="lesson-pattern-sentence"><strong>Addressing inequality</strong> requires both policy change and cultural shift.</div>
      <div class="lesson-pattern-sentence"><strong>If the government reduced tuition fees</strong>, more students would complete university.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>One complex structure per answer is enough — do not stack them artificially.</li>
      <li>If you are unsure of a structure, use a simpler one accurately.</li>
      <li>Accuracy matters more than complexity at every band level.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Inaccurate complex structure', weak: '"Working from home, it is very good because employees they can relax more."', strong: '"Working from home tends to improve wellbeing, as employees can manage their own time."', fix: 'Remove the pronoun echo ("it is," "they can") after a gerund subject — the gerund is already the subject.' },
      { label: 'All simple sentences', weak: '"The environment is important. We should protect it. Everyone should help."', strong: '"Protecting the environment is a collective responsibility, which means governments, businesses, and individuals must each play a role."', fix: 'Link at least two of your simple sentences with a relative clause or participle — it shows range without risk.' },
    ],
    choiceQ: 'Which sentence demonstrates the best grammatical range?',
    choiceOptions: [
      '"Technology is good. It helps people. It is also fast."',
      '"Adopting new technology can be disruptive in the short term, though the long-term benefits typically outweigh the adjustment costs."',
      '"If people they use technology more, it will be very helpful for all the society."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses a gerund subject, a concession (though), and a comparison (outweigh) — all accurately.',
    choiceWrong: 'Not quite. Option 1 is simple but accurate; Option 3 has a pronoun echo error (people they). Accurate complexity beats inaccurate complexity.',
    orderChunks: ['Reducing carbon emissions', '||', 'requires international cooperation,', '||', 'which no single government can achieve alone.'],
    orderAnswer: 'Reducing carbon emissions||requires international cooperation,||which no single government can achieve alone.',
    orderCorrect: 'Correct. Gerund subject + main clause + non-defining relative clause is one of the cleanest Band 7 sentence structures.',
    orderWrong: 'Not yet. Start with the gerund subject (Reducing...), then the main verb (requires), then the relative clause (which...) to add information.',
    sortRows: [
      { text: 'Addressing poverty requires both economic growth and targeted redistribution.', target: 'Complex and accurate' },
      { text: 'Poverty it is a big problem and governments they should fix it.', target: 'Inaccurate complex' },
      { text: 'If tuition fees were reduced, more students from low-income families would attend university.', target: 'Complex and accurate' },
      { text: 'If the government will reduce fees, students they can study more easily.', target: 'Inaccurate complex' },
    ],
    sortCategories: ['Complex and accurate', 'Inaccurate complex'],
    sortCorrect: 'Correct. Pronoun echoes (it is, they should) and wrong conditional tense (will reduce in an if-clause) are the two most common inaccurate complex patterns.',
    sortWrong: 'Check again. "It is" after a gerund subject and "will" in a second conditional if-clause are both grammatical errors that reduce the score.',
    whyText: `Grammatical Range and Accuracy is 25% of your Speaking score. Band 7 requires "a variety of complex structures with some flexibility." Using four reliable structures accurately delivers this — attempting ten structures inaccurately does not. Quality of complexity beats quantity.`,
  },

  'seo-2026-03-25-15-ielts-reading-ielts-reading-true-false-not-given-logic': {
    intro: `True/False/Not Given is the question type most candidates find hardest — not because the reading is difficult, but because the logic is strict. True means the text explicitly confirms the statement. False means the text explicitly contradicts it. Not Given means the text says nothing about it either way.`,
    weak: `Treating "Not Given" as "False" when the text simply doesn't mention something — a very common error that costs 2-3 marks per test.`,
    strong: `Applying a three-step check: (1) locate the relevant part of the text, (2) compare the statement and text word-for-word, (3) ask "does the text contradict this, or just not mention it?"`,
    analysis: `The key distinction: False requires explicit contradiction. If the text mentions Topic A but says nothing about the claim in the question, the answer is Not Given, not False.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The strict definitions</p>
    <ul>
      <li><strong>True:</strong> the passage explicitly states or clearly implies this is correct.</li>
      <li><strong>False:</strong> the passage explicitly states the opposite.</li>
      <li><strong>Not Given:</strong> the passage does not address this claim at all.</li>
    </ul>
    <p>The trap: a statement can be about the same topic as the passage but still be Not Given if the specific claim is never addressed.</p>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Warning signs</p>
    <ul>
      <li>The question uses a word that appears in the text but in a different context → likely Not Given.</li>
      <li>The question adds a comparison the text never makes → likely Not Given.</li>
      <li>The question says "always" or "never" and the text says "often" or "rarely" → likely False.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Decision process</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Find the topic in the text → read the relevant sentence(s) → compare with the statement.</div>
      <div class="lesson-pattern-sentence">If the text says the opposite → False.</div>
      <div class="lesson-pattern-sentence">If the text says nothing about this specific claim → Not Given.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Do not use your own knowledge — only what the text says.</li>
      <li>Not Given is not "I can't find it" — it means the text genuinely does not address it.</li>
      <li>When unsure between False and Not Given, ask: does the text say the opposite?</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Marking Not Given as False', weak: 'Text says: "Bees pollinate 70% of crops." Statement: "Bees are the only pollinators of crops." Answer given: False.', strong: 'Correct answer: Not Given. The text says bees pollinate 70% of crops but never says they are the only pollinators.', fix: 'False requires an explicit contradiction. The text not mentioning other pollinators is not the same as saying bees are the only ones.' },
      { label: 'Using outside knowledge', weak: 'Text: silent on whether coffee was first cultivated in Ethiopia. Statement: "Coffee originated in Ethiopia." Answer given: True (because the candidate knows this).', strong: 'Correct answer: Not Given — the text says nothing about coffee\'s origin.', fix: 'IELTS True/False/Not Given is based entirely on the passage. External knowledge is a trap.' },
    ],
    choiceQ: 'Text says: "The city\'s population grew by 12% between 2000 and 2010." Statement: "The city\'s population declined after 2010." What is the answer?',
    choiceOptions: ['True', 'False', 'Not Given'],
    choiceAnswer: 2,
    choiceCorrect: 'Correct. The text only covers 2000-2010. What happened after 2010 is Not Given — the text says nothing about it.',
    choiceWrong: 'Not quite. The text only states growth between 2000 and 2010. It says nothing about what happened after 2010, so this is Not Given, not False.',
    orderChunks: ['Locate the topic in the passage', '||', 'compare statement and text word by word', '||', 'then decide: opposite = False, silent = Not Given.'],
    orderAnswer: 'Locate the topic in the passage||compare statement and text word by word||then decide: opposite = False, silent = Not Given.',
    orderCorrect: 'Correct. This three-step process is the reliable decision method for every T/F/NG question.',
    orderWrong: 'Not yet. Locate first, then compare, then apply the False/Not Given rule last.',
    sortRows: [
      { text: 'Text says X; statement says X → True', target: 'Clear logic' },
      { text: 'Text says X is common; statement says X is rare → False', target: 'Clear logic' },
      { text: 'Text discusses topic Y; statement makes a claim about Y not in the text → Not Given', target: 'Clear logic' },
      { text: 'I know from general knowledge that this is true → True', target: 'Wrong approach' },
    ],
    sortCategories: ['Clear logic', 'Wrong approach'],
    sortCorrect: 'Correct. True/False/Not Given is based only on the text. General knowledge is always the wrong approach.',
    sortWrong: 'Check again. All answers must come from the text. Using outside knowledge is the most common error in this question type.',
    whyText: `True/False/Not Given questions appear in every IELTS Academic and General reading test, usually 5-7 questions worth 5-7 marks. Candidates who confuse Not Given with False typically lose 2-3 marks per test on this question type alone. The logic is learnable and consistent — mastering it adds guaranteed marks.`,
  },

  'seo-2026-03-25-16-ielts-reading-ielts-matching-headings-fast-scan-method': {
    intro: `Matching Headings asks you to choose the best heading for each paragraph from a list of options. The most common mistake is reading every paragraph fully — which wastes time. The fast scan method: read the first sentence and last sentence of each paragraph only, then match.`,
    weak: `Reading every word of every paragraph before attempting to match — running out of time on later questions as a result.`,
    strong: `Reading the first and last sentence of each paragraph to identify the main idea, then matching that idea to a heading — average 45 seconds per paragraph.`,
    analysis: `First sentences introduce the main idea; last sentences often summarise or conclude it. Together they reveal the paragraph's function without requiring a full read.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The scan method</p>
    <ol>
      <li>Read the heading list first — understand all options before reading the text.</li>
      <li>For each paragraph: read sentence 1 and sentence 2 (or last).</li>
      <li>Ask: what is this paragraph mainly about — a problem, a solution, an example, a statistic?</li>
      <li>Match to the heading that covers the paragraph's function, not just one word in it.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Heading vs paragraph mismatch traps</p>
    <ul>
      <li>A heading word appears in the paragraph but covers only one sentence → wrong heading.</li>
      <li>The correct heading covers the whole paragraph's purpose, not just a detail.</li>
      <li>Paragraphs that give examples are headed with "An illustration of..." not the topic name.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Paragraph function signals</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Starts with a problem → look for "Challenges facing..." heading.</div>
      <div class="lesson-pattern-sentence">Starts with a statistic → look for "Evidence of..." or "The scale of..." heading.</div>
      <div class="lesson-pattern-sentence">Starts with a historical claim → look for "Origins of..." or "The development of..." heading.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Do not use a heading just because its words appear in the paragraph.</li>
      <li>Eliminate clearly wrong options first to reduce the choice set.</li>
      <li>Spend no more than 60 seconds per paragraph — move on and return.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Matching a word, not the paragraph function', weak: 'Paragraph discusses cost as one factor among five. Heading says "The cost of X." Candidate chooses it because "cost" appears.', strong: 'The heading "Factors affecting X" covers the whole paragraph. "The cost of X" covers only one detail.', fix: 'Ask: does this heading cover what the whole paragraph is doing, or just one sentence?' },
      { label: 'Reading every sentence', weak: 'Full read of 8 paragraphs = 12+ minutes on matching headings alone.', strong: 'First + last sentence scan = 6-7 minutes, leaving time for the rest of the section.', fix: 'Cap your reading at the first two sentences per paragraph. Only return to read the middle if the match is unclear.' },
    ],
    choiceQ: 'A paragraph opens: "The first domesticated animals appeared in the Middle East around 10,000 BCE, long before the development of written language." Which heading fits best?',
    choiceOptions: ['The role of animals in early trade', 'The origins of animal domestication', 'Problems faced by early farmers'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. The first sentence signals "origins" and "early history" — "The origins of animal domestication" covers the paragraph\'s function.',
    choiceWrong: 'Not quite. The opening sentence signals a historical origin claim. Look for the heading about when/how something began, not what it was used for.',
    orderChunks: ['Read the headings list first,', '||', 'then scan paragraph openings,', '||', 'then match function — not just keywords.'],
    orderAnswer: 'Read the headings list first,||then scan paragraph openings,||then match function — not just keywords.',
    orderCorrect: 'Correct. Headings first, then scan, then function-match is the sequence that saves time and avoids keyword traps.',
    orderWrong: 'Not yet. Always read the headings before the text — it tells you what to look for when you scan.',
    sortRows: [
      { text: 'Match the heading because its main word appears in the paragraph.', target: 'Risky approach' },
      { text: 'Match the heading that best describes what the whole paragraph is doing.', target: 'Reliable approach' },
      { text: 'Read every sentence of every paragraph before choosing.', target: 'Risky approach' },
      { text: 'Scan the first and last sentence, then match to heading function.', target: 'Reliable approach' },
    ],
    sortCategories: ['Reliable approach', 'Risky approach'],
    sortCorrect: 'Correct. Function-matching and scanning are reliable. Keyword-matching and full-reading are slow and trap-prone.',
    sortWrong: 'Check again. Keyword matching is the #1 trap in Matching Headings. Function matching — what is the whole paragraph doing — is the reliable method.',
    whyText: `Matching Headings is worth 5-6 marks per test and is time-intensive. Candidates who read fully run out of time; those who keyword-match fall into the distractor trap. The scan-and-function method cuts time to 45-60 seconds per paragraph while avoiding both failure modes.`,
  },

  'seo-2026-03-25-17-ielts-reading-ielts-sentence-completion-precision-skills': {
    intro: `Sentence completion requires you to find a word or words from the passage that complete a sentence. The answer is almost always a direct lift from the text — your job is to find the right section and identify exactly which words fit grammatically and semantically.`,
    weak: `Paraphrasing the answer in your own words, or taking too many words from the passage.`,
    strong: `Finding the relevant section using keywords from the incomplete sentence, then identifying the exact word(s) that complete it grammatically within the word limit.`,
    analysis: `The word limit ("NO MORE THAN TWO WORDS") is strict. One extra word = wrong answer. Always count before writing.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The three-step method</p>
    <ol>
      <li><strong>Identify the gap type:</strong> what part of speech is missing? (noun, verb, adjective, number)</li>
      <li><strong>Locate in the text:</strong> use the non-gap words as search keywords.</li>
      <li><strong>Extract exactly:</strong> copy the word(s) from the text — do not paraphrase.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Gap type clues</p>
    <ul>
      <li>After "a/an" → singular noun.</li>
      <li>After "to" → verb (infinitive).</li>
      <li>After "very/extremely" → adjective or adverb.</li>
      <li>Before "of/in/at" → noun or noun phrase.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Word limit check</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Limit is ONE WORD: "reduction" not "a reduction" or "significant reduction."</div>
      <div class="lesson-pattern-sentence">Limit is TWO WORDS: "rapid growth" is fine; "a period of rapid growth" is not.</div>
      <div class="lesson-pattern-sentence">Numbers count as one word: "200" = one word; "200 million" = two words.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Always write the answer from the text — never paraphrase.</li>
      <li>Count your words — every time, without exception.</li>
      <li>Articles (a, an, the) count as words — include them only if grammatically required.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Exceeding word limit', weak: 'Limit: ONE WORD. Text says "significant decline." Candidate writes: "a significant decline" (3 words).', strong: 'Correct answer: "decline" — the adjective and article are within the gap context already.', fix: 'Reread the sentence with your answer inserted. Count words. If over limit, reduce to the core noun or verb.' },
      { label: 'Paraphrasing the answer', weak: 'Text says "decreased." Candidate writes "went down" (their own words).', strong: 'Correct answer: "decreased" — take it directly from the text.', fix: 'Sentence completion answers are always a direct lift. Synonyms from your own vocabulary are wrong.' },
    ],
    choiceQ: 'The gap reads: "Scientists discovered that the temperature _____ by 2 degrees." Text says: "...researchers found the temperature had fallen by approximately 2 degrees." What is the correct ONE WORD answer?',
    choiceOptions: ['had fallen', 'fallen', 'decreased'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Fallen" is one word and completes the sentence grammatically as a past participle after "had."',
    choiceWrong: 'Not quite. "Had fallen" is two words (exceeds ONE WORD limit). "Decreased" is a synonym not from the text. "Fallen" is one word directly from the text.',
    orderChunks: ['Identify the gap type,', '||', 'locate it in the text with keywords,', '||', 'then extract exact words within the limit.'],
    orderAnswer: 'Identify the gap type,||locate it in the text with keywords,||then extract exact words within the limit.',
    orderCorrect: 'Correct. Gap type first, locate second, extract third — in that order every time.',
    orderWrong: 'Not yet. You need to know what part of speech you are looking for before scanning, or you will not recognise the answer when you see it.',
    sortRows: [
      { text: 'Copy the exact word(s) from the passage into the gap.', target: 'Correct method' },
      { text: 'Use a synonym if the passage word sounds too simple.', target: 'Wrong method' },
      { text: 'Count the words in your answer before writing it.', target: 'Correct method' },
      { text: 'Write the full phrase from the text even if it exceeds the limit.', target: 'Wrong method' },
    ],
    sortCategories: ['Correct method', 'Wrong method'],
    sortCorrect: 'Correct. Direct lift and word count check are the two non-negotiable steps. Synonyms and exceeding limits both score zero.',
    sortWrong: 'Check again. Sentence completion answers must come from the text and stay within the word limit. Both rules apply on every question.',
    whyText: `Sentence completion is among the most mark-dense question types in IELTS Reading. Exceeding the word limit by even one word scores zero — a completely avoidable loss. Candidates who practise counting words before writing and lifting directly from the text consistently outperform those who rely on memory of what they read.`,
  },

  'seo-2026-03-25-18-ielts-reading-ielts-reading-time-management-for-40-questions': {
    intro: `IELTS Academic Reading gives you 60 minutes for 40 questions across three passages. That is 90 seconds per question — including reading time. Most candidates run out of time on passage 3. The fix is a strict time allocation and a skip-and-return rule.`,
    weak: `Spending 28 minutes on passage 1 because it was interesting, leaving 16 minutes for passages 2 and 3 combined.`,
    strong: `Allocating 17 minutes to passage 1, 20 minutes to passage 2, 23 minutes to passage 3 — because difficulty increases — and using the remaining 60 seconds to fill any blanks.`,
    analysis: `Passage 3 is the hardest and worth the same marks as passages 1 and 2. Over-investing in earlier passages is the most common structural mistake in IELTS Reading.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Time allocation</p>
    <ul>
      <li><strong>Passage 1:</strong> 17 minutes (easiest, fewest marks to leave behind).</li>
      <li><strong>Passage 2:</strong> 20 minutes (mid-difficulty).</li>
      <li><strong>Passage 3:</strong> 23 minutes (hardest — needs most time).</li>
      <li>Move on when time is up, even with questions unanswered.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">The skip-and-return rule</p>
    <ul>
      <li>If a question takes more than 90 seconds: mark it, skip it, continue.</li>
      <li>Return only if you have time left after completing all other questions in that passage.</li>
      <li>Never leave a blank — guess if needed (no penalty for wrong answers).</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Within each passage</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Read the questions first → skim the passage for structure → answer in order → skip if stuck → return.</div>
      <div class="lesson-pattern-sentence">Do not re-read the whole passage for each question — locate the relevant paragraph using keywords.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Wear a watch or keep the on-screen timer visible.</li>
      <li>Note your start time for each passage before reading.</li>
      <li>Questions are often in passage order — use this to navigate quickly.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Equal time per passage', weak: 'Spending 20 minutes on each passage regardless of difficulty.', strong: 'Giving passage 3 the most time (23 min) because it is the hardest and worth the same marks.', fix: 'Allocate inversely to ease: easiest passage gets least time because you can score faster there.' },
      { label: 'Re-reading the full passage for each question', weak: 'Reading the entire passage again when you cannot find the answer.', strong: 'Using the question\'s keywords to scan for the relevant paragraph only.', fix: 'Questions give you search terms. Use them to locate the right paragraph rather than rereading everything.' },
    ],
    choiceQ: 'You have 4 minutes left and 6 questions remaining in passage 3. What is the best strategy?',
    choiceOptions: ['Read every sentence carefully to find the perfect answer.', 'Scan each question quickly, answer what you can, guess the rest before time is up.', 'Skip all 6 and use the time to check passage 1 answers.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Quick scanning with best-guess answers for hard questions beats leaving blanks. There is no penalty for wrong answers.',
    choiceWrong: 'Not quite. Option 1 will leave blanks. Option 3 wastes time on already-answered questions. Scan + best guess covers all questions in the time.',
    orderChunks: ['Read the questions first,', '||', 'skim the passage for structure,', '||', 'then locate answers using keywords — do not re-read in full.'],
    orderAnswer: 'Read the questions first,||skim the passage for structure,||then locate answers using keywords — do not re-read in full.',
    orderCorrect: 'Correct. Questions first tells you what to look for; structure skim gives you a map; keyword scanning finds the answer efficiently.',
    orderWrong: 'Not yet. Reading questions before the passage is the essential first step — without it, you have no search terms to guide your scan.',
    sortRows: [
      { text: 'Move to the next passage when your allocated time ends, even with questions unanswered.', target: 'Good time management' },
      { text: 'Stay on passage 1 until every question is answered before moving on.', target: 'Poor time management' },
      { text: 'Guess any blank question rather than leaving it empty.', target: 'Good time management' },
      { text: 'Re-read the entire passage when you cannot find an answer to one question.', target: 'Poor time management' },
    ],
    sortCategories: ['Good time management', 'Poor time management'],
    sortCorrect: 'Correct. Moving on at the time limit and guessing blanks are both optimal. Staying on one passage and re-reading in full both waste time.',
    sortWrong: 'Check again. IELTS Reading has no penalty for wrong answers — guessing is always better than leaving blank. Staying on passage 1 too long is the most common reading failure mode.',
    whyText: `Time management is the single most controllable variable in IELTS Reading. Candidates with strong English who run out of time score Band 6.5; the same candidates with a strict time plan score Band 7.5. The allocation (17/20/23) and skip-and-return rule eliminate the most common structural failure: sacrificing passage 3 marks for passage 1 certainty.`,
  },

  'seo-2026-03-25-19-ielts-reading-ielts-multiple-choice-elimination-strategy': {
    intro: `Multiple choice in IELTS Reading has one correct answer and three distractors. Distractors are carefully designed to look plausible. The most reliable approach is elimination: rule out three wrong options rather than searching for the right one.`,
    weak: `Reading all options and choosing the one that "sounds right" from memory.`,
    strong: `Finding the relevant section of the text, then testing each option against what the text explicitly says, eliminating options that contradict, exaggerate, or are not mentioned.`,
    analysis: `Four types of distractor: (1) True in the text but not an answer to the question asked. (2) Contradicts the text. (3) Exaggerates what the text says. (4) Not mentioned at all. Identifying the type helps you eliminate faster.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The four distractor types</p>
    <ul>
      <li><strong>Wrong scope:</strong> True in the text but answers a different question.</li>
      <li><strong>Contradiction:</strong> directly contradicts the passage.</li>
      <li><strong>Exaggeration:</strong> the text says "often" but the option says "always."</li>
      <li><strong>Not mentioned:</strong> plausible but absent from the text.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Elimination order</p>
    <ol>
      <li>Locate the relevant paragraph using the question stem keywords.</li>
      <li>Eliminate the option that directly contradicts the text.</li>
      <li>Eliminate the option with an exaggeration word (always, never, only, all).</li>
      <li>Check the remaining options for scope — which one answers the specific question asked?</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Distractor signals</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">"always," "never," "only," "completely" → likely exaggeration distractor.</div>
      <div class="lesson-pattern-sentence">An option using the same noun as the question but a different verb → check scope.</div>
      <div class="lesson-pattern-sentence">A plausible option using words not in the relevant paragraph → likely not mentioned.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Always return to the text — never answer from memory.</li>
      <li>The correct answer paraphrases the text; it rarely uses the exact same words.</li>
      <li>If two options both seem right, ask: which one the question is specifically asking about.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Choosing by familiarity', weak: 'Choosing the option that contains words from the passage, regardless of meaning.', strong: 'Testing each option against the specific claim in the passage — the correct answer paraphrases, not quotes.', fix: 'Return to the text for every option. Familiar-sounding words are the distractor designer\'s main tool.' },
      { label: 'Ignoring the question stem', weak: '"Which factor most influenced X?" — candidate chooses an option about Y because Y is discussed at length in the passage.', strong: 'The answer must address the specific factor asked about, even if other factors get more text space.', fix: 'Re-read the question stem before checking each option to keep the scope clear.' },
    ],
    choiceQ: 'Text: "Solar panels became affordable for most households by 2015, though installation costs remained a barrier in rural areas." Which statement is TRUE?',
    choiceOptions: ['Solar panels became affordable for all households by 2015.', 'Solar panels were affordable for most households by 2015, but installation costs were still a problem in some areas.', 'Solar panels have always been affordable for rural households.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 accurately paraphrases "most households" and "rural areas" without exaggerating.',
    choiceWrong: 'Not quite. Option 1 says "all" — the text says "most." Option 3 says "always" and "rural" — the text says installation cost remained a barrier in rural areas. Option 2 matches the text precisely.',
    orderChunks: ['Locate the relevant paragraph,', '||', 'eliminate the contradiction and exaggeration,', '||', 'then check remaining options for scope.'],
    orderAnswer: 'Locate the relevant paragraph,||eliminate the contradiction and exaggeration,||then check remaining options for scope.',
    orderCorrect: 'Correct. Locate, eliminate, scope-check is the most reliable three-step elimination sequence.',
    orderWrong: 'Not yet. Start with location — without finding the relevant paragraph, you are answering from memory, which is the main failure mode.',
    sortRows: [
      { text: 'The option uses "always" but the text says "usually."', target: 'Exaggeration distractor' },
      { text: 'The option correctly paraphrases the specific sentence that answers the question.', target: 'Correct answer' },
      { text: 'The option is true in the text but answers a different question than the one asked.', target: 'Wrong scope distractor' },
      { text: 'The option sounds plausible but the relevant paragraph never mentions it.', target: 'Not mentioned distractor' },
    ],
    sortCategories: ['Correct answer', 'Exaggeration distractor'],
    sortCorrect: 'Correct. Recognising distractor types helps you eliminate faster. Exaggeration uses absolute words; scope distractors are true but answer the wrong question.',
    sortWrong: 'Check again. "Always/never/only/all" signal exaggeration. A statement that is true but answers the wrong question is a wrong-scope distractor.',
    whyText: `Multiple choice is worth 3-5 marks per IELTS Reading section. Candidates who answer from memory or choose by familiarity consistently score 1-2 marks below their actual reading level. The elimination method — testing every option against the text — is slower in the short term but produces a higher hit rate because it removes the two most common error types (exaggeration and scope mismatch).`,
  },

  'seo-2026-03-25-20-ielts-reading-ielts-paragraph-mapping-for-academic-passages': {
    intro: `Academic Reading passages are long and dense. Paragraph mapping — writing a one-word label next to each paragraph as you skim — gives you a navigable index so you can find answers in 10 seconds instead of rereading the whole passage.`,
    weak: `Reading every paragraph fully during the initial skim, then struggling to remember where specific information was.`,
    strong: `Spending 2-3 minutes labelling each paragraph with one word (e.g., "history," "criticism," "data," "conclusion"), then using those labels to navigate directly to the right paragraph for each question.`,
    analysis: `A paragraph map does not need to be accurate — it just needs to be consistent with how you read. Even an imprecise label reduces your search time dramatically.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">How to build a paragraph map</p>
    <ol>
      <li>Read only the first sentence of each paragraph (15-20 seconds per paragraph).</li>
      <li>Write one word next to the paragraph letter: background / problem / solution / example / data / contrast.</li>
      <li>Use your map to navigate: if the question asks about a solution, go straight to the "solution" paragraph.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Most useful for</p>
    <ul>
      <li>Locating information questions (where in the text is X discussed?).</li>
      <li>Matching features questions (match each person/year to the correct paragraph).</li>
      <li>Any question where you need to find rather than understand.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Sample map labels</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">A: history | B: problem | C: data | D: solution | E: criticism | F: conclusion</div>
      <div class="lesson-pattern-sentence">Question about evidence → go to C (data). Question about objections → go to E (criticism).</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Map in 2 minutes — do not overthink the labels.</li>
      <li>One word is enough; a phrase wastes time.</li>
      <li>Update the map if you discover a paragraph covers something different when answering questions.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Full read during skim', weak: 'Reading every sentence of every paragraph "to understand the passage" before answering questions.', strong: 'First sentence only per paragraph → label → answer questions using the map.', fix: 'Full comprehension comes from answering questions, not from skimming. The skim is only a navigation tool.' },
      { label: 'No map at all', weak: 'Jumping straight to questions without any skim, then rereading the whole passage to find each answer.', strong: 'A 2-minute map saves 4-6 minutes of rereading across 13 questions.', fix: 'Even a rough map (A=start, B=history, C=problem) is faster than no map. Speed of navigation directly determines your score on time-limited reading.' },
    ],
    choiceQ: 'You are building a paragraph map. Paragraph C starts: "Despite these advantages, critics have raised concerns about the long-term environmental impact of lithium mining." What label fits best?',
    choiceOptions: ['advantages', 'criticism', 'lithium'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. The paragraph signals a counterpoint with "Despite" and "critics" — "criticism" or "problem" is the right label.',
    choiceWrong: 'Not quite. "Advantages" is what the paragraph is contrasting against, not what it discusses. "Lithium" is the topic, not the function. "Criticism" captures what the paragraph is doing.',
    orderChunks: ['Skim the first sentence of each paragraph,', '||', 'write a one-word label,', '||', 'then use the map to navigate directly to answers.'],
    orderAnswer: 'Skim the first sentence of each paragraph,||write a one-word label,||then use the map to navigate directly to answers.',
    orderCorrect: 'Correct. Skim, label, navigate — in that order. The label is useless without the navigation step.',
    orderWrong: 'Not yet. The skim comes first to build the map. The map\'s only purpose is faster navigation during question-answering.',
    sortRows: [
      { text: 'Spend 2 minutes labelling paragraphs before answering any questions.', target: 'Efficient approach' },
      { text: 'Read every paragraph fully to make sure you understand everything.', target: 'Inefficient approach' },
      { text: 'Use your label to go directly to the relevant paragraph for each question.', target: 'Efficient approach' },
      { text: 'Reread the entire passage each time you need to find an answer.', target: 'Inefficient approach' },
    ],
    sortCategories: ['Efficient approach', 'Inefficient approach'],
    sortCorrect: 'Correct. Labelling and targeted navigation are efficient. Full reading and full rereading are inefficient in a 60-minute test.',
    sortWrong: 'Check again. The IELTS Reading test rewards navigation speed. Full reads and rerereads cost the most time for the least gain.',
    whyText: `Paragraph mapping converts a long, unfamiliar text into a navigable index in 2 minutes. Candidates who use it reduce their per-question search time from 60+ seconds to 10-15 seconds on locating-type questions. Over 13 questions in one passage, that is 6-8 minutes saved — enough to attempt every question without rushing.`,
  },

  'seo-2026-03-25-21-ielts-listening-ielts-listening-distractor-detection-system': {
    intro: `IELTS Listening uses distractors deliberately: a speaker mentions one answer, then corrects or contradicts it. Candidates who write the first thing they hear get it wrong. The rule is: the final, confirmed answer is the correct one.`,
    weak: `Writing the first number or name you hear because it seems clear.`,
    strong: `Waiting for the speaker to confirm: if they say "it costs £20 — actually, it's £18 now," the answer is £18.`,
    analysis: `Distractors appear in four patterns: correction ("actually"), contradiction ("but"), qualification ("except"), and elimination ("not that one — the other one"). Recognising the pattern tells you to wait.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Four distractor signals</p>
    <ul>
      <li><strong>Correction:</strong> "actually," "in fact," "I mean" — the next word replaces the first.</li>
      <li><strong>Contradiction:</strong> "but," "however," "although" — reverses direction.</li>
      <li><strong>Qualification:</strong> "except," "apart from," "not including."</li>
      <li><strong>Elimination:</strong> "not X, Y" — names the wrong option then names the right one.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">When to hold your pen</p>
    <ul>
      <li>When you hear a number, name, or answer followed immediately by "actually" or "but."</li>
      <li>When two options are mentioned — always write the second (or confirmed) one.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Distractor examples</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">"The price is £25 — actually, it dropped to £22 last week." → Answer: £22</div>
      <div class="lesson-pattern-sentence">"We meet Tuesdays, but actually we moved it to Thursdays." → Answer: Thursday</div>
      <div class="lesson-pattern-sentence">"Turn left — no wait, right at the junction." → Answer: right</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Write in pencil so corrections are easy.</li>
      <li>When two answers are mentioned, wait for the speaker to confirm before writing.</li>
      <li>If you missed the correction, leave the answer blank rather than writing the distractor.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Writing the first answer heard', weak: 'Speaker: "The room costs £45 — actually it\'s £42 with the discount." Candidate writes: £45.', strong: 'Correct: £42. The correction signal "actually" always means: replace what came before.', fix: 'When you hear "actually" or "I mean," cross out what you just wrote and wait for the real answer.' },
      { label: 'Missing the elimination pattern', weak: 'Speaker: "Not the red form — you need the blue one." Candidate writes: red.', strong: 'Correct: blue. "Not X, Y" gives the wrong answer first then the right answer second.', fix: 'When you hear "not X," do not write X. Wait for what comes after the comma.' },
    ],
    choiceQ: 'Speaker says: "The meeting is on the 14th — sorry, I meant the 15th." What do you write?',
    choiceOptions: ['14th', '15th', 'Both dates'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "I meant" is a correction signal — the second date (15th) is the confirmed answer.',
    choiceWrong: 'Not quite. "I meant" signals that everything before it was wrong. The final, corrected answer is always what you write.',
    orderChunks: ['Hear the first answer,', '||', 'listen for a correction signal (actually/I mean/but),', '||', 'then write only the confirmed final answer.'],
    orderAnswer: 'Hear the first answer,||listen for a correction signal (actually/I mean/but),||then write only the confirmed final answer.',
    orderCorrect: 'Correct. First answer + correction signal + write only the final answer is the reliable distractor detection process.',
    orderWrong: 'Not yet. The first answer is a distractor. The correction signal tells you to wait. The confirmed answer is what goes on your answer sheet.',
    sortRows: [
      { text: '"The fee is £30 — actually it\'s now £28." → Write £28.', target: 'Correct response' },
      { text: '"The fee is £30 — actually it\'s now £28." → Write £30.', target: 'Distractor trap' },
      { text: '"Not Tuesday — Thursday." → Write Thursday.', target: 'Correct response' },
      { text: '"Not Tuesday — Thursday." → Write Tuesday.', target: 'Distractor trap' },
    ],
    sortCategories: ['Correct response', 'Distractor trap'],
    sortCorrect: 'Correct. The confirmed answer comes after the correction signal. Writing the first thing heard is the distractor trap.',
    sortWrong: 'Check again. "Actually," "I mean," and "not X" are all correction signals. Everything before them is the distractor.',
    whyText: `Distractors appear in every IELTS Listening section and typically account for 3-5 wrong answers among candidates who do not recognise them. The pattern is consistent: a first answer is offered, then corrected. Candidates who wait for the correction signal before writing lose zero marks to distractors; those who write the first thing they hear lose them consistently.`,
  },

  'seo-2026-03-25-22-ielts-listening-ielts-note-taking-symbols-for-section-speed': {
    intro: `Sections 3 and 4 of IELTS Listening move fast. Writing full words misses the next piece of information. A small set of symbols and abbreviations lets you capture key data in real time without losing track.`,
    weak: `Trying to write every word the speaker says and missing the next sentence as a result.`,
    strong: `Writing abbreviated notes (e.g., "gov → invest more $ in educ bc poverty ↑") and expanding them during the 30-second transfer window.`,
    analysis: `You do not need to understand the whole recording — you need to capture the answer to each question. Symbols replace full words and keep your pen moving.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Core symbol set</p>
    <ul>
      <li>→ causes / leads to / results in</li>
      <li>↑ increases / rises / grows</li>
      <li>↓ decreases / falls / declines</li>
      <li>= equals / is / means</li>
      <li>≠ does not equal / is not / differs from</li>
      <li>bc because / & and / w/ with / w/o without</li>
      <li>$ cost / money / funding | % percentage | # number</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Abbreviation rules</p>
    <ul>
      <li>Drop vowels for long words: government → govt, environment → envt.</li>
      <li>Use first letters for known phrases: public transport → PT, carbon emissions → CE.</li>
      <li>Never abbreviate proper nouns — names and places must be legible.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">In practice</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">"The government increased funding for public transport." → govt ↑ $ PT</div>
      <div class="lesson-pattern-sentence">"Unemployment rose because of automation." → unemploy ↑ bc automation</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Use only symbols you already know — inventing new ones mid-test causes confusion.</li>
      <li>Expand notes into full words on the answer sheet, not in your notes.</li>
      <li>Your notes are for your eyes only — legibility matters only enough for you to read them.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Writing full sentences', weak: 'Writing: "The researcher explained that carbon emissions have increased significantly since industrialisation." and missing the next sentence.', strong: 'Writing: "CE ↑ since industris." and keeping pace with the recording.', fix: 'Any time you write more than 4 words for one idea, you are falling behind. Shift to symbols immediately.' },
      { label: 'Inventing symbols mid-test', weak: 'Creating a new symbol you have never used before, then forgetting what it means when you return to your notes.', strong: 'Using only the 10-symbol set you practised before the test.', fix: 'Practise your symbol set until it is automatic. New symbols under pressure = confusion.' },
    ],
    choiceQ: 'Which set of notes most efficiently captures: "Carbon taxes reduce emissions but increase costs for low-income households"?',
    choiceOptions: [
      'carbon taxes reduce emissions but make things more expensive for poor people',
      'C-tax → CE ↓ but $ ↑ for low-income HH',
      'CT red emiss incr cost poor',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses standard symbols (→, ↓, ↑) and abbreviations (HH=households) to capture all information in minimum space.',
    choiceWrong: 'Not quite. Option 1 is almost full sentences — too slow. Option 3 uses non-standard abbreviations that could be misread later.',
    orderChunks: ['Write abbreviated notes during the recording,', '||', 'use standard symbols (→ ↑ ↓),', '||', 'then expand on the answer sheet during transfer time.'],
    orderAnswer: 'Write abbreviated notes during the recording,||use standard symbols (→ ↑ ↓),||then expand on the answer sheet during transfer time.',
    orderCorrect: 'Correct. Abbreviate while listening, expand when writing your final answer — that is the two-stage process.',
    orderWrong: 'Not yet. Abbreviation during recording and expansion during transfer are separate steps. Never try to write full answers while the recording plays.',
    sortRows: [
      { text: 'govt ↑ $ educ', target: 'Efficient note' },
      { text: 'the government is going to increase spending on education next year', target: 'Too slow' },
      { text: 'unemployment ↓ bc new jobs created', target: 'Efficient note' },
      { text: 'the unemployment rate has decreased because many new jobs were recently created', target: 'Too slow' },
    ],
    sortCategories: ['Efficient note', 'Too slow'],
    sortCorrect: 'Correct. Efficient notes use symbols and abbreviations to stay pace with speech. Full sentences fall behind.',
    sortWrong: 'Check again. If your note has more than 5 words per idea, you are writing too slowly for Sections 3 and 4.',
    whyText: `IELTS Listening Sections 3 and 4 speak at natural academic pace — approximately 150 words per minute. Writing full words at that speed means missing 30-40% of content. A practised 10-symbol set reduces your writing time per idea from 4 seconds to 1 second, keeping you in sync with the recording throughout.`,
  },

  'seo-2026-03-25-23-ielts-listening-ielts-map-and-diagram-listening-strategy': {
    intro: `Map and diagram questions require you to match spoken directions or descriptions to a visual. They test spatial vocabulary and the ability to track movement — left, right, opposite, between, adjacent. Most errors come from losing your orientation at the start.`,
    weak: `Trying to read the full map during the introduction and losing track of the speaker's directions.`,
    strong: `Identifying a fixed reference point on the map (entrance, north arrow, labelled building) before the recording starts, then tracking movement from that point as the speaker describes.`,
    analysis: `Maps always have a starting point the speaker will name. Find it in the 30-second preview, mark it with a dot, and begin your tracking from there.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Pre-listening map preparation</p>
    <ol>
      <li>Find the entrance or starting point the speaker will likely use.</li>
      <li>Note which direction is "up" — north arrow or implied direction.</li>
      <li>Count the labels you need to match — usually 4-6 locations.</li>
      <li>Mark your starting point so your pen is ready.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Key spatial vocabulary</p>
    <ul>
      <li>Adjacent to / next to / beside — directly neighbouring.</li>
      <li>Opposite / facing / across from — directly across a path or road.</li>
      <li>Between X and Y — in the space separating two named places.</li>
      <li>At the end of / at the corner of — positional endpoint.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Tracking language</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">"Go past the entrance" → move beyond the entrance point on your map.</div>
      <div class="lesson-pattern-sentence">"Turn right at the fountain" → pivot 90 degrees at the fountain marker.</div>
      <div class="lesson-pattern-sentence">"It's directly opposite the café" → find the café, then mark the space across from it.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Do not try to memorise the map — use your pencil to track in real time.</li>
      <li>If you lose your place, re-anchor to the nearest named building and continue.</li>
      <li>Questions are almost always in the order the speaker describes them.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Starting without a reference point', weak: 'Beginning to track directions before identifying the starting point, then becoming confused after the first turn.', strong: 'Marking the entrance or main gate before the recording begins, then tracking from there.', fix: 'Use the 30-second preview to find your anchor point — every map question has one.' },
      { label: 'Confusing "opposite" and "next to"', weak: '"The library is opposite the café" → marking the space beside the café.', strong: '"Opposite" means directly across a path or road — not beside or near.', fix: 'Draw a small line across from the named landmark to find the "opposite" position.' },
    ],
    choiceQ: '"The pharmacy is between the post office and the bank, on the left side of the main road." Where do you mark it?',
    choiceOptions: ['On the right side of the road, next to the post office.', 'On the left side of the road, in the space between the post office and bank.', 'Opposite the post office, on the right.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Between X and Y, on the left" precisely locates the space on the left side of the road between the two named buildings.',
    choiceWrong: 'Not quite. "Between" = in the space separating the two buildings. "On the left side" = left of the road from the listener\'s perspective. Both conditions must be satisfied.',
    orderChunks: ['Find your anchor point in the preview,', '||', 'track directions with your pencil in real time,', '||', 'then re-anchor to the nearest label if you lose your place.'],
    orderAnswer: 'Find your anchor point in the preview,||track directions with your pencil in real time,||then re-anchor to the nearest label if you lose your place.',
    orderCorrect: 'Correct. Anchor, track, re-anchor is the three-step map strategy that prevents disorientation.',
    orderWrong: 'Not yet. The anchor point must be set before the recording starts. Tracking without an anchor leads to disorientation after the first turn.',
    sortRows: [
      { text: 'adjacent to = directly beside/neighbouring', target: 'Correct definition' },
      { text: 'opposite = directly beside/neighbouring', target: 'Wrong definition' },
      { text: 'opposite = directly across a path or road', target: 'Correct definition' },
      { text: 'between X and Y = closer to X than Y', target: 'Wrong definition' },
    ],
    sortCategories: ['Correct definition', 'Wrong definition'],
    sortCorrect: 'Correct. Spatial vocabulary must be precise. "Adjacent" = beside; "opposite" = across from; "between" = in the space separating both.',
    sortWrong: 'Check again. Confusing "adjacent" and "opposite" is the most common map error. "Opposite" always means across a route — not beside.',
    whyText: `Map questions appear in Section 2 of every IELTS Listening test and are worth 4-6 marks. They are consistently the highest-error question type for candidates who do not prepare the spatial vocabulary. Anchor-point preparation and practised use of "opposite/adjacent/between" eliminates the two main failure modes.`,
  },

  'seo-2026-03-25-24-ielts-listening-ielts-lecture-listening-structure-prediction': {
    intro: `Section 4 is an academic monologue — a lecture or talk. No conversation, no turn-taking. The speaker follows a predictable structure: introduction, main points (usually 2-3), and conclusion. Predicting this structure before the recording starts helps you know when a new answer is coming.`,
    weak: `Listening passively for keywords without anticipating where in the talk each answer will appear.`,
    strong: `Reading the question set during the preview, inferring the lecture structure from the question types, and mentally marking "this answer comes after the speaker moves from X to Y."`,
    analysis: `If questions 31-35 are about "causes" and 36-40 are about "solutions," you know the lecture will pivot from causes to solutions halfway through. When the pivot language comes ("turning now to," "having established X, let us consider Y"), you know question 36 is next.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Structure prediction steps</p>
    <ol>
      <li>Read all Section 4 questions during the preview.</li>
      <li>Group questions by topic — each group usually maps to one section of the lecture.</li>
      <li>Note any signposting language cues in the questions (causes, effects, solutions, examples).</li>
      <li>Listen for the speaker's pivot phrases to know when a new question group starts.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Common pivot phrases</p>
    <ul>
      <li>"Turning now to..." / "Moving on to..."</li>
      <li>"Having considered X, let us now look at Y."</li>
      <li>"The second factor is..." / "Finally, I want to address..."</li>
      <li>"In terms of solutions..." / "What can be done about this?"</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Prediction in practice</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Q31-33 = causes → listen for "The first/second/third cause is..."</div>
      <div class="lesson-pattern-sentence">Q34-37 = effects → listen for "This leads to..." or "As a result..."</div>
      <div class="lesson-pattern-sentence">Q38-40 = solutions → listen for "What can be done?" or "One approach is..."</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Questions are in the order they appear in the lecture — never skip ahead.</li>
      <li>Pivot phrases are your signal that the current question group is finished.</li>
      <li>If you miss an answer, mark a best guess and move to the next question immediately.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Not reading questions before the recording', weak: 'Using the preview time to re-read instructions instead of studying the questions.', strong: 'Reading all Section 4 questions during preview to predict structure.', fix: 'You get 30 seconds of preview. That is enough to read 10 short questions and identify the structural pattern.' },
      { label: 'Losing place after missing an answer', weak: 'Missing question 33, then spending 20 seconds trying to recover it while question 34\'s answer passes.', strong: 'Missing question 33, marking a best guess immediately, and moving focus to question 34.', fix: 'A missed answer costs 1 mark. Losing your place costs 3-4 marks. Move on instantly.' },
    ],
    choiceQ: 'Questions 31-34 are about "causes of urbanisation" and 35-40 are about "government responses." The speaker says "Having examined the root causes, let us turn to what policymakers have done." What does this signal?',
    choiceOptions: ['Question 31 is about to be answered.', 'Question 35 is about to be answered.', 'The lecture is ending.'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. The pivot phrase "Having examined... let us turn to" signals the transition from causes (31-34) to government responses (35-40). Question 35 is next.',
    choiceWrong: 'Not quite. "Having examined the root causes" = causes section is complete. "Let us turn to what policymakers have done" = now entering the government responses section. Q35 is next.',
    orderChunks: ['Read all questions during preview to predict structure,', '||', 'listen for pivot phrases to track progress,', '||', 'move on immediately if you miss an answer.'],
    orderAnswer: 'Read all questions during preview to predict structure,||listen for pivot phrases to track progress,||move on immediately if you miss an answer.',
    orderCorrect: 'Correct. Preview reading, pivot tracking, and instant recovery are the three disciplines of Section 4 performance.',
    orderWrong: 'Not yet. Preview reading must come first — without knowing the question structure, pivot phrases have no context.',
    sortRows: [
      { text: '"Turning now to the economic implications..." → new question group starting.', target: 'Pivot recognised' },
      { text: '"For example, in the case of Beijing..." → still in current question group.', target: 'No pivot' },
      { text: '"Having considered the causes, let us now examine solutions." → new question group.', target: 'Pivot recognised' },
      { text: '"This is particularly evident in large cities such as..." → still in current section.', target: 'No pivot' },
    ],
    sortCategories: ['Pivot recognised', 'No pivot'],
    sortCorrect: 'Correct. Pivot phrases signal topic shifts (turning to, having examined, let us now). Examples and elaborations stay within the current section.',
    sortWrong: 'Check again. "For example" and "particularly evident in" are elaborations within a section. "Turning now to" and "having considered X" signal that a new section — and new question group — is starting.',
    whyText: `Section 4 is consistently the lowest-scoring section for IELTS candidates because it is the fastest and most complex. Structure prediction converts an unpredictable monologue into a navigable sequence. Candidates who predict structure and recognise pivot phrases maintain focus across all 10 questions; those who listen passively typically lose 3-4 marks when the lecture changes topic.`,
  },

  'seo-2026-03-25-25-ielts-listening-ielts-spelling-and-number-accuracy-drills': {
    intro: `In IELTS Listening, a correctly identified answer spelled incorrectly scores zero. The same applies to numbers written in the wrong format. Spelling and number accuracy are the most avoidable source of lost marks.`,
    weak: `Writing "recieve" (misspelled), "Febuary" (misspelled), or "£ 1,200" when the answer should be "1200" or "£1,200."`,
    strong: `Knowing the 30 most commonly misspelled words in IELTS Listening answers and practising number formats before the test.`,
    analysis: `Most misspellings in IELTS Listening come from words that sound like they are spelled differently: receive, necessary, accommodation, government, professional, environment.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">High-risk spelling categories</p>
    <ul>
      <li><strong>Double letters:</strong> accommodation (cc + mm), necessary (1c + 2s), professional (ss).</li>
      <li><strong>ie/ei:</strong> receive, achieve, believe, brief (i before e except after c).</li>
      <li><strong>Silent letters:</strong> environment (n), government (n), February (r).</li>
      <li><strong>-tion/-sion endings:</strong> pronunciation, administration, permission.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Number format rules</p>
    <ul>
      <li>Write currency as heard: £1,200 or 1200 (match what the instructions say).</li>
      <li>Telephone numbers: write exactly as spoken — spaces between groups are fine.</li>
      <li>Dates: accept multiple formats (14 March / March 14 / 14/3) unless instructions specify.</li>
      <li>Fractions as words or numbers are both acceptable unless the instruction specifies.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Top 10 misspelled words in IELTS Listening</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">accommodation / necessary / government / environment / receive</div>
      <div class="lesson-pattern-sentence">professional / February / recommend / beautiful / immediately</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>If you are unsure of a spelling, write it large and clearly — markers can sometimes accept phonetically plausible attempts.</li>
      <li>For proper nouns (names, addresses), the speaker will usually spell them out — be ready to write letter by letter.</li>
      <li>Check your answers in the 10-minute transfer period — this is when spelling errors are caught.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Misspelling high-frequency words', weak: '"accomodation," "recieve," "goverment" — one letter wrong = zero marks.', strong: '"accommodation," "receive," "government" — memorised as fixed units.', fix: 'Write each high-risk word 10 times before test day. Muscle memory is more reliable than rules under pressure.' },
      { label: 'Wrong number format', weak: 'Speaker says "one thousand two hundred pounds" — candidate writes "£ 1 200" (space inside currency symbol area).', strong: '£1,200 or 1200 — clean format matching the test instructions.', fix: 'Check the answer sheet instructions for number format. Most tests accept either words or digits for amounts under 10.' },
    ],
    choiceQ: 'Which word is spelled correctly?',
    choiceOptions: ['accomodation', 'accommodation', 'acommodation'],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Accommodation has double-c and double-m: ac-com-mo-da-tion.',
    choiceWrong: 'Not quite. Accommodation has TWO c\'s and TWO m\'s. Remember: "It costs a lot to accommodate — double the c and double the m."',
    orderChunks: ['Memorise the top 10 high-risk spellings,', '||', 'write answers clearly during transfer,', '||', 'then check spelling in the remaining transfer time.'],
    orderAnswer: 'Memorise the top 10 high-risk spellings,||write answers clearly during transfer,||then check spelling in the remaining transfer time.',
    orderCorrect: 'Correct. Pre-test memorisation, clear transfer writing, and a final spelling check are the three-step accuracy system.',
    orderWrong: 'Not yet. Memorising high-risk spellings before the test is the foundation — you cannot look words up during the exam.',
    sortRows: [
      { text: 'recieve', target: 'Misspelled' },
      { text: 'receive', target: 'Correct' },
      { text: 'necessary', target: 'Correct' },
      { text: 'neccessary', target: 'Misspelled' },
    ],
    sortCategories: ['Correct', 'Misspelled'],
    sortCorrect: 'Correct. Receive follows i-before-e-except-after-c. Necessary has one c and two s\'s: ne-cess-ary.',
    sortWrong: 'Check again. "Recieve" reverses ie/ei after c. "Neccessary" doubles the c — it should be one c, two s\'s.',
    whyText: `Spelling errors in IELTS Listening directly cost marks that were otherwise earned — the candidate heard the answer correctly but lost the mark due to a typo or memorised misspelling. Among candidates scoring Band 6.5-7.5, spelling is the single most controllable source of lost marks. Ten minutes of pre-test spelling practice removes this risk entirely.`,
  },

  'seo-2026-03-25-26-celpip-writing-celpip-task-1-email-structure-for-clb-9': {
    intro: `CELPIP Writing Task 1 asks you to write an email in response to a situation. CLB 9 requires a clearly organised, purposeful email that addresses all bullet points completely. The most common failure is covering only 2 of 3 bullet points, or writing a structure that does not match the situation type.`,
    weak: `"Hi, I am writing to you about the problem. I think it is a problem. Can you help me please? Thank you."`,
    strong: `"Dear Mr. Chen,\nI am writing to report a billing error on my account (Reference #8821). The invoice dated March 15 charged me $240 instead of the agreed $180.\nCould you please arrange a corrected invoice and confirm when the refund will be processed? I would appreciate a response within three business days.\nThank you for your assistance.\nRegards, [Name]"`,
    analysis: `The strong email has a clear opening (purpose + reference), a specific problem description (amounts, date), a clear request with a timeframe, and a polite close. All three bullet points are covered.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Four-part email structure</p>
    <ol>
      <li><strong>Opening:</strong> state your purpose immediately (I am writing to / I would like to).</li>
      <li><strong>Context:</strong> give the specific background (reference numbers, dates, names).</li>
      <li><strong>Request/action:</strong> state clearly what you need the reader to do.</li>
      <li><strong>Close:</strong> polite sign-off with a timeframe if appropriate.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Three CELPIP email types</p>
    <ul>
      <li><strong>Complaint:</strong> formal, specific, solution-focused.</li>
      <li><strong>Request:</strong> formal or semi-formal, clear ask, polite tone.</li>
      <li><strong>Information-sharing:</strong> friendly, structured, covers all points asked.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">CLB 9 opening phrases</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">I am writing to report / request / inform you of [specific matter].</div>
      <div class="lesson-pattern-sentence">I would like to bring to your attention [specific issue] regarding [reference].</div>
      <div class="lesson-pattern-sentence">Further to our conversation on [date], I am following up on [topic].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Address all bullet points — missing one drops your score significantly.</li>
      <li>Match the tone to the situation: formal for complaints, semi-formal for requests.</li>
      <li>Include one specific detail (number, date, name) — vague emails score lower.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Missing a bullet point', weak: 'Three bullet points required. Email covers two thoroughly and ignores the third.', strong: 'Each bullet point gets at least one sentence, even if brief.', fix: 'Before writing, underline each bullet point. Check them off as you write. The last check is before you stop.' },
      { label: 'Wrong tone for situation', weak: '"Hey! My order was wrong lol can you fix it thanks"', strong: '"Dear Customer Service, I am writing to report an error with Order #4521 placed on April 3rd. The item delivered does not match the description online."', fix: 'CELPIP Task 1 emails are almost always formal or semi-formal. Begin with Dear [Name/Title] and end with a formal sign-off.' },
    ],
    choiceQ: 'Which opening sentence is most appropriate for a formal complaint email in CELPIP?',
    choiceOptions: [
      '"Hi there, I have a problem with my bill."',
      '"I am writing to report a discrepancy on my invoice dated May 10th, Reference #7734."',
      '"I want to complain about what happened to me last week at your store."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 is formal, identifies the specific issue (discrepancy), and includes a reference — all CLB 9 markers.',
    choiceWrong: 'Not quite. "Hi there" is too informal for a formal complaint. "What happened to me" is vague. CLB 9 requires a specific, formal opening.',
    orderChunks: ['I am writing to request an extension', '||', 'on my lease agreement (Unit 4B),', '||', 'as I require an additional four weeks to arrange alternative accommodation.'],
    orderAnswer: 'I am writing to request an extension||on my lease agreement (Unit 4B),||as I require an additional four weeks to arrange alternative accommodation.',
    orderCorrect: 'Correct. Purpose + specific reference + reason is the three-part formal email opening structure.',
    orderWrong: 'Not yet. State the purpose first (I am writing to), add the specific reference (Unit 4B), then give the reason (as I require...).',
    sortRows: [
      { text: 'I am writing to report a fault with the heating system in my apartment.', target: 'CLB 9 quality' },
      { text: 'The heating is broken and I am cold. Please fix it.', target: 'Below CLB 9' },
      { text: 'Could you please confirm the details of my appointment on June 3rd at 2:00 PM?', target: 'CLB 9 quality' },
      { text: 'When is my appointment? I forgot the time.', target: 'Below CLB 9' },
    ],
    sortCategories: ['CLB 9 quality', 'Below CLB 9'],
    sortCorrect: 'Correct. CLB 9 emails are specific, formal, and purpose-clear. Below CLB 9 emails are vague, informal, and incomplete.',
    sortWrong: 'Check again. Specific details (fault with heating system, June 3rd at 2:00 PM) and formal verbs (report, confirm) mark CLB 9 quality.',
    whyText: `CELPIP Writing Task 1 is scored on Task Fulfilment, Coherence, Vocabulary, and Grammar. Missing a bullet point directly drops Task Fulfilment regardless of language quality. Formal register and specific details are the two markers that most consistently separate CLB 9 from CLB 7-8 responses.`,
  },

  'seo-2026-03-25-27-celpip-writing-celpip-task-1-tone-control-in-formal-emails': {
    intro: `Tone is the register you adopt in writing — formal, semi-formal, or informal. CELPIP Task 1 situations signal the required tone through context clues: who you are writing to and what the situation is. Mismatching tone to context is one of the most common CLB 7-8 errors.`,
    weak: `Writing to a landlord: "Hey, the sink is broken. Fix it ASAP."`,
    strong: `Writing to a landlord: "Dear Mr. Okafor, I am writing to report a plumbing issue in Unit 2C. The kitchen sink has been blocked since Monday, March 18th. Could you please arrange for a repair at your earliest convenience? I am available on weekday mornings if access is required."`,
    analysis: `The strong version uses: formal salutation, passive/polite constructions (I am writing to report, could you please), a specific timeframe, and an offer to facilitate.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Tone signals in the prompt</p>
    <ul>
      <li><strong>Formal:</strong> landlord, employer, government office, bank, service provider.</li>
      <li><strong>Semi-formal:</strong> neighbour, local community group, acquaintance.</li>
      <li><strong>Informal:</strong> friend, family member — rarely appears in CELPIP Task 1.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Formal vs semi-formal markers</p>
    <ul>
      <li>Formal: "I am writing to," "Could you please," "I would appreciate," "Yours sincerely."</li>
      <li>Semi-formal: "I wanted to let you know," "Thanks for," "Looking forward to hearing from you."</li>
      <li>Informal (avoid in Task 1): "Hey," "ASAP," contractions in formal contexts, exclamation marks.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Tone upgrade pairs</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Fix it → Please arrange for a repair at your earliest convenience.</div>
      <div class="lesson-pattern-sentence">I want → I would like to / I am writing to.</div>
      <div class="lesson-pattern-sentence">Can you → Could you please / Would it be possible to.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Read the prompt carefully — who is the recipient?</li>
      <li>When in doubt, use formal over semi-formal — it is safer.</li>
      <li>Contractions (I'm, it's) are acceptable in semi-formal; avoid them in formal contexts.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Informal to formal recipient', weak: '"Hey boss, I can\'t come in tomorrow. I\'m sick. Bye."', strong: '"Dear Ms. Rodriguez, I am writing to inform you that I will be unable to attend work on March 22nd due to illness. I will ensure all pending tasks are covered before my return."', fix: 'Identify the recipient\'s authority level first. Any professional or institutional recipient = formal register.' },
      { label: 'Request without politeness markers', weak: '"Send me a replacement item."', strong: '"Could you please arrange for a replacement item to be sent to my address at your earliest convenience?"', fix: 'All requests need "could you please," "would it be possible," or "I would appreciate it if you could." Commands without these markers sound rude and score lower.' },
    ],
    choiceQ: 'You are writing to your building manager about a noise issue. Which sentence is the most appropriate?',
    choiceOptions: [
      '"The people upstairs are so loud. Make them stop."',
      '"I am writing to bring to your attention an ongoing noise disturbance from Unit 12 that has been affecting my sleep on weekday evenings."',
      '"Hi, just wanted to say the noise from above is really getting to me lately."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses formal register (I am writing to bring to your attention), is specific (Unit 12, weekday evenings), and is polite.',
    choiceWrong: 'Not quite. A building manager is a formal recipient. Option 1 is a command; Option 3 is semi-formal at best. Formal context requires formal language.',
    orderChunks: ['Could you please arrange', '||', 'for an inspection of the noise insulation', '||', 'at your earliest convenience?'],
    orderAnswer: 'Could you please arrange||for an inspection of the noise insulation||at your earliest convenience?',
    orderCorrect: 'Correct. "Could you please" + specific action + polite timeframe is the standard formal request pattern.',
    orderWrong: 'Not yet. The politeness marker (Could you please) must come first, then the specific action, then the timeframe.',
    sortRows: [
      { text: 'I am writing to request a copy of my rental agreement.', target: 'Formal' },
      { text: 'Can you send me my rental agreement?', target: 'Informal/semi-formal' },
      { text: 'I would appreciate your assistance in resolving this matter promptly.', target: 'Formal' },
      { text: 'Thanks for helping me out with this — really appreciate it!', target: 'Informal/semi-formal' },
    ],
    sortCategories: ['Formal', 'Informal/semi-formal'],
    sortCorrect: 'Correct. Formal language uses full constructions (I am writing, I would appreciate). Informal/semi-formal uses contractions, abbreviations, and conversational phrasing.',
    sortWrong: 'Check again. "Can you" and "Thanks for" are semi-formal. "I am writing to" and "I would appreciate" are formal. CELPIP Task 1 situations almost always require formal register.',
    whyText: `CELPIP Task 1 tone control directly affects the Task Fulfilment and Vocabulary criteria. Mismatched tone (informal language to a formal recipient) signals poor sociolinguistic awareness, which caps Vocabulary at CLB 7 regardless of word choice. Matching formal constructions to formal contexts is the fastest tone upgrade available.`,
  },

  'seo-2026-03-25-28-celpip-writing-celpip-task-2-opinion-paragraph-system': {
    intro: `CELPIP Task 2 asks you to respond to a survey question with your opinion. A high-scoring response requires a clear position, two developed reasons, and a conclusion. The "opinion paragraph system" gives each reason its own paragraph with a consistent internal structure.`,
    weak: `"I think working from home is good. People can save time and money. They are also more comfortable. So I think it is a good idea."`,
    strong: `"Remote work significantly benefits employees in two key ways. First, it eliminates daily commuting, saving the average urban worker 90 minutes per day — time that can be redirected to productivity or wellbeing. Second, it provides scheduling flexibility, allowing employees to structure their day around peak energy levels rather than fixed office hours. For these reasons, remote work should become the default arrangement for knowledge-based roles."`,
    analysis: `The strong response has a position statement, two numbered reasons each with a specific supporting detail, and a conclusion that restates the position. Word count is approximately 90 — appropriate for Task 2.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The paragraph system</p>
    <p><strong>Sentence 1:</strong> position + number of reasons (X benefits Y in two key ways).<br>
    <strong>Sentence 2:</strong> First reason + specific detail.<br>
    <strong>Sentence 3:</strong> Second reason + specific detail.<br>
    <strong>Sentence 4:</strong> Conclusion that restates the position.</p>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Choosing your two reasons</p>
    <ul>
      <li>Pick reasons you can support with a specific number, example, or comparison.</li>
      <li>Avoid reasons that apply equally to both sides of the question.</li>
      <li>The stronger reason goes first.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Reason + detail patterns</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">First, [reason], [specific detail showing scale or impact].</div>
      <div class="lesson-pattern-sentence">Second, [reason], allowing/enabling [specific outcome].</div>
      <div class="lesson-pattern-sentence">For these reasons, [restate position in new words].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Target 150-200 words — under 100 is too thin; over 250 wastes time.</li>
      <li>State the number of reasons in your opening sentence — it signals organisation.</li>
      <li>Each reason needs one specific detail — a number, comparison, or real example.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Reasons without specific support', weak: '"First, it saves time. Second, it is more comfortable."', strong: '"First, it saves commuting time — the average Canadian commuter spends 60 minutes daily in transit. Second, it allows employees to work in their preferred environment, which research links to 13% higher productivity."', fix: 'Every reason needs a "because" or a specific number/example immediately after it.' },
      { label: 'No conclusion', weak: 'Response stops after the second reason with no restatement.', strong: '"For these reasons, remote work offers measurable advantages that outweigh its limitations."', fix: 'The conclusion sentence takes 5 seconds to write and signals that your response is complete and organised.' },
    ],
    choiceQ: 'Which Task 2 opening best signals a CLB 9 response?',
    choiceOptions: [
      '"I think working from home is good for many reasons."',
      '"Remote work benefits employees in two significant ways: reduced commuting time and increased scheduling flexibility."',
      '"Many people like working from home but others do not."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 states a position, names two specific reasons, and signals clear organisation — all CLB 9 markers.',
    choiceWrong: 'Not quite. Option 1 is vague (many reasons). Option 3 presents both sides — Task 2 asks for your opinion, not a discussion. Name your reasons in the first sentence.',
    orderChunks: ['Remote work benefits employees', '||', 'by eliminating the daily commute,', '||', 'saving the average urban worker 90 minutes per day.'],
    orderAnswer: 'Remote work benefits employees||by eliminating the daily commute,||saving the average urban worker 90 minutes per day.',
    orderCorrect: 'Correct. Topic + reason + specific detail (90 minutes) is the CLB 9 reason-support pattern.',
    orderWrong: 'Not yet. Start with the topic and benefit (Remote work benefits employees), then the mechanism (by eliminating), then the specific detail that gives it credibility.',
    sortRows: [
      { text: 'First, remote work saves time because workers do not need to commute.', target: 'Has support' },
      { text: 'First, remote work is good because it saves time.', target: 'No specific support' },
      { text: 'Second, flexible scheduling allows workers to match tasks to peak energy hours, improving output.', target: 'Has support' },
      { text: 'Second, workers can choose when to work, which is better.', target: 'No specific support' },
    ],
    sortCategories: ['Has support', 'No specific support'],
    sortCorrect: 'Correct. Supported reasons name the mechanism and a specific outcome. Unsupported reasons state the benefit without explaining how or how much.',
    sortWrong: 'Check again. "Saves time because workers do not commute" names the mechanism. "Saves time" alone does not. Specific outcomes (improving output, 90 minutes) give the examiner evidence.',
    whyText: `CELPIP Task 2 is scored on Task Fulfilment, Coherence, Vocabulary, and Grammar. The opinion paragraph system ensures Task Fulfilment (clear position + two reasons) and Coherence (numbered structure, conclusion) are both met before worrying about vocabulary. CLB 9 responses have a visible structure; CLB 7 responses state an opinion without developing it.`,
  },

  'seo-2026-03-25-29-celpip-writing-celpip-task-2-survey-response-coherence-plan': {
    intro: `CELPIP Task 2 survey responses are scored heavily on Coherence — how clearly your ideas connect and flow. A response that states good ideas in a disjointed order scores CLB 7. The same ideas in a coherent sequence score CLB 9. Planning for coherence takes 60 seconds before writing.`,
    weak: `"Working from home is good. I can save money. Also the environment. And my family time is better. Many people agree. So yes, I recommend it."`,
    strong: `"Remote work offers practical benefits at three levels: individual, environmental, and social. For the individual, eliminating commuting saves both time and money. For the environment, fewer cars on the road reduces urban carbon emissions. For families, flexible hours allow parents to be more present — a factor linked to better child outcomes. These overlapping benefits explain why remote work policies are gaining momentum globally."`,
    analysis: `The strong version organises three ideas under one framework (three levels), moves from individual to broad, and closes with a statement that connects all three — this is coherence.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">The 60-second coherence plan</p>
    <ol>
      <li>Write your position in one word: FOR / AGAINST / PARTLY.</li>
      <li>List your reasons (2-3 words each): "time," "cost," "environment."</li>
      <li>Choose a logical order: strongest first, or small-to-large, or cause-effect chain.</li>
      <li>Note one specific detail per reason: "60 min/day," "15% cost reduction."</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Three coherence frameworks</p>
    <ul>
      <li><strong>Priority order:</strong> most important first, least important last.</li>
      <li><strong>Scale order:</strong> individual → community → society.</li>
      <li><strong>Cause-effect chain:</strong> A causes B, B causes C.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Coherence connectors</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">At a personal level, [reason 1]. At a broader level, [reason 2].</div>
      <div class="lesson-pattern-sentence">The first and most significant reason is [A]. This leads directly to [B], which in turn [C].</div>
      <div class="lesson-pattern-sentence">Together, these factors explain why [restate position].</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Use a framework (priority/scale/cause-effect) — random order signals poor coherence.</li>
      <li>Connect each reason to the next with a word or phrase: "this leads to," "as a result," "beyond the individual."</li>
      <li>The conclusion must refer back to the framework, not just restate the opinion.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Ideas listed with no connection', weak: '"Remote work is good. It saves time. Also money. The environment too. My kids. I prefer it."', strong: '"Remote work benefits individuals (time, cost), the environment (fewer emissions), and families (presence) — a combination that justifies wide adoption."', fix: 'Group related ideas before writing. Never list more than one idea per sentence without connecting them.' },
      { label: 'Random idea order', weak: 'Response moves from environment → personal cost → family → environment again.', strong: 'Individual first, then community, then environment — a consistent scale that builds logically.', fix: 'Choose your order in the 60-second plan and stick to it. Jumping back to an earlier topic breaks coherence.' },
    ],
    choiceQ: 'Which response shows the best coherence for a CELPIP Task 2 opinion?',
    choiceOptions: [
      '"Working from home is good. People save money. Also the environment is better. Families are happier too. That is why I like it."',
      '"Remote work benefits individuals, communities, and the environment. At the personal level, it reduces commuting costs. At the community level, fewer cars ease traffic. For the environment, lower emissions improve air quality. These interconnected benefits make a strong case for wider adoption."',
      '"I agree with remote work because it is convenient. But some people do not like it. So it depends."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses a three-level framework (individual/community/environment), connects each level logically, and closes with a framework reference.',
    choiceWrong: 'Not quite. Option 1 lists ideas without connecting them. Option 3 hedges rather than commits to a position. Coherence requires a clear framework and logical connections.',
    orderChunks: ['At a personal level, remote work reduces commuting costs.', '||', 'At a community level, fewer cars ease traffic congestion.', '||', 'These overlapping benefits justify wider adoption.'],
    orderAnswer: 'At a personal level, remote work reduces commuting costs.||At a community level, fewer cars ease traffic congestion.||These overlapping benefits justify wider adoption.',
    orderCorrect: 'Correct. Scale framework (personal → community) + connecting conclusion is the structure of a coherent Task 2 response.',
    orderWrong: 'Not yet. The scale moves from smaller (personal) to larger (community). The conclusion must reference the whole framework, not just repeat the last point.',
    sortRows: [
      { text: 'First... Second... For these reasons... — organised with signposts.', target: 'Coherent' },
      { text: 'Also... And also... Also... — repeated connector with no structure.', target: 'Incoherent' },
      { text: 'At a personal level... At a societal level... Together these... — scale framework.', target: 'Coherent' },
      { text: 'Good for environment. Also money. Kids too. Very good overall. — random list.', target: 'Incoherent' },
    ],
    sortCategories: ['Coherent', 'Incoherent'],
    sortCorrect: 'Correct. Coherent responses use a logical framework with signposts. Incoherent responses repeat "also" and list ideas without structure.',
    sortWrong: 'Check again. "First/Second/For these reasons" and scale frameworks (personal→societal) signal coherence. Random "also" chains and topic-hopping signal incoherence.',
    whyText: `CELPIP Task 2 Coherence is assessed on whether ideas are organised in a logical sequence and whether connections between ideas are clear. CLB 7 responses have the ideas but not the order. CLB 9 responses choose a framework in the planning stage and maintain it throughout — this is a learnable, plannable skill, not a talent.`,
  },

  'seo-2026-03-25-30-celpip-writing-celpip-writing-prompt-analysis-in-60-seconds': {
    intro: `CELPIP Writing prompts contain specific requirements that are easy to miss under time pressure. Reading the prompt in 60 seconds with a structured checklist — rather than scanning it once and writing — prevents the most common error: answering a different question than the one asked.`,
    weak: `Reading the prompt once, deciding it is "about working from home," and writing a general opinion essay.`,
    strong: `Spending 60 seconds to identify: (1) task type (email/survey), (2) recipient/audience, (3) all bullet points, (4) tone required, (5) the specific angle of the question — then writing.`,
    analysis: `A survey prompt asking "Do you prefer remote work or office work for creative tasks specifically?" is not the same as "Do you prefer remote work?" Candidates who miss "for creative tasks specifically" write an off-topic response.`,
    howItWorks: `<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">60-second prompt checklist</p>
    <ol>
      <li><strong>Task type:</strong> email or survey opinion? (different structures)</li>
      <li><strong>Recipient:</strong> who are you writing to? (determines tone)</li>
      <li><strong>Bullet points:</strong> how many? Underline each one.</li>
      <li><strong>Scope:</strong> is there a qualifier? (for families / in your city / for students)</li>
      <li><strong>Tone:</strong> formal / semi-formal based on recipient.</li>
    </ol>
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Common scope qualifiers to watch for</p>
    <ul>
      <li>"in your community" — keep examples local, not global.</li>
      <li>"for students specifically" — examples must relate to students.</li>
      <li>"in the next five years" — frame solutions as near-future, not long-term.</li>
    </ul>
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Prompt analysis example</p>
    <div class="lesson-pattern-stack">
      <div class="lesson-pattern-sentence">Prompt: "Write a survey response about whether your city should invest in cycling infrastructure for commuters."</div>
      <div class="lesson-pattern-sentence">Scope: city (not country), commuters (not recreational cyclists), investment (not policy).</div>
      <div class="lesson-pattern-sentence">Wrong: writing about cycling culture globally or health benefits generally.</div>
    </div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Quick rules</p>
    <ul>
      <li>Underline the scope qualifier before writing a single word.</li>
      <li>Check your opening sentence against the prompt — does it address the specific question?</li>
      <li>If you finish early, reread the prompt and check every bullet point is covered.</li>
    </ul>
  </section>
</div>`,
    mistakes: [
      { label: 'Missing the scope qualifier', weak: 'Prompt: "Should universities offer more online courses for working adults?" Response: writes about online education generally for all students.', strong: 'Response stays focused on working adults: work-life balance, asynchronous access, mature learner needs.', fix: 'The qualifier is usually the most specific phrase in the question. Circle it before writing.' },
      { label: 'Answering a general version of the question', weak: 'Prompt asks about cycling infrastructure for commuters. Response discusses benefits of exercise and health.', strong: 'Response discusses commuter cycling lanes, safety, and city transport integration.', fix: 'Re-read the prompt after writing your first paragraph to confirm you are on topic.' },
    ],
    choiceQ: 'The prompt says: "Write a survey response about investing in after-school programs for elementary school children in your neighbourhood." Which response is on-topic?',
    choiceOptions: [
      '"Education is very important for children of all ages in every country."',
      '"After-school programs in our neighbourhood would benefit elementary children by providing supervised activities between 3pm and 6pm, reducing the childcare burden on working parents."',
      '"Children should spend more time studying after school instead of playing."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 addresses all scope qualifiers: neighbourhood, elementary, specific time, working parents.',
    choiceWrong: 'Not quite. Option 1 is too broad (all ages, every country). Option 3 ignores the neighbourhood and after-school program context. Scope qualifiers must be honoured in every sentence.',
    orderChunks: ['Identify the task type and recipient,', '||', 'underline all bullet points and scope qualifiers,', '||', 'then write an opening sentence that addresses the specific question.'],
    orderAnswer: 'Identify the task type and recipient,||underline all bullet points and scope qualifiers,||then write an opening sentence that addresses the specific question.',
    orderCorrect: 'Correct. Task type and recipient set the structure; bullet points set the content; the opening sentence confirms you are on topic.',
    orderWrong: 'Not yet. Task type comes first because it determines the structure (email vs opinion paragraph). Bullet points come second because they set the content requirements.',
    sortRows: [
      { text: 'Underline every bullet point before writing your first sentence.', target: 'Good habit' },
      { text: 'Read the prompt once and start writing immediately.', target: 'Risk' },
      { text: 'Check your opening sentence addresses the specific scope of the question.', target: 'Good habit' },
      { text: 'Answer the general topic even if the prompt specifies a particular group or context.', target: 'Risk' },
    ],
    sortCategories: ['Good habit', 'Risk'],
    sortCorrect: 'Correct. Underlining and scope-checking are the two most effective prompt analysis habits. Immediate writing and ignoring scope are the two most common off-topic errors.',
    sortWrong: 'Check again. Reading once and writing immediately is the fastest path to an off-topic response. 60 seconds of prompt analysis prevents that entirely.',
    whyText: `CELPIP Task Fulfilment requires that you address all parts of the prompt. Candidates who miss a bullet point or ignore a scope qualifier score CLB 7 on Task Fulfilment regardless of language quality. Sixty seconds of structured prompt analysis — task type, recipient, bullet points, scope, tone — eliminates the most common single cause of underscoring in CELPIP Writing.`,
  },

  'seo-2026-03-25-31-celpip-writing-celpip-writing-grammar-checklist-for-clb-9': {
    title: 'CELPIP Writing Grammar Checklist for CLB 9',
    intro: 'A grammar error in CELPIP Writing costs more than a vocabulary gap. This checklist targets the five error patterns that most frequently prevent candidates from reaching CLB 9 on Linguistic Range and Accuracy.',
    weakExample: '"Yesterday I have went to the store and buyed some foods for my family."',
    strongExample: '"Yesterday I went to the store and picked up a few groceries for the week."',
    patternRows: [
      { pattern: 'Subject-verb agreement', meaning: 'Singular subject needs singular verb; plural needs plural', example: '"The committee has agreed" not "have agreed"' },
      { pattern: 'Consistent tense', meaning: 'Do not shift tense mid-paragraph without a time signal', example: '"She arrived, sat down, and opened her laptop." — all simple past' },
      { pattern: 'Article accuracy', meaning: 'Use "a/an" for first mention, "the" for established referents', example: '"I saw a dog. The dog was barking."' },
      { pattern: 'Preposition precision', meaning: 'Memorise high-frequency preposition collocations', example: '"interested in" not "interested on"; "responsible for" not "responsible of"' },
    ],
    mistakes: [
      { label: 'Tense shift', weak: 'I went to the mall and I am buying a jacket.', strong: 'I went to the mall and bought a jacket.', fix: 'Keep the same tense throughout a narrative unless a time shift is explicit.' },
      { label: 'Article error', weak: 'I need the advice from my manager.', strong: 'I need advice from my manager.', fix: 'Uncountable nouns like "advice" rarely take "the" unless the referent is already established.' },
      { label: 'Subject-verb mismatch', weak: 'The group of employees are waiting.', strong: 'The group of employees is waiting.', fix: 'The head noun is "group" (singular), not "employees".' },
    ],
    choiceOptions: [
      '"Yesterday I have visited my aunt and we have talked for hours."',
      '"Yesterday I visited my aunt and we talked for hours."',
      '"Yesterday I am visiting my aunt and we was talking for hours."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses consistent simple past throughout with no tense shift.',
    choiceWrong: 'Not quite. Option 1 mixes simple past with present perfect incorrectly. Option 3 mixes present continuous with simple past.',
    orderChunks: ['Identify the main verb,', '||', 'confirm the tense matches the time signal,', '||', 'then check every other verb in the sentence matches.'],
    orderAnswer: 'Identify the main verb,||confirm the tense matches the time signal,||then check every other verb in the sentence matches.',
    orderCorrect: 'Correct. Starting from the main verb anchors the tense; every other verb should match or have an explicit reason to shift.',
    orderWrong: 'Not yet. The main verb comes first because it sets the tense for the whole sentence.',
    sortRows: [
      { text: 'Read each verb individually and confirm it matches the time signal.', target: 'Good habit' },
      { text: 'Use complex grammar structures without checking they are correct.', target: 'Risk' },
      { text: 'Use a consistent tense throughout a narrative paragraph.', target: 'Good habit' },
      { text: 'Shift tense mid-paragraph without a time word to signal the change.', target: 'Risk' },
    ],
    sortCategories: ['Good habit', 'Risk'],
    sortCorrect: 'Correct. Checking each verb and maintaining tense consistency are the two most effective grammar habits for CLB 9.',
    sortWrong: 'Check again. Complex grammar without checking is a reliability risk. Tense shifts without signals confuse the reader.',
    whyText: `CELPIP Linguistic Range and Accuracy at CLB 9 requires consistent control of complex grammar with only minor errors that do not impede communication. Candidates who reach CLB 9 on vocabulary but drop to CLB 7 on accuracy almost always make tense, article, or subject-verb errors that a 60-second grammar checklist would catch.`,
  },

  'seo-2026-03-25-32-celpip-writing-celpip-writing-sentence-variety-without-errors': {
    title: 'CELPIP Writing Sentence Variety Without Errors',
    intro: 'Sentence variety lifts your CELPIP Writing score from CLB 8 to CLB 9 on Linguistic Range. But adding complex structures only helps if they are accurate. This lesson shows you how to vary sentences safely.',
    weakExample: '"I like working from home. It is comfortable. I can save time. I do not need to commute."',
    strongExample: '"Working from home suits me well because I save the 90-minute daily commute and can focus in a quieter environment. While some colleagues prefer the office, the flexibility of remote work outweighs that drawback for me."',
    patternRows: [
      { pattern: 'Subordinate clause opener', meaning: 'Move a "because/although/since" clause to the front', example: '"Because traffic is heavy, I prefer to telecommute."' },
      { pattern: 'Relative clause', meaning: 'Add detail with "which/who/that"', example: '"The policy, which was introduced last year, reduced absenteeism by 15%."' },
      { pattern: 'Paired connector', meaning: 'Use "not only ... but also" or "both ... and"', example: '"Remote work saves both time and money."' },
      { pattern: 'Short sentence after long', meaning: 'Follow a complex sentence with a short one for emphasis', example: '"After months of planning and three rounds of revision, the report was finally complete. It changed everything."' },
    ],
    mistakes: [
      { label: 'Comma splice', weak: 'I enjoy working remotely, it helps me focus.', strong: 'I enjoy working remotely because it helps me focus.', fix: 'Two independent clauses cannot be joined with only a comma. Use a conjunction or a semicolon.' },
      { label: 'Overlong sentence', weak: 'Working from home is good because you save time and money and you can also focus better and you do not need to wear formal clothes.', strong: 'Working from home saves time and money. It also allows you to focus in a quieter space without the pressure of office dress codes.', fix: 'Break a chain of "and" clauses into two or three targeted sentences.' },
      { label: 'Fragment', weak: 'Although remote work has many benefits.', strong: 'Although remote work has many benefits, it requires strong self-discipline.', fix: 'A clause beginning with "although/because/since" cannot stand alone. Add a main clause.' },
    ],
    choiceOptions: [
      '"I like the city. The city is big. The city has many restaurants."',
      '"Although the city is large, its compact transit system makes it easy to navigate."',
      '"The city is big and it has many restaurants and it also has a good transit and people like it."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses a subordinate clause opener and communicates two ideas accurately in one sentence.',
    choiceWrong: 'Not quite. Option 1 is choppy repetition. Option 3 is a run-on chain of "and" clauses.',
    orderChunks: ['Write the main idea in a simple sentence,', '||', 'add one subordinate clause to extend it,', '||', 'then check that no comma splices were created.'],
    orderAnswer: 'Write the main idea in a simple sentence,||add one subordinate clause to extend it,||then check that no comma splices were created.',
    orderCorrect: 'Correct. Starting simple prevents errors; the subordinate clause adds variety; the comma check prevents the most common punctuation error.',
    orderWrong: 'Not yet. Start with the core idea before adding complexity so you control the grammar.',
    sortRows: [
      { text: 'Vary sentence length deliberately: mix short and long sentences.', target: 'Effective' },
      { text: 'Join two sentences with only a comma and no conjunction.', target: 'Error' },
      { text: 'Use a subordinate clause opener to add emphasis or contrast.', target: 'Effective' },
      { text: 'Write five consecutive sentences of the same length and structure.', target: 'Error' },
    ],
    sortCategories: ['Effective', 'Error'],
    sortCorrect: 'Correct. Deliberate length variation and subordinate openers are the two most reliable variety strategies. Comma splices and uniform structure are the two most common errors.',
    sortWrong: 'Check again. Comma splices are a grammar error, not a style choice. Uniform sentence structure is the opposite of variety.',
    whyText: `CELPIP Linguistic Range at CLB 9 rewards candidates who demonstrate control of complex sentence structures. The risk is that adding complexity also introduces errors. The safest path is to master one new structure at a time, verify it is accurate, and build it into your writing routine before attempting the next.`,
  },

  'seo-2026-03-25-33-celpip-writing-celpip-writing-task-timing-allocation-strategy': {
    title: 'CELPIP Writing Task Timing Allocation Strategy',
    intro: 'CELPIP Writing gives you 26 minutes total: 8 for Task 1 (email) and 18 for Task 2 (survey response). Candidates who run out of time on Task 2 or rush Task 1 lose marks on Content and Coherence, not just length.',
    weakExample: '"Task 1: spent 15 minutes. Task 2: only 11 minutes left, response incomplete, score dropped."',
    strongExample: '"Task 1: 7 minutes. Task 2: 18 minutes with 1 minute to review. Both tasks complete and well-structured."',
    patternRows: [
      { pattern: 'Task 1: 2-1-4-1', meaning: '2 min read, 1 min plan, 4 min write, 1 min check', example: 'Read prompt + underline bullets (2) → note opening + body + close (1) → draft (4) → fix errors (1)' },
      { pattern: 'Task 2: 3-2-11-2', meaning: '3 min read, 2 min outline, 11 min write, 2 min review', example: 'Read and categorise questions (3) → bullet your answers (2) → draft all responses (11) → check and correct (2)' },
      { pattern: 'Clock anchor', meaning: 'Note start time and set a mental midpoint', example: 'Starting Task 2 at 8:00 → midpoint check at 8:09 to confirm half the response is drafted' },
      { pattern: 'Minimum viable answer', meaning: 'If running behind, shorten elaboration, not structure', example: 'Write all required components at a lower word count rather than omitting a section entirely' },
    ],
    mistakes: [
      { label: 'Over-elaborating Task 1', weak: 'Spending 12 of 26 minutes on Task 1 email', strong: 'Finishing Task 1 in 7-8 minutes', fix: 'Task 1 is shorter (150 words). A longer response does not score higher if it just repeats the same points.' },
      { label: 'Skipping the plan', weak: 'Starting to write Task 2 immediately without an outline', strong: 'Spending 2 minutes bulleting your answers before writing', fix: 'A 2-minute outline prevents mid-response confusion and saves more time than it costs.' },
      { label: 'No review buffer', weak: 'Writing until the timer runs out with no check pass', strong: 'Saving 1-2 minutes to check articles, tense, and subject-verb agreement', fix: 'A final read catches surface errors that cost accuracy marks.' },
    ],
    choiceOptions: [
      'Begin writing Task 1 immediately to maximise writing time.',
      'Read the Task 1 prompt for 2 minutes, then plan and write in the remaining 6 minutes.',
      'Spend 12 minutes on Task 1 to make sure it is perfect before moving to Task 2.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. 2 minutes of reading and planning within the 8-minute window ensures you address all bullet points without overrunning.',
    choiceWrong: 'Not quite. Immediate writing skips the plan and risks missing bullet points. Spending 12 minutes on Task 1 leaves only 14 for Task 2.',
    orderChunks: ['Set a mental start-time anchor,', '||', 'divide the task time into read, plan, write, check phases,', '||', 'then adjust at the midpoint if you are running behind.'],
    orderAnswer: 'Set a mental start-time anchor,||divide the task time into read, plan, write, check phases,||then adjust at the midpoint if you are running behind.',
    orderCorrect: 'Correct. The anchor gives you a reference; the phase plan gives you structure; the midpoint check gives you a chance to recover.',
    orderWrong: 'Not yet. Anchoring time comes first so all phase calculations are relative to a known start.',
    sortRows: [
      { text: 'Allocate 2 minutes to read and underline the Task 1 prompt.', target: 'Effective' },
      { text: 'Keep writing Task 1 until you feel satisfied, regardless of time used.', target: 'Risk' },
      { text: 'Check your midpoint progress on Task 2 after the first 9 minutes.', target: 'Effective' },
      { text: 'Skip the Task 2 outline to save time and start writing immediately.', target: 'Risk' },
    ],
    sortCategories: ['Effective', 'Risk'],
    sortCorrect: 'Correct. Reading first and checking the midpoint are time-management anchors. Uncapped Task 1 time and skipping outlines are the two most common over-run causes.',
    sortWrong: 'Check again. Feeling satisfied is not a time limit. Saving outline time usually costs more time mid-draft when direction is lost.',
    whyText: `CELPIP Writing is time-pressured by design. Candidates who run out of time on Task 2 produce incomplete responses that score CLB 7 on Content regardless of language quality. A structured time plan of 8 and 18 minutes, each divided into read, plan, write, and check phases, is the single most reliable way to protect your Task Fulfilment score under exam conditions.`,
  },

  'seo-2026-03-25-34-celpip-writing-celpip-writing-vocabulary-upgrade-for-score-bands': {
    title: 'CELPIP Writing Vocabulary Upgrade for Score Bands',
    intro: 'Upgrading vocabulary in CELPIP Writing is not about using longer words. It is about replacing vague, overused words with precise, contextually accurate alternatives. This lesson targets the upgrades that most reliably move a response from CLB 8 to CLB 9.',
    weakExample: '"The thing about this issue is that it is very bad and affects many people in a big way."',
    strongExample: '"The core challenge is that inadequate public transit disproportionately affects low-income commuters."',
    patternRows: [
      { pattern: 'Replace "very + adjective"', meaning: 'Use a stronger single adjective instead', example: '"very tired" → "exhausted"; "very important" → "critical"' },
      { pattern: 'Replace "get/got"', meaning: 'Use a precise verb that shows how or why', example: '"got a promotion" → "earned a promotion"; "got worse" → "deteriorated"' },
      { pattern: 'Replace "thing/issue/problem"', meaning: 'Name the specific noun', example: '"the main issue" → "the key barrier"; "the thing is" → "the core challenge is"' },
      { pattern: 'Replace "big/small"', meaning: 'Use a measurable or context-specific adjective', example: '"a big difference" → "a significant difference"; "small amount" → "minimal uptake"' },
    ],
    mistakes: [
      { label: 'Vague intensifier', weak: 'This is a very serious and very important problem.', strong: 'This is a critical, wide-reaching problem.', fix: 'Stack two precise adjectives instead of repeating "very".' },
      { label: 'Overused verb', weak: 'We got a lot of useful feedback from the survey.', strong: 'We gathered substantial feedback through the survey.', fix: '"Gathered" signals intentional collection; "substantial" replaces "a lot of".' },
      { label: 'Vague noun', weak: 'There are many things that need to change about this policy.', strong: 'Several provisions in this policy require amendment.', fix: 'Name the specific noun (provisions) and use a formal verb (require amendment).' },
    ],
    choiceOptions: [
      '"The very big problem with the plan is that it does not work well."',
      '"The fundamental flaw in the proposal is that it lacks a measurable implementation timeline."',
      '"The plan has a lot of bad things and it is not good for the city."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses precise nouns (flaw, proposal, implementation timeline) and avoids "very" and "bad".',
    choiceWrong: 'Not quite. Options 1 and 3 rely on "very big", "bad things", and "not good" -- all vague.',
    orderChunks: ['Identify the vague word,', '||', 'find the precise noun or verb that replaces it,', '||', 'then verify the new word fits the sentence context.'],
    orderAnswer: 'Identify the vague word,||find the precise noun or verb that replaces it,||then verify the new word fits the sentence context.',
    orderCorrect: 'Correct. Identifying the target prevents random substitution; finding the precise replacement is the upgrade; context verification prevents collocation errors.',
    orderWrong: 'Not yet. You must identify the weak word first before you can replace it deliberately.',
    sortRows: [
      { text: 'Replace "very tired" with "exhausted" to increase precision.', target: 'Upgrade' },
      { text: 'Use "thing" as a placeholder when a specific noun is available.', target: 'Downgrade' },
      { text: 'Replace "got worse" with "deteriorated" for a stronger verb.', target: 'Upgrade' },
      { text: 'Repeat "very important" three times in a single paragraph.', target: 'Downgrade' },
    ],
    sortCategories: ['Upgrade', 'Downgrade'],
    sortCorrect: 'Correct. Precise single-word replacements for vague pairs are the two key upgrades. Placeholder nouns and repeated intensifiers are the two most common vocabulary weaknesses.',
    sortWrong: 'Check again. "Thing" as a placeholder is a missed opportunity for precision. Repeating "very important" signals a narrow vocabulary range.',
    whyText: `CELPIP Vocabulary Range at CLB 9 rewards candidates who use precise, context-appropriate language. The most accessible upgrade path is not learning obscure words -- it is replacing the ten most overused vague words in your writing (very, thing, get, big, good, bad, nice, a lot, important, problem) with accurate alternatives you already know but are not yet deploying in exam conditions.`,
  },

  'seo-2026-03-25-35-celpip-writing-celpip-writing-revision-routine-for-high-scores': {
    title: 'CELPIP Writing Revision Routine for High Scores',
    intro: 'A two-minute revision pass after drafting catches the surface errors that cost CLB 9 candidates accuracy marks. This lesson gives you a systematic routine that covers grammar, vocabulary, and task fulfilment in the time available.',
    weakExample: '"I just read it over quickly and it seemed fine to me."',
    strongExample: '"I check verbs first (tense), then articles, then subject-verb agreement, then I confirm all bullet points are addressed."',
    patternRows: [
      { pattern: 'Verb check first', meaning: 'Read each verb and confirm tense is consistent and correct', example: 'Underline every verb in the response; verify each against the time signal' },
      { pattern: 'Article pass', meaning: 'Check "a/an/the" before nouns; remove or add as needed', example: '"I need the advice" → "I need advice"; "She is a engineer" → "an engineer"' },
      { pattern: 'Bullet point audit', meaning: 'Return to the prompt and confirm every required point is addressed', example: 'Tick off each instruction or bullet after finding it in your response' },
      { pattern: 'Word count estimate', meaning: 'Confirm Task 2 response is not significantly under the guideline', example: 'Count paragraphs and estimate words; add a sentence if a section is thin' },
    ],
    mistakes: [
      { label: 'Reading for meaning, not error', weak: 'Reading your own response and thinking "it sounds good"', strong: 'Reading for one error type at a time (verbs, then articles, then bullet coverage)', fix: 'The brain auto-corrects familiar text. Targeting one feature at a time defeats this habit.' },
      { label: 'Skipping the prompt on revision', weak: 'Only re-reading your response, not comparing it to the prompt', strong: 'Checking your response against each bullet point in the prompt', fix: 'Omitting a bullet costs Task Fulfilment marks that no grammar fix can recover.' },
      { label: 'No word count check', weak: 'Finishing Task 2 at 80 words without noticing it is significantly short', strong: 'Estimating word count during revision and adding a sentence if under target', fix: 'CELPIP Task 2 responses under 150 words rarely score CLB 9 on Content.' },
    ],
    choiceOptions: [
      'Re-read your response once at a normal reading pace and submit if it sounds fine.',
      'Read for verbs first, then articles, then confirm every prompt bullet is addressed.',
      'Focus only on fixing spelling errors since grammar is checked automatically.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. A sequenced three-pass check covers the three most impactful error types in the time available.',
    choiceWrong: 'Not quite. A single reading pass at normal pace auto-corrects errors. CELPIP does not auto-correct grammar; it must be caught manually.',
    orderChunks: ['Re-read each verb for tense consistency,', '||', 'check articles before each noun,', '||', 'then tick off every prompt bullet in your response.'],
    orderAnswer: 'Re-read each verb for tense consistency,||check articles before each noun,||then tick off every prompt bullet in your response.',
    orderCorrect: 'Correct. Verbs first because tense errors are the most common; articles second because they are easy to fix; bullet audit last because it requires returning to the prompt.',
    orderWrong: 'Not yet. Verb tense is the highest-frequency error and benefits from being checked first when attention is highest.',
    sortRows: [
      { text: 'Read each verb individually and confirm it matches the time signal.', target: 'Effective' },
      { text: 'Re-read your response and assume it is correct if it sounds natural.', target: 'Risk' },
      { text: 'Tick off each prompt bullet to confirm it is addressed in your response.', target: 'Effective' },
      { text: 'Use remaining time to add more sentences without checking existing ones.', target: 'Risk' },
    ],
    sortCategories: ['Effective', 'Risk'],
    sortCorrect: 'Correct. Sequential verb checks and bullet audits are the two highest-value revision habits. Trusting naturalness and adding unchecked content are the two highest-risk revision errors.',
    sortWrong: 'Check again. "Sounds natural" is not the same as "grammatically correct" in a second language context. Adding content without checking existing errors compounds mistakes.',
    whyText: `CELPIP Linguistic Accuracy at CLB 9 requires consistent control with only minor errors. Candidates who draft fluently but skip revision consistently leave correctable errors in their response. A two-minute sequenced revision routine (verbs, articles, bullet audit) converts draft-quality writing into exam-quality writing at the cost of 120 seconds.`,
  },

  'seo-2026-03-25-36-celpip-speaking-celpip-speaking-task-1-advice-structure': {
    title: 'CELPIP Speaking Task 1 Advice Structure',
    intro: 'CELPIP Speaking Task 1 asks you to give advice to a friend. High-scoring responses give one clear recommendation, one concrete reason, and one practical next step. Vague advice and over-qualification drop the Coherence score.',
    weakExample: '"Well, I think maybe you could try to look for a job or maybe talk to someone about your situation and see what happens."',
    strongExample: '"My advice is to speak with your manager directly this week. In my experience, most scheduling conflicts are resolved in a single five-minute conversation, and waiting only makes the situation worse."',
    patternRows: [
      { pattern: 'Clear recommendation', meaning: 'State the advice in the first sentence, not the third', example: '"I would recommend applying for the position before the Friday deadline."' },
      { pattern: 'One strong reason', meaning: 'Give one specific reason rather than a list of vague ones', example: '"The main reason is that early applicants receive priority screening in most companies."' },
      { pattern: 'Practical next step', meaning: 'Tell them exactly what to do and when', example: '"Tonight, update your CV and send it to the HR email listed on the posting."' },
      { pattern: 'Confident tone', meaning: 'Avoid "maybe", "possibly", "I am not sure but"', example: '"I would definitely speak to your landlord before involving the rental authority."' },
    ],
    mistakes: [
      { label: 'Delayed recommendation', weak: 'There are many things to consider in this situation. First you should think about your options...', strong: 'I would recommend speaking with your supervisor directly.', fix: 'State the recommendation in the first sentence. Task 1 is 30-40 seconds. Delay wastes your response time.' },
      { label: 'Multiple vague options', weak: 'You could try option A or maybe option B or possibly option C.', strong: 'I suggest option A because it directly addresses the core issue.', fix: 'Pick one option and defend it. Listing options without commitment sounds uncertain.' },
      { label: 'Over-hedging', weak: 'I am not completely sure, but maybe you could possibly consider...', strong: 'I would suggest applying early.', fix: 'Remove "maybe", "possibly", and "I am not sure". Confident phrasing scores higher on Task Fulfilment.' },
    ],
    choiceOptions: [
      '"I think there are many things you could do in this situation, like maybe talking to people or trying different things."',
      '"I would advise you to register for the evening course this week -- it directly addresses the gap your supervisor mentioned in your review."',
      '"Well, it is a difficult situation and there are pros and cons, but you should think carefully about what to do."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 gives a specific action (register this week), a targeted reason (gap from review), and no hedge.',
    choiceWrong: 'Not quite. Options 1 and 3 are vague and avoid committing to a recommendation. In Task 1, commitment is scored positively.',
    orderChunks: ['State the recommendation clearly,', '||', 'give one specific reason it will help,', '||', 'then name the practical next step.'],
    orderAnswer: 'State the recommendation clearly,||give one specific reason it will help,||then name the practical next step.',
    orderCorrect: 'Correct. Recommendation first signals Task Fulfilment immediately. Reason second supports it. Next step third closes with action.',
    orderWrong: 'Not yet. The recommendation must come first so the examiner immediately knows your position.',
    sortRows: [
      { text: 'State your recommendation in the first sentence.', target: 'Strong' },
      { text: 'List three possible options without recommending one.', target: 'Weak' },
      { text: 'Give one specific reason your advice will solve the problem.', target: 'Strong' },
      { text: 'Use "maybe" and "possibly" to soften every suggestion.', target: 'Weak' },
    ],
    sortCategories: ['Strong', 'Weak'],
    sortCorrect: 'Correct. Early commitment and specific reasoning are the two markers of a strong Task 1 response. Listing options and over-hedging are the two most common Task 1 weaknesses.',
    sortWrong: 'Check again. Listing options signals indecision. Hedging language does not score higher for politeness -- it scores lower for Task Fulfilment.',
    whyText: `CELPIP Speaking Task 1 is scored on Task Fulfilment, Coherence and Cohesion, and Vocabulary and Grammar. A response that gives a clear recommendation in the first sentence, supports it with one specific reason, and closes with a practical next step achieves the Task Fulfilment requirement efficiently and leaves speaking time for elaboration rather than preamble.`,
  },

  'seo-2026-03-25-37-celpip-speaking-celpip-speaking-task-2-storytelling-control': {
    title: 'CELPIP Speaking Task 2 Storytelling Control',
    intro: 'CELPIP Speaking Task 2 asks you to tell a story based on pictures. The key is controlling your narrative so it has a clear beginning, middle, and end within 60 seconds -- without running out of things to say or losing the thread.',
    weakExample: '"So there is a person and they are doing something and then something happens and it is a problem and then at the end it gets better."',
    strongExample: '"In the first image, a young woman is rushing out of her apartment with her work bag, looking anxious. By the second image, she has missed the bus and is standing alone at the stop. In the final scene, a colleague is pulling over to offer her a ride, and she looks relieved."',
    patternRows: [
      { pattern: 'Image-by-image structure', meaning: 'Narrate one image per sentence block', example: '"In the first picture... In the second... In the final image..."' },
      { pattern: 'Character and emotion', meaning: 'Name the person and their emotional state', example: '"A middle-aged man looks frustrated as he waits in a long queue."' },
      { pattern: 'Cause and consequence', meaning: 'Link images with cause and consequence language', example: '"Because the alarm did not go off, she arrived 20 minutes late to the interview."' },
      { pattern: 'Story arc', meaning: 'Tension in the middle image; resolution in the final image', example: '"The problem is resolved when the manager agrees to reschedule."' },
    ],
    mistakes: [
      { label: 'Describing not narrating', weak: 'There is a table. There is a chair. There is a window.', strong: 'A man sits alone at a table, staring out the window, clearly waiting for someone who has not arrived.', fix: 'Combine objects into a scene with a character whose situation gives the story meaning.' },
      { label: 'Losing the thread', weak: 'So in the first picture... and then... I am not sure what happens next...', strong: 'By the second image, the conflict has escalated and the outcome is unclear.', fix: 'Prepare a fallback phrase for uncertain images: "By this point in the story..." anchors you without claiming certainty.' },
      { label: 'No resolution', weak: 'And that is the end of the story.', strong: 'The story ends with the two colleagues shaking hands, suggesting the disagreement has been resolved.', fix: 'Interpret the final image as a resolution even if it is ambiguous. Examiners reward narrative closure.' },
    ],
    choiceOptions: [
      '"There is a person in the picture and they are doing things and something is happening."',
      '"In the first image, a woman looks worried as she checks her phone outside a hospital. By the final scene, she is smiling at a doctor in a corridor, suggesting good news."',
      '"I see a building and some people and maybe they are talking or something like that."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 names a character, describes an emotion, uses image-by-image structure, and provides narrative closure.',
    choiceWrong: 'Not quite. Options 1 and 3 describe objects without characters, emotions, or story arcs.',
    orderChunks: ['Set the scene in the first image with a character and situation,', '||', 'describe the conflict or development in the middle image,', '||', 'then resolve the story in the final image.'],
    orderAnswer: 'Set the scene in the first image with a character and situation,||describe the conflict or development in the middle image,||then resolve the story in the final image.',
    orderCorrect: 'Correct. Scene-setting opens the narrative; conflict develops it; resolution closes it. This three-part arc covers Task Fulfilment.',
    orderWrong: 'Not yet. Scene-setting comes first because it establishes the character and context that make the conflict meaningful.',
    sortRows: [
      { text: 'Name a character and describe their emotional state in each image.', target: 'Effective' },
      { text: 'List the objects in each image without connecting them.', target: 'Ineffective' },
      { text: 'Use cause-and-consequence language to link images.', target: 'Effective' },
      { text: 'End the story with "and that is all I see" when the final image is unclear.', target: 'Ineffective' },
    ],
    sortCategories: ['Effective', 'Ineffective'],
    sortCorrect: 'Correct. Character emotion and cause-consequence links are the two narrative tools that distinguish a story from a description. Object listing and no-resolution endings score below CLB 8.',
    sortWrong: 'Check again. Object listing is description, not narration. "That is all I see" abandons the narrative requirement of Task 2.',
    whyText: `CELPIP Speaking Task 2 is a narrative task, not a description task. Candidates who list objects score below CLB 8 on Coherence and Cohesion because there is no discernible story structure. A three-part arc -- scene, conflict, resolution -- fulfils the task requirement and gives the examiner the cohesive structure they are looking for even when the image sequence is ambiguous.`,
  },

  'seo-2026-03-25-38-celpip-speaking-celpip-speaking-task-3-scene-description-precision': {
    title: 'CELPIP Speaking Task 3 Scene Description Precision',
    intro: 'CELPIP Speaking Task 3 asks you to describe a photograph in detail. Precision in vocabulary and spatial language separates CLB 8 responses from CLB 9. This lesson teaches you to move from general to specific systematically.',
    weakExample: '"There are some people in a place and it looks like they are doing things outside."',
    strongExample: '"In the foreground, two children in school uniforms are crouching beside a vegetable patch. Behind them, a teacher is kneeling on the grass and pointing toward the plants. In the background, a school building is partially visible through a row of trees."',
    patternRows: [
      { pattern: 'Foreground to background', meaning: 'Describe from the closest elements to the most distant', example: '"In the foreground... In the middle ground... In the background..."' },
      { pattern: 'Specific nouns', meaning: 'Replace "a person" with their visible role or identifying feature', example: '"A woman in a white lab coat" not "a person"' },
      { pattern: 'Activity + manner', meaning: 'Say what they are doing and how', example: '"A man is cycling quickly along a narrow path" not "a man is on a bike"' },
      { pattern: 'Atmosphere phrase', meaning: 'Add one phrase describing the mood or setting quality', example: '"The scene has a calm, early-morning quality" or "The setting appears to be a busy urban market."' },
    ],
    mistakes: [
      { label: 'Vague location', weak: 'There are people somewhere outside.', strong: 'A group of six adults is gathered around a picnic table in what appears to be a public park.', fix: 'Use spatial language (in the foreground, at the centre, to the left) and location descriptors (public park, indoor market).' },
      { label: 'Only stating the obvious', weak: 'A woman is standing. A man is sitting. There is a table.', strong: 'A woman in a dark blazer is leaning forward across a table, gesturing toward a document, while a man across from her listens attentively.', fix: 'Add manner (how), posture, and visible relationship between people to move beyond surface description.' },
      { label: 'Single-tense monotony', weak: 'The woman is standing. The man is sitting. The child is playing.', strong: 'The woman stands at the front while two students remain seated at their desks, reviewing notes.', fix: 'Mix simple present and present continuous. "Stands" and "remains" add variety alongside "is reviewing".' },
    ],
    choiceOptions: [
      '"There are some people in a room doing stuff."',
      '"In the foreground, a man in an orange safety vest is crouching beside a large pipe, inspecting it carefully. Behind him, two colleagues in hard hats are consulting a document."',
      '"I see people and a building and maybe some trees or something."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 uses spatial language, specific nouns (safety vest, hard hats, pipe), an activity with manner (inspecting carefully), and foreground-to-background structure.',
    choiceWrong: 'Not quite. Options 1 and 3 use vague nouns and no spatial structure.',
    orderChunks: ['Describe the foreground subject with a specific noun and activity,', '||', 'describe the middle ground with any relationship or interaction,', '||', 'then note the background setting or atmosphere.'],
    orderAnswer: 'Describe the foreground subject with a specific noun and activity,||describe the middle ground with any relationship or interaction,||then note the background setting or atmosphere.',
    orderCorrect: 'Correct. Foreground first anchors the listener; middle ground develops the scene; background completes the spatial picture.',
    orderWrong: 'Not yet. Starting with the foreground gives the listener a clear anchor point before adding spatial layers.',
    sortRows: [
      { text: 'Use "In the foreground..." to anchor your description spatially.', target: 'Precise' },
      { text: 'Say "there are people" without identifying role, position, or activity.', target: 'Vague' },
      { text: 'Describe how a person is performing their activity, not just that they are doing it.', target: 'Precise' },
      { text: 'List each object separately without connecting them into a scene.', target: 'Vague' },
    ],
    sortCategories: ['Precise', 'Vague'],
    sortCorrect: 'Correct. Spatial anchors and activity-manner descriptions are the two precision tools that characterise CLB 9 Task 3 responses.',
    sortWrong: 'Check again. "There are people" without context is the most common Task 3 low-precision pattern. Unconnected lists score below CLB 8 on Coherence.',
    whyText: `CELPIP Speaking Task 3 is assessed on the quality and precision of description, not just the quantity of words. Candidates who use spatial structure (foreground, background), specific nouns (role, clothing, object), and activity-manner combinations consistently score CLB 9 on Vocabulary and Coherence, while those who rely on "there are people doing things" remain at CLB 7-8.`,
  },

  'seo-2026-03-25-39-celpip-speaking-celpip-speaking-task-4-prediction-language': {
    title: 'CELPIP Speaking Task 4 Prediction Language',
    intro: 'CELPIP Speaking Task 4 asks you to make predictions about a future situation based on the information provided. Accurate modal usage and evidence-linking are the two markers of a CLB 9 response.',
    weakExample: '"I think maybe things will get better or maybe they will get worse. It is hard to say."',
    strongExample: '"Based on the trend shown, enrollment is likely to increase by approximately 15% over the next three years, primarily because the new transit line will reduce commute time for students from the eastern suburbs."',
    patternRows: [
      { pattern: 'Evidence-based prediction', meaning: 'Link your prediction explicitly to the data or scenario given', example: '"Given the steady rise in applicants since 2022, demand will likely exceed capacity within two years."' },
      { pattern: 'Graded certainty', meaning: 'Use "will", "is likely to", "may", "could" to show confidence level', example: '"Sales will increase" (certain); "Sales are likely to increase" (probable); "Sales may increase" (possible)' },
      { pattern: 'Quantity or timeframe', meaning: 'Add a specific number or timeframe to anchor the prediction', example: '"Ridership is expected to rise by 20% within 18 months of the station opening."' },
      { pattern: 'Consequence chain', meaning: 'Extend the prediction with a second-order consequence', example: '"As demand increases, prices will rise, which may reduce affordability for first-time buyers."' },
    ],
    mistakes: [
      { label: 'Prediction without evidence', weak: 'I think the company will do well in the future.', strong: 'Given the 40% year-over-year growth in online sales, the company is likely to expand its warehouse capacity within 12 months.', fix: 'Every prediction should name the evidence that supports it.' },
      { label: 'Flat certainty', weak: 'Everything will definitely be fine.', strong: 'Revenue will probably recover by Q3, assuming the supply chain disruptions resolve as expected.', fix: 'Absolute certainty about future events reduces credibility. Use "probably", "likely", "is expected to".' },
      { label: 'No timeframe', weak: 'The situation will improve.', strong: 'The situation is expected to stabilise within six months as the new policy takes effect.', fix: 'Add a timeframe ("within six months", "by 2028") to make the prediction specific and evaluable.' },
    ],
    choiceOptions: [
      '"Things will probably get better or worse, it is hard to know."',
      '"Based on the projected population growth, housing demand in the region is likely to increase by 25% over the next decade, putting pressure on construction timelines."',
      '"I am not sure what will happen but maybe something will change."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 cites evidence (population growth), uses a graded modal (likely to), adds a quantity (25%) and timeframe (next decade), and extends to a consequence (construction pressure).',
    choiceWrong: 'Not quite. Options 1 and 3 make no evidence link and use "maybe" or "hard to know" without any grounded prediction.',
    orderChunks: ['Cite the evidence from the scenario,', '||', 'state the prediction with an appropriate modal,', '||', 'then add a timeframe or quantity to anchor it.'],
    orderAnswer: 'Cite the evidence from the scenario,||state the prediction with an appropriate modal,||then add a timeframe or quantity to anchor it.',
    orderCorrect: 'Correct. Evidence first shows you are responding to the task; the modal carries the prediction; the timeframe makes it specific.',
    orderWrong: 'Not yet. Evidence must come first to show the prediction is grounded in the scenario, not invented.',
    sortRows: [
      { text: 'Link your prediction explicitly to evidence in the scenario.', target: 'Strong' },
      { text: 'Make a prediction with no reference to the given information.', target: 'Weak' },
      { text: 'Use "is likely to" or "is expected to" rather than a flat "will".', target: 'Strong' },
      { text: 'Say "maybe it will get better" without a timeframe or evidence.', target: 'Weak' },
    ],
    sortCategories: ['Strong', 'Weak'],
    sortCorrect: 'Correct. Evidence links and graded modals are the two hallmarks of CLB 9 Task 4 predictions. Evidenceless predictions and unanchored "maybe" statements score at CLB 7.',
    sortWrong: 'Check again. Predictions without evidence do not fulfil the task requirement. "Maybe it will get better" does not meet the CLB 9 specificity standard.',
    whyText: `CELPIP Speaking Task 4 tests your ability to interpret a situation and project it forward. The examiner is looking for evidence-based reasoning, appropriate modal usage, and specificity. Candidates who say "I think things will improve" without evidence or a timeframe score CLB 7 on Task Fulfilment. Adding one evidence link, one graded modal, and one timeframe converts a vague prediction into a CLB 9 response.`,
  },

  'seo-2026-03-25-40-celpip-speaking-celpip-speaking-task-5-comparison-framework': {
    title: 'CELPIP Speaking Task 5 Comparison Framework',
    intro: 'CELPIP Speaking Task 5 asks you to compare two options and make a recommendation. The strongest responses give a direct comparison on two or three specific criteria, then commit to one option with a clear reason.',
    weakExample: '"Both options have advantages and disadvantages. It depends on the person."',
    strongExample: '"Option A is the better choice for a young professional because it is 40% cheaper and located 10 minutes from the downtown transit hub, whereas Option B costs more and requires a car. Unless you prioritise outdoor space, Option A is clearly the stronger value."',
    patternRows: [
      { pattern: 'Criterion-by-criterion', meaning: 'Compare both options on the same feature before moving to the next', example: '"On cost, Option A is $800/month versus Option B at $1,100/month. On commute time, Option A is 15 minutes versus Option B at 45 minutes."' },
      { pattern: 'Contrastive connectors', meaning: 'Use "whereas", "while", "in contrast", "on the other hand"', example: '"Option A offers a shorter commute, whereas Option B provides more living space."' },
      { pattern: 'Commit to one option', meaning: 'End with a clear recommendation, not "it depends"', example: '"For a commuter prioritising time, Option A is the stronger choice."' },
      { pattern: 'Target audience qualifier', meaning: 'Name who your recommendation best serves', example: '"For a family with children, Option B\'s larger garden outweighs the cost difference."' },
    ],
    mistakes: [
      { label: '"It depends" non-answer', weak: 'Both options are good, it really depends on what you want.', strong: 'For someone who commutes daily and wants to keep costs low, Option A is clearly preferable.', fix: 'Name the target profile and commit. "It depends" is scored as a lack of Task Fulfilment.' },
      { label: 'Listing, not comparing', weak: 'Option A has a pool. Option B has a balcony. Option A is near a park.', strong: 'Both options have outdoor amenities: Option A has a pool suited for summer use, while Option B\'s balcony offers year-round flexibility.', fix: 'Put both options in the same sentence for each criterion to create a genuine comparison.' },
      { label: 'No recommendation', weak: 'I have described both options and they each have good features.', strong: 'Given the cost difference and commute advantage, Option A is the more practical choice for a first-time renter.', fix: 'The task requires a recommendation. Describe and then commit.' },
    ],
    choiceOptions: [
      '"Both options are okay. It really depends on the person and what they need."',
      '"For a student on a budget, Option A is the stronger choice: it is $300 cheaper per month and within walking distance of the university, whereas Option B requires a 40-minute bus ride."',
      '"Option A has some good things and Option B also has good things and bad things so it is hard to say which one."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 names a target (student on a budget), compares on a specific criterion (cost, distance), uses "whereas" for contrast, and commits to a recommendation.',
    choiceWrong: 'Not quite. Options 1 and 3 use "it depends" or "hard to say" which do not meet the Task 5 requirement to make a recommendation.',
    orderChunks: ['Compare both options on the most important criterion,', '||', 'add a second criterion with a contrastive connector,', '||', 'then commit to one option and name who it best serves.'],
    orderAnswer: 'Compare both options on the most important criterion,||add a second criterion with a contrastive connector,||then commit to one option and name who it best serves.',
    orderCorrect: 'Correct. Leading with the key criterion anchors the comparison; the second criterion shows breadth; the recommendation with a target profile fulfils the task.',
    orderWrong: 'Not yet. The most important criterion comes first so the recommendation is supported by the strongest evidence.',
    sortRows: [
      { text: 'Compare both options on the same criterion in one sentence using "whereas".', target: 'Effective' },
      { text: 'Say "it depends on the person" and describe each option separately.', target: 'Ineffective' },
      { text: 'End with a clear recommendation naming who it best serves.', target: 'Effective' },
      { text: 'List features of each option without directly comparing them.', target: 'Ineffective' },
    ],
    sortCategories: ['Effective', 'Ineffective'],
    sortCorrect: 'Correct. Criterion-by-criterion comparison with "whereas" and a targeted recommendation are the two hallmarks of a CLB 9 Task 5 response.',
    sortWrong: 'Check again. "It depends" and feature lists without comparison are the two most common Task 5 scoring weaknesses.',
    whyText: `CELPIP Speaking Task 5 tests comparative reasoning and commitment. Candidates who say "it depends" without naming the dependency profile score CLB 7 on Task Fulfilment. The task explicitly asks for a recommendation, which requires choosing one option. A criterion-by-criterion comparison followed by a targeted recommendation ("for X, Option A is better because...") meets the CLB 9 standard for both Task Fulfilment and Coherence.`,
  },

  'seo-2026-03-25-41-celpip-speaking-celpip-speaking-task-6-difficult-situation-response': {
    title: 'CELPIP Speaking Task 6 Difficult Situation Response',
    intro: 'CELPIP Speaking Task 6 presents a problem situation and asks how you would respond. CLB 9 responses identify the core issue, state a response strategy, and show interpersonal awareness. Vague reassurances score below CLB 8.',
    weakExample: '"I would just try to talk to them and hopefully the problem would go away eventually."',
    strongExample: '"I would request a private meeting with my colleague to address the miscommunication directly. I would explain my perspective, listen to their concerns, and propose a clear division of responsibilities going forward to prevent the same issue from recurring."',
    patternRows: [
      { pattern: 'Identify the core issue', meaning: 'Name the specific problem before proposing a response', example: '"The core issue is that the miscommunication created conflicting expectations about who owned the deliverable."' },
      { pattern: 'Step-by-step response', meaning: 'Give two or three ordered steps, not a single vague action', example: '"First, I would request a meeting. Then, I would present the timeline. Finally, I would agree on a revised deadline."' },
      { pattern: 'Interpersonal awareness', meaning: 'Acknowledge the other person\'s perspective or feelings', example: '"I understand my colleague may feel frustrated, so I would choose a private setting to avoid public embarrassment."' },
      { pattern: 'Resolution clause', meaning: 'End with what the situation will look like after your response', example: '"The goal is to leave the meeting with a written agreement on roles so this does not repeat."' },
    ],
    mistakes: [
      { label: 'Single vague action', weak: 'I would just talk to them and fix the problem.', strong: 'I would schedule a 15-minute one-on-one, share specific examples of the conflict, and agree on a protocol for future handoffs.', fix: 'A specific, sequenced response with concrete details scores CLB 9. "Talk to them" does not.' },
      { label: 'No acknowledgement of the other person', weak: 'I would tell them what they did wrong and what they need to fix.', strong: 'I would invite them to share their perspective before explaining mine, to ensure I have the full picture.', fix: 'Task 6 scenarios often involve interpersonal conflict. Showing awareness of the other party\'s experience is scored under Coherence.' },
      { label: 'No resolution clause', weak: 'I would handle the situation and move on.', strong: 'The resolution is a written agreement on roles that both parties sign, so there is a clear reference point for future conflicts.', fix: 'A concrete resolution shows the examiner your response is complete, not just started.' },
    ],
    choiceOptions: [
      '"I would try to fix it somehow and hope the situation gets better."',
      '"I would schedule a brief meeting with both parties, outline the specific points of disagreement using the email record, and propose a revised timeline with clear ownership of each task."',
      '"I think it is a bad situation but maybe someone else can deal with it if it gets worse."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 names a specific action (meeting), uses evidence (email record), and proposes a concrete resolution (revised timeline with ownership).',
    choiceWrong: 'Not quite. Options 1 and 3 give no specific action or evidence, and Option 3 avoids responsibility entirely.',
    orderChunks: ['Identify the core issue in one sentence,', '||', 'describe your two-step response,', '||', 'then state the resolution goal.'],
    orderAnswer: 'Identify the core issue in one sentence,||describe your two-step response,||then state the resolution goal.',
    orderCorrect: 'Correct. Naming the issue shows Task Fulfilment; the response steps show Coherence; the resolution goal shows completeness.',
    orderWrong: 'Not yet. Identifying the issue first anchors your response in the specific scenario rather than a generic strategy.',
    sortRows: [
      { text: 'Give two or three ordered steps to resolve the situation.', target: 'Strong' },
      { text: 'Say "I would just talk to them" without further specifics.', target: 'Weak' },
      { text: 'Acknowledge the other person\'s perspective before presenting yours.', target: 'Strong' },
      { text: 'End without stating what a successful resolution looks like.', target: 'Weak' },
    ],
    sortCategories: ['Strong', 'Weak'],
    sortCorrect: 'Correct. Ordered steps and perspective acknowledgement are the two hallmarks of a CLB 9 Task 6 response. Vague single actions and no resolution clause are the two most common weaknesses.',
    sortWrong: 'Check again. "Talk to them" without specifics does not meet the CLB 9 requirement. Ending without a resolution clause signals an incomplete response.',
    whyText: `CELPIP Speaking Task 6 is an interpersonal problem-solving task. The examiner is looking for situational awareness, a structured response, and a clear resolution goal. Candidates who give one vague action ("I would just talk to them") score CLB 7 on Task Fulfilment. A three-part response (core issue, ordered steps, resolution goal) with interpersonal awareness reliably achieves CLB 9.`,
  },

  'seo-2026-03-25-42-celpip-speaking-celpip-speaking-task-7-opinion-depth-strategy': {
    title: 'CELPIP Speaking Task 7 Opinion Depth Strategy',
    intro: 'CELPIP Speaking Task 7 asks for your opinion on a topic with some personal or societal relevance. CLB 9 responses give a clear position, one developed reason, and a concrete example or evidence. Surface-level opinions with no development score below CLB 8.',
    weakExample: '"I think it is a good idea because it has a lot of benefits and can help many people in different ways."',
    strongExample: '"I strongly support flexible work arrangements because they measurably reduce employee burnout. In a 2023 survey of Canadian tech workers, those with flexible hours reported 30% lower rates of stress-related absences compared to those on fixed schedules. That outcome alone makes the policy worth implementing."',
    patternRows: [
      { pattern: 'Position in sentence 1', meaning: 'State your opinion before giving any reasons', example: '"I firmly believe that mandatory language training benefits immigrant workers more than voluntary programs."' },
      { pattern: 'One developed reason', meaning: 'Give one reason with an explanation, not three bare reasons', example: '"The primary reason is that mandatory enrollment removes the stigma associated with self-identifying as a language learner."' },
      { pattern: 'Concrete example', meaning: 'Add a specific example, statistic, or personal experience', example: '"In my own workplace, a colleague who completed a mandatory onboarding program was more willing to ask for clarification than those who self-enrolled."' },
      { pattern: 'Closing restatement', meaning: 'Restate your position in one sentence at the end', example: '"For these reasons, I believe mandatory programs produce stronger long-term outcomes than optional ones."' },
    ],
    mistakes: [
      { label: 'Three reasons, no depth', weak: 'It is good because it saves time, money, and helps people.', strong: 'The primary reason I support this is the time saved: a 30-minute daily commute eliminated over a year saves approximately 130 hours -- equivalent to more than three full work weeks.', fix: 'Pick one reason and develop it fully rather than listing three reasons at surface level.' },
      { label: 'No example', weak: 'It has many benefits for people in many different situations.', strong: 'For example, a nurse who works 12-hour shifts benefits more from flexible start times than from a salary increase, according to retention data from Ontario hospitals.', fix: 'Every opinion benefit from a concrete example. Use "for example", "in my experience", or a specific data point.' },
      { label: 'Weak position signal', weak: 'I think maybe it could be a good idea.', strong: 'I strongly support this policy for one specific reason.', fix: 'Remove "maybe" from your position statement. Confidence in your stated opinion is scored under Task Fulfilment.' },
    ],
    choiceOptions: [
      '"I think it is probably a good idea because there are many benefits and it can help people."',
      '"I firmly support universal childcare funding because it directly enables workforce participation among parents of young children -- a demographic that currently has the highest rates of underemployment in Canada."',
      '"I am not sure but maybe it could work if people support it and the government does the right things."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 states a clear position, gives one specific reason, and provides concrete supporting evidence (underemployment data for a named demographic).',
    choiceWrong: 'Not quite. Options 1 and 3 hedge the position and offer no specific reason or evidence.',
    orderChunks: ['State your position clearly in the first sentence,', '||', 'develop one specific reason with an explanation,', '||', 'then add a concrete example or data point to support it.'],
    orderAnswer: 'State your position clearly in the first sentence,||develop one specific reason with an explanation,||then add a concrete example or data point to support it.',
    orderCorrect: 'Correct. Position first earns Task Fulfilment; one developed reason earns Coherence; the example earns Vocabulary range and credibility.',
    orderWrong: 'Not yet. Your position must come first so the examiner immediately knows your stance.',
    sortRows: [
      { text: 'State your position in the first sentence without hedging.', target: 'Strong' },
      { text: 'List three benefits without developing any of them.', target: 'Weak' },
      { text: 'Support your reason with a specific example or data point.', target: 'Strong' },
      { text: 'Use "maybe" or "I think possibly" in your position statement.', target: 'Weak' },
    ],
    sortCategories: ['Strong', 'Weak'],
    sortCorrect: 'Correct. Clear positioning and evidence-backed development are the two hallmarks of a CLB 9 Task 7 response. Undeveloped lists and hedged positions score at CLB 7.',
    sortWrong: 'Check again. Listing three benefits is not the same as developing one well. Hedging your position signals uncertainty that the examiner scores as low Task Fulfilment.',
    whyText: `CELPIP Speaking Task 7 assesses depth of reasoning, not breadth of reasons. Candidates who list three or four benefits at surface level rarely score above CLB 8 on Coherence and Cohesion because there is no development chain to follow. One position, one developed reason with an explanation, and one concrete example is the CLB 9 structure -- and it takes approximately 45-55 seconds, which fits naturally within the task time.`,
  },

  'seo-2026-03-25-43-celpip-reading-celpip-reading-keyword-to-evidence-matching': {
    title: 'CELPIP Reading Keyword to Evidence Matching',
    intro: 'Most CELPIP Reading errors happen because candidates match the topic of a question to a passage section but do not confirm the specific evidence. This lesson teaches exact keyword-to-evidence matching to eliminate guessing.',
    weakExample: '"The question mentions pricing, so I chose the paragraph about the product."',
    strongExample: '"The question asks about the reason for the price increase. I found the sentence \'The increase reflects rising raw material costs, not a change in profit margin.\' The answer must be raw material costs, not profit margin."',
    patternRows: [
      { pattern: 'Keyword extraction', meaning: 'Underline the 2-3 key content words in the question', example: 'Question: "What caused the delay in construction?" Keywords: caused, delay, construction' },
      { pattern: 'Scan not read', meaning: 'Move your eye quickly until the keyword or its synonym appears', example: 'Scan for "delay", "construction", "postpone", "halt" -- any synonym of the keyword' },
      { pattern: 'Evidence sentence', meaning: 'Find the specific sentence that contains the answer; do not paraphrase the paragraph', example: '"Due to material shortages, the project was postponed by six months." This sentence directly answers the question.' },
      { pattern: 'Distractor check', meaning: 'Before selecting, verify the other options are not supported by this sentence', example: 'The sentence mentions "shortages" but not "budget" or "weather" -- reject those options.' },
    ],
    mistakes: [
      { label: 'Topic matching not evidence matching', weak: 'The paragraph is about pricing so I picked the pricing answer.', strong: 'The paragraph mentions "raw material costs" as the cause; the answer must use that phrasing or a direct synonym.', fix: 'CELPIP distractors are usually on the same topic as the correct answer. Evidence matching, not topic matching, distinguishes them.' },
      { label: 'Reading instead of scanning', weak: 'I read the whole passage twice and ran out of time.', strong: 'I extracted three keywords from the question and scanned for any synonym in the passage.', fix: 'Scanning moves three to four times faster than reading. CELPIP Reading is timed -- scanning is required, not optional.' },
      { label: 'Synonym blindness', weak: 'The question uses "postpone" but I only looked for "postpone" in the passage.', strong: 'The passage uses "delayed" -- a synonym -- which answers the question about being postponed.', fix: 'Prepare a mental synonym set for common exam topics: delayed/postponed/halted; cost/price/fee; require/need/necessitate.' },
    ],
    choiceOptions: [
      'Read the whole passage to understand the topic before answering any question.',
      'Extract keywords from the question, scan for them in the passage, then find the specific evidence sentence.',
      'Choose the answer option that matches the general theme of the closest paragraph.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes exact keyword-to-evidence matching: extract, scan, find the specific sentence.',
    choiceWrong: 'Not quite. Reading the whole passage first is too slow under time pressure. Theme matching without evidence verification is the most common CELPIP Reading error.',
    orderChunks: ['Underline the 2-3 key content words in the question,', '||', 'scan the passage for those words or their synonyms,', '||', 'then locate the specific sentence that answers the question.'],
    orderAnswer: 'Underline the 2-3 key content words in the question,||scan the passage for those words or their synonyms,||then locate the specific sentence that answers the question.',
    orderCorrect: 'Correct. Extraction gives you a target; scanning finds it; the specific sentence is the answer anchor.',
    orderWrong: 'Not yet. Keyword extraction comes first because it defines what you are scanning for.',
    sortRows: [
      { text: 'Extract 2-3 keywords from the question before touching the passage.', target: 'Effective' },
      { text: 'Read the passage in full before attempting any question.', target: 'Slow' },
      { text: 'Look for synonyms of your keywords as well as exact matches.', target: 'Effective' },
      { text: 'Pick the answer that is on the same topic as the question without finding the evidence sentence.', target: 'Slow' },
    ],
    sortCategories: ['Effective', 'Slow'],
    sortCorrect: 'Correct. Keyword extraction and synonym scanning are the two techniques that distinguish fast, accurate CELPIP Reading responses from slow, error-prone ones.',
    sortWrong: 'Check again. Full-passage reading is too slow under time pressure. Topic matching without evidence is the most common Reading error pattern.',
    whyText: `CELPIP Reading is designed to test whether you can locate specific information quickly, not whether you can understand a passage after reading it three times. The keyword-to-evidence matching method converts a comprehension task into a targeted search task, which is both faster and more accurate. Candidates who use this approach consistently reduce their error rate on information-location questions by identifying the exact evidence sentence rather than inferring from the paragraph topic.`,
  },

  'seo-2026-03-25-44-celpip-reading-celpip-reading-time-control-by-question-type': {
    title: 'CELPIP Reading Time Control by Question Type',
    intro: 'CELPIP Reading has multiple question types with different difficulty levels and time costs. Allocating time by question type prevents over-spending on hard questions and under-spending on easy ones.',
    weakExample: '"I spent 4 minutes on the first question and then had to rush the last five."',
    strongExample: '"I spent 45 seconds on vocabulary questions, 90 seconds on detail questions, and skipped the inference question to return to it at the end."',
    patternRows: [
      { pattern: 'Vocabulary in context: 30-45s', meaning: 'Find the word, read the surrounding sentence, match the definition', example: 'Question: "What does \'adjacent\' mean in paragraph 2?" Find the sentence → match to the option that fits the context.' },
      { pattern: 'Detail/fact question: 60-90s', meaning: 'Extract keywords, scan, find evidence sentence', example: '"What reason does the author give for...?" Scan for the reason keyword, find the sentence, select the matching option.' },
      { pattern: 'Inference question: 90-120s', meaning: 'These require reading two or three sentences; budget more time', example: 'Inference questions often contain "implies", "suggests", "can be inferred". Flag and return if over 90 seconds.' },
      { pattern: 'Skip-and-return rule', meaning: 'If stuck after 90 seconds, mark and move on', example: 'Return to skipped questions in the final 2 minutes with remaining time.' },
    ],
    mistakes: [
      { label: 'Uniform time allocation', weak: 'I give every question the same amount of time regardless of type.', strong: 'I allocate 45 seconds to vocabulary questions and 90-120 seconds to inference questions.', fix: 'Vocabulary questions can be answered in under a minute; inference questions genuinely need more time. Allocating uniformly wastes time on easy questions.' },
      { label: 'Not skipping stuck questions', weak: 'I stayed on the difficult question until I answered it, even when it took 3 minutes.', strong: 'After 90 seconds on an inference question with no answer, I moved on and returned with fresh eyes.', fix: 'Returning to a difficult question with fresh context often resolves it faster than pressing through.' },
      { label: 'Answering from memory', weak: 'I answered from what I remembered reading, not from re-finding the evidence.', strong: 'Even for questions I thought I remembered, I re-scanned for the specific sentence before selecting.', fix: 'Memory is unreliable under test pressure. Re-scanning takes 10-20 seconds and prevents confident wrong answers.' },
    ],
    choiceOptions: [
      'Give every question exactly the same amount of time to be fair to all question types.',
      'Identify the question type first and allocate time accordingly: 45s for vocabulary, 90s for detail, 120s for inference.',
      'Answer all inference questions first because they are the most difficult.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes type-based time allocation, which is the most efficient Reading strategy.',
    choiceWrong: 'Not quite. Uniform time wastes fast slots and rushes slow ones. Answering inference questions first means starting with the highest-cost questions.',
    orderChunks: ['Identify the question type (vocabulary, detail, or inference),', '||', 'allocate the appropriate time budget for that type,', '||', 'then skip and return if you exceed the budget.'],
    orderAnswer: 'Identify the question type (vocabulary, detail, or inference),||allocate the appropriate time budget for that type,||then skip and return if you exceed the budget.',
    orderCorrect: 'Correct. Type identification drives time allocation; the budget prevents over-spending; the skip rule protects remaining questions.',
    orderWrong: 'Not yet. You must identify the type before you can allocate time correctly.',
    sortRows: [
      { text: 'Spend 30-45 seconds on vocabulary-in-context questions.', target: 'Efficient' },
      { text: 'Spend 3-4 minutes on a single inference question until you are sure.', target: 'Risky' },
      { text: 'Skip inference questions after 90 seconds and return at the end.', target: 'Efficient' },
      { text: 'Answer all questions in order without considering their type or time cost.', target: 'Risky' },
    ],
    sortCategories: ['Efficient', 'Risky'],
    sortCorrect: 'Correct. Fast vocabulary handling and the skip-and-return rule are the two most efficient CELPIP Reading time strategies. Lingering on inference questions and ignoring question type are the two most common time-loss patterns.',
    sortWrong: 'Check again. 3-4 minutes on one inference question leaves too little time for the remaining questions. Ignoring question type is a uniform-time strategy, which is suboptimal.',
    whyText: `CELPIP Reading tests speed and accuracy simultaneously. The time limit is designed so that candidates who use all their time on hard questions cannot finish the section. Type-based time allocation -- fast on vocabulary, medium on details, maximum on inference with a skip rule -- is the strategy that allows candidates to attempt every question rather than leaving the section incomplete.`,
  },

  'seo-2026-03-25-45-celpip-reading-celpip-reading-inference-question-strategy': {
    title: 'CELPIP Reading Inference Question Strategy',
    intro: 'Inference questions are the hardest question type in CELPIP Reading because the answer is not stated directly in the passage. This lesson gives you a three-step strategy to identify implicit meaning without guessing.',
    weakExample: '"The passage does not say this directly so I just guessed."',
    strongExample: '"The passage says the company \'paused new hires indefinitely\'. The question asks what this implies about the company\'s finances. The phrase \'paused indefinitely\' implies financial uncertainty, not a planned restructure."',
    patternRows: [
      { pattern: 'Locate the relevant passage section', meaning: 'Find the two or three sentences that the question references', example: 'Question: "What does the author imply about the policy?" Locate the paragraph where the policy is discussed.' },
      { pattern: 'Read for what is NOT said', meaning: 'Look at what is implied by word choice, not just what is stated', example: '"Paused indefinitely" implies uncertainty; "temporarily suspended" implies a planned return. The distinction is the inference.' },
      { pattern: 'Eliminate extreme options first', meaning: 'Inference answers are usually moderate. Reject options with "always", "never", "completely"', example: 'If an option says "the author completely opposes the policy", look for softer phrasing like "the author expresses concern".' },
      { pattern: 'Test each option against the text', meaning: 'Go back to the passage and verify each option is supported, not just plausible', example: 'An option may sound reasonable but is not actually supported by the passage text.' },
    ],
    mistakes: [
      { label: 'Using outside knowledge', weak: 'I chose the answer because it is what usually happens in this kind of situation.', strong: 'I chose the answer because it is the only option supported by the passage wording.', fix: 'CELPIP inference questions test what the text implies, not what is true in general. Outside knowledge can lead to selecting a plausible but unsupported option.' },
      { label: 'Choosing the most extreme option', weak: 'I chose "the author strongly opposes all government intervention" because the author criticised one policy.', strong: 'The author criticised the specific policy; the supported inference is "the author has reservations about this approach".', fix: 'Inference answers almost never include absolute language. If an option has "always", "never", "all", or "completely", it is almost always wrong.' },
      { label: 'Skipping back to the passage', weak: 'I answered the inference question from memory without returning to the text.', strong: 'I returned to the two sentences referenced by the question and checked each option against them.', fix: 'Inference questions require close reading of a short section. Memory alone is unreliable for word-choice nuance.' },
    ],
    choiceOptions: [
      'Choose the inference answer that seems most logical based on general knowledge.',
      'Locate the relevant passage sentences, read for implied meaning, then eliminate extreme options and verify the remaining one against the text.',
      'Choose the answer that repeats the most words from the question.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes the full inference strategy: locate, read for implication, eliminate extremes, verify against text.',
    choiceWrong: 'Not quite. General knowledge leads to plausible but unsupported answers. Keyword repetition in the answer option is a distractor technique, not a solution.',
    orderChunks: ['Locate the two or three passage sentences the question references,', '||', 'identify what is implied by the word choice in those sentences,', '||', 'then eliminate extreme options and verify the remaining answer against the text.'],
    orderAnswer: 'Locate the two or three passage sentences the question references,||identify what is implied by the word choice in those sentences,||then eliminate extreme options and verify the remaining answer against the text.',
    orderCorrect: 'Correct. Location anchors you in the right section; word-choice reading finds the implication; elimination and verification confirm the answer.',
    orderWrong: 'Not yet. You must locate the relevant sentences first so the implication is grounded in the actual passage text.',
    sortRows: [
      { text: 'Return to the specific passage sentences before selecting an inference answer.', target: 'Reliable' },
      { text: 'Choose the answer that seems most reasonable based on what usually happens.', target: 'Unreliable' },
      { text: 'Eliminate options with "always", "never", or "completely" first.', target: 'Reliable' },
      { text: 'Select the answer that uses the most words from the question stem.', target: 'Unreliable' },
    ],
    sortCategories: ['Reliable', 'Unreliable'],
    sortCorrect: 'Correct. Returning to the passage and eliminating extremes are the two most reliable inference strategies. Outside knowledge and keyword repetition are the two most common inference errors.',
    sortWrong: 'Check again. "What usually happens" is not what the text implies. Keyword repetition in an answer option is a deliberate distractor technique.',
    whyText: `CELPIP inference questions test whether you can read between the lines of a specific text, not whether you have general knowledge or can identify repeated vocabulary. The three-step strategy -- locate, read for implication, eliminate and verify -- converts the most difficult question type into a structured process that does not depend on instinct or guessing. Candidates who consistently apply this strategy see the most improvement in their Reading score with the fewest questions remaining unanswered.`,
  },

  'seo-2026-03-25-46-celpip-reading-celpip-reading-paragraph-purpose-recognition': {
    title: 'CELPIP Reading Paragraph Purpose Recognition',
    intro: 'Some CELPIP Reading questions ask about the purpose of a paragraph or section rather than a specific fact. Recognising the five paragraph purposes quickly eliminates wrong answers and speeds up response time.',
    weakExample: '"I read the whole paragraph again and still was not sure what it was trying to do."',
    strongExample: '"The paragraph starts with a claim, then gives two supporting examples, then ends with a qualifier. Its purpose is to support the author\'s position with evidence while acknowledging a limitation."',
    patternRows: [
      { pattern: 'Introduce (background)', meaning: 'The paragraph sets up context before the main argument', example: 'Starts with history, statistics, or definitions. No position is taken yet.' },
      { pattern: 'Argue (position)', meaning: 'The paragraph states a claim and supports it', example: 'Contains "therefore", "as a result", "this shows that", or a clear recommendation' },
      { pattern: 'Illustrate (example)', meaning: 'The paragraph provides a case study or example to support a previous claim', example: '"For example, in 2022, a Calgary hospital..." -- pure example, no new claim' },
      { pattern: 'Concede (counter-argument)', meaning: 'The paragraph acknowledges the opposing view before refuting it', example: 'Starts with "While some argue..." or "Critics contend that..." then pivots with "however"' },
      { pattern: 'Conclude (summary)', meaning: 'The paragraph restates the main position and closes the argument', example: 'Contains "in summary", "therefore", "ultimately" with no new evidence' },
    ],
    mistakes: [
      { label: 'Confusing illustration with argument', weak: 'The paragraph gives an example so it must be supporting a claim.', strong: 'The paragraph gives an example -- its purpose is to illustrate, not to argue. The argument was in the previous paragraph.', fix: 'An example paragraph does not contain a new claim. If it only has a case study or anecdote, its purpose is illustration.' },
      { label: 'Missing the concession pivot', weak: 'The paragraph starts with the opposing view so it must be against the author\'s position.', strong: 'The paragraph starts with the opposing view (concede) and then pivots with "however" to support the author\'s argument.', fix: 'Look for "however", "but", "despite this" after the opposing view to identify a concession paragraph.' },
      { label: 'Naming content not purpose', weak: 'The paragraph\'s purpose is to talk about hospital funding.', strong: 'The paragraph\'s purpose is to introduce the problem of funding gaps before the author\'s policy argument.', fix: 'Paragraph purpose is structural (introduce, argue, illustrate, concede, conclude), not topical.' },
    ],
    choiceOptions: [
      'Identify what topic the paragraph is about to determine its purpose.',
      'Look for the first sentence structure and key connective words to identify whether the paragraph introduces, argues, illustrates, concedes, or concludes.',
      'Read the whole paragraph twice to understand the full meaning before attempting to name its purpose.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes the structural signal approach: first sentence type and connective words identify purpose without full re-reading.',
    choiceWrong: 'Not quite. Topic identification names the content, not the purpose. Full re-reading is too slow under time pressure.',
    orderChunks: ['Read the first sentence to identify the paragraph\'s opening move,', '||', 'look for connective words (however, therefore, for example) that signal the purpose,', '||', 'then select the purpose from: introduce, argue, illustrate, concede, or conclude.'],
    orderAnswer: 'Read the first sentence to identify the paragraph\'s opening move,||look for connective words (however, therefore, for example) that signal the purpose,||then select the purpose from: introduce, argue, illustrate, concede, or conclude.',
    orderCorrect: 'Correct. The first sentence reveals the opening move; connective words confirm the purpose; the five-category framework gives you the answer choices.',
    orderWrong: 'Not yet. The first sentence comes first because paragraph purpose is usually signalled in the opening move.',
    sortRows: [
      { text: 'Use connective words like "however" and "therefore" to identify paragraph purpose.', target: 'Effective' },
      { text: 'Determine paragraph purpose by identifying its topic.', target: 'Ineffective' },
      { text: 'Check whether the paragraph contains a claim, an example, or a concession.', target: 'Effective' },
      { text: 'Re-read the paragraph in full before attempting to name its structural role.', target: 'Ineffective' },
    ],
    sortCategories: ['Effective', 'Ineffective'],
    sortCorrect: 'Correct. Connective words and structural content identification are the two fastest purpose-recognition tools. Topic identification and full re-reading are slow and do not directly answer purpose questions.',
    sortWrong: 'Check again. Topic and purpose are different: a paragraph about hospital funding can introduce, argue, illustrate, concede, or conclude. Full re-reading is too slow under time pressure.',
    whyText: `CELPIP Reading paragraph-purpose questions are structural, not topical. The fastest and most reliable strategy is to read the first sentence (to identify the opening move) and look for connective words (to confirm the role). The five-category framework -- introduce, argue, illustrate, concede, conclude -- covers all question options you will encounter. Candidates who memorise this framework and apply it structurally rather than topically answer purpose questions in under 60 seconds.`,
  },

  'seo-2026-03-25-47-celpip-listening-celpip-listening-note-capture-under-pressure': {
    title: 'CELPIP Listening Note Capture Under Pressure',
    intro: 'CELPIP Listening plays audio once. Candidates who try to write complete sentences miss the next key detail. This lesson teaches a compact note-capture system that captures what you need without sacrificing comprehension.',
    weakExample: '"I tried to write everything the speaker said and missed the main point entirely."',
    strongExample: '"I wrote: \"mgr + team -- Thurs 3pm -- budget cut 15% -- action: email by Fri\" and answered all four questions correctly."',
    patternRows: [
      { pattern: 'Symbols for common words', meaning: 'Replace frequent words with symbols to write faster', example: '"because" = bc; "therefore" = .". ; "increase" = up arrow; "decrease" = down arrow; "approximately" = ~' },
      { pattern: 'Subject-verb-object only', meaning: 'Capture who, what, and when; skip adjectives and filler', example: '"The new community centre will open next spring" → "CC open spring"' },
      { pattern: 'Number and name priority', meaning: 'Always capture numbers, names, dates, and locations verbatim', example: 'If the speaker says "$4.2 million by March 2026", write "$4.2M Mar26" -- exact values are answer anchors' },
      { pattern: 'New topic = new line', meaning: 'Start a new line when the speaker shifts topic to keep notes scannable', example: 'If the speaker moves from budget to staffing, start a new line: "staff: 3 new hires -- contracts -- Q3"' },
    ],
    mistakes: [
      { label: 'Writing sentences', weak: 'The manager told the team that the budget would be cut by 15 percent.', strong: 'mgr → team: budget -15%', fix: 'Full sentences while listening cause you to fall behind by two or three sentences. Symbols and abbreviations keep you current.' },
      { label: 'Capturing adjectives not numbers', weak: '"A significant budget reduction was announced for the upcoming quarter."', strong: '"budget -15% Q3"', fix: 'Adjectives like "significant" are answered by the number. Write the number, not the adjective.' },
      { label: 'Not separating topics', weak: 'All notes on one line, no topic breaks', strong: 'Budget line / Staffing line / Timeline line', fix: 'Scannable notes with topic separations let you find the answer to each question without re-reading everything.' },
    ],
    choiceOptions: [
      'Write complete sentences to capture everything the speaker says accurately.',
      'Use symbols and abbreviations to capture subject, verb, object, numbers, and names; start a new line for each new topic.',
      'Do not take notes -- focus entirely on listening and answer from memory.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes compact note capture: symbols, SVO structure, priority on numbers and names, and topic-based line breaks.',
    choiceWrong: 'Not quite. Complete sentences cause you to fall behind the speaker. Answering from memory is unreliable when audio plays once and questions ask for specific numbers or names.',
    orderChunks: ['Use symbols to replace common words and write faster,', '||', 'capture subject-verb-object plus any numbers or names verbatim,', '||', 'then start a new line each time the speaker shifts to a new topic.'],
    orderAnswer: 'Use symbols to replace common words and write faster,||capture subject-verb-object plus any numbers or names verbatim,||then start a new line each time the speaker shifts to a new topic.',
    orderCorrect: 'Correct. Speed (symbols) comes first; accuracy (SVO + numbers) comes second; scannability (topic lines) comes third.',
    orderWrong: 'Not yet. Writing speed must come first because falling behind the speaker makes accuracy irrelevant.',
    sortRows: [
      { text: 'Use an arrow symbol instead of writing "therefore" or "as a result".', target: 'Efficient' },
      { text: 'Write out every word the speaker says in full sentences.', target: 'Slow' },
      { text: 'Capture numbers and names verbatim even if you abbreviate everything else.', target: 'Efficient' },
      { text: 'Keep all notes on one continuous line to save time.', target: 'Slow' },
    ],
    sortCategories: ['Efficient', 'Slow'],
    sortCorrect: 'Correct. Symbol use and number/name verbatim capture are the two most efficient note habits. Full sentences and continuous lines are the two most common note-taking inefficiencies.',
    sortWrong: 'Check again. Full sentences cause you to fall behind the speaker. A single continuous line without topic breaks is hard to scan when answering questions.',
    whyText: `CELPIP Listening audio plays once. The note-taking challenge is not comprehension -- it is capture speed. Candidates who write full sentences consistently fall two or three sentences behind the speaker and miss key details. A compact note system (symbols, SVO structure, number priority, topic line breaks) keeps you current with the audio while creating a scannable reference for answering questions immediately after the recording ends.`,
  },

  'seo-2026-03-25-48-celpip-listening-celpip-listening-speaker-intention-signals': {
    title: 'CELPIP Listening Speaker Intention Signals',
    intro: 'Several CELPIP Listening questions ask about the speaker\'s intention, attitude, or tone. The answer is almost never in the words alone -- it is in the stress pattern, the contrast signal, or the qualifying phrase. This lesson teaches you to hear intention, not just content.',
    weakExample: '"The speaker said it was fine so I chose the positive answer, but that was wrong."',
    strongExample: '"The speaker said \'It\'s fine, I suppose\' with a falling intonation on \'suppose\' -- the qualifying hedge signals reluctant acceptance, not genuine approval."',
    patternRows: [
      { pattern: 'Hedge phrases = doubt or reluctance', meaning: 'Words like "I suppose", "I guess", "more or less", "in a way" signal the speaker does not fully mean what they say', example: '"The plan is workable, I suppose." → Intention: mild reluctance, not full endorsement.' },
      { pattern: 'Contrast signal = main intention follows', meaning: '"But", "however", "although", "that said" signal that the main point comes AFTER the connector', example: '"The location is convenient. However, the cost is prohibitive." → Main intention: concerns about cost.' },
      { pattern: 'Emphasis word = key point', meaning: 'A stressed word or "the real issue is", "what matters is" signals the speaker\'s focus', example: '"The REAL question is whether we can deliver on time." → Intention: focus on delivery timeline.' },
      { pattern: 'Rhetorical question = criticism or scepticism', meaning: 'A question the speaker answers themselves is often used to express doubt or disagreement', example: '"Can we really afford that? I don\'t think so." → Intention: opposition.' },
    ],
    mistakes: [
      { label: 'Taking words at face value', weak: '"The speaker said it was a good idea, so their intention is positive support."', strong: '"The speaker said \'it might be a good idea\' with a hedge -- their intention is uncertain or conditional support."', fix: 'In natural speech, "might be good" is significantly weaker than "is good". The modal and the stress carry intention.' },
      { label: 'Missing the contrast pivot', weak: '"The speaker praised the location, so the intention is to support the proposal."', strong: '"The speaker praised the location but then focused on the cost problem. The main intention is to raise a concern."', fix: 'Look for the contrast word ("but", "however") to find where the speaker\'s real point is.' },
      { label: 'Ignoring tone for content', weak: '"The speaker gave three advantages, so the intention must be to recommend."', strong: '"The speaker gave three advantages and then said \'but I\'m not convinced\' -- the intention is to express scepticism despite recognising the advantages."', fix: 'Intention questions are rarely answered by content alone. The tone modifier at the end of the turn carries the actual intention.' },
    ],
    choiceOptions: [
      'Focus on the main content words the speaker uses and choose the answer that matches the topic.',
      'Listen for hedge phrases, contrast signals, and emphasis words to identify what the speaker actually means, not just what they say.',
      'Choose the most positive intention answer if the speaker\'s words are generally positive.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes intention listening: hedge phrases, contrast signals, and emphasis words reveal actual intention beyond the surface content.',
    choiceWrong: 'Not quite. Content matching misses hedges. Positive words with hedge endings ("I suppose", "I guess") signal neutral or reluctant intention, not strong positive support.',
    orderChunks: ['Listen for hedge phrases that signal doubt or reluctance,', '||', 'identify the contrast signal ("but", "however") that precedes the main point,', '||', 'then select the intention that matches the signal, not just the surface content.'],
    orderAnswer: 'Listen for hedge phrases that signal doubt or reluctance,||identify the contrast signal ("but", "however") that precedes the main point,||then select the intention that matches the signal, not just the surface content.',
    orderCorrect: 'Correct. Hedges reveal attitude; contrast signals locate the main point; signal-based selection over-rides surface content.',
    orderWrong: 'Not yet. Hedge phrases come first because they immediately signal that the speaker does not fully mean what they appear to say.',
    sortRows: [
      { text: 'Treat "I suppose" and "I guess" as signals of reluctance, not agreement.', target: 'Accurate' },
      { text: 'Accept positive words at face value without checking for hedge endings.', target: 'Inaccurate' },
      { text: 'Look for "but" or "however" to identify where the speaker\'s real point is.', target: 'Accurate' },
      { text: 'Choose the most positive intention if the speaker mentions any positive aspect.', target: 'Inaccurate' },
    ],
    sortCategories: ['Accurate', 'Inaccurate'],
    sortCorrect: 'Correct. Hedge phrase recognition and contrast pivot identification are the two most reliable intention-reading strategies. Face-value acceptance and positivity bias are the two most common intention-question errors.',
    sortWrong: 'Check again. "I suppose" is a hedge signal, not agreement. Any positive aspect followed by "but" means the main intention comes after the "but".',
    whyText: `CELPIP Listening intention questions are designed to test whether you hear what speakers mean, not just what they say. Native English speech is full of pragmatic signals (hedges, pivots, emphases) that modify the literal meaning of words. Candidates who listen only for content miss these signals and consistently choose the wrong intention option. Training yourself to hear hedge phrases, contrast pivots, and emphasis markers converts the most subjective question type into a pattern-recognition task.`,
  },

  'seo-2026-03-25-49-celpip-listening-celpip-listening-recovery-after-missed-detail': {
    title: 'CELPIP Listening Recovery After Missed Detail',
    intro: 'In CELPIP Listening, you will miss something. The question is whether you recover or spiral. This lesson gives you a three-step recovery system that gets you back on track without losing the rest of the recording.',
    weakExample: '"I missed one detail, panicked, and spent so long trying to remember it that I missed the next three points."',
    strongExample: '"I missed a number, wrote a question mark, kept listening, answered the three other questions correctly, and guessed on the number from context."',
    patternRows: [
      { pattern: 'Accept and mark', meaning: 'Write a question mark for the missed detail and keep listening immediately', example: '"$?M by March" -- the number is marked as unknown; the date and context are captured' },
      { pattern: 'Context inference', meaning: 'Use surrounding details to narrow the answer when returning to missed detail', example: 'If the category is "small budget increase" and options are $2M, $10M, $50M -- $2M is the inference.' },
      { pattern: 'Move forward, not backward', meaning: 'Do not re-play the missed segment mentally -- continue with what is being said now', example: 'The next 30 seconds of audio contain new information worth more marks than recovering one missed detail.' },
      { pattern: 'Best guess is always better than blank', meaning: 'Use process of elimination to narrow to the most likely answer', example: 'If three options are clearly wrong from context, select the fourth even without direct evidence.' },
    ],
    mistakes: [
      { label: 'Mental replay loop', weak: 'I kept trying to remember the missed detail in my head while the speaker continued.', strong: 'I wrote "?" and immediately returned attention to the current speaker.', fix: 'Mental replay is silent attention cost. Every second spent replaying is a new detail missed.' },
      { label: 'Skipping context inference', weak: 'I left the question blank because I did not hear the exact answer.', strong: 'I narrowed the answer from two to one using the budget context and surrounding numbers.', fix: 'Context inference is not guessing -- it is using available evidence to narrow uncertainty.' },
      { label: 'Stopping all note-taking', weak: 'After missing a detail, I stopped writing notes because I was flustered.', strong: 'After writing "?", I continued the note-taking system as normal.', fix: 'The note-taking system exists precisely for moments of stress. Stopping it removes the support you need most.' },
    ],
    choiceOptions: [
      'Stop and mentally replay the missed section until you recover the detail.',
      'Write a question mark for the missed detail, keep listening to the current audio, and use context inference to narrow the answer when questions are displayed.',
      'Leave the question blank if you did not hear the exact answer.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes the full recovery system: mark, continue, and use context inference rather than stopping or leaving blank.',
    choiceWrong: 'Not quite. Mental replay causes further misses. Leaving blank forfeits a mark that context inference might have earned.',
    orderChunks: ['Write a question mark for the missed detail without pausing,', '||', 'continue listening to the remaining audio for new information,', '||', 'then use surrounding context to narrow the answer when reviewing your notes.'],
    orderAnswer: 'Write a question mark for the missed detail without pausing,||continue listening to the remaining audio for new information,||then use surrounding context to narrow the answer when reviewing your notes.',
    orderCorrect: 'Correct. Marking and continuing protects subsequent details; context inference recovers what was lost.',
    orderWrong: 'Not yet. The mark-and-continue step must happen immediately so no further details are lost to the recovery attempt.',
    sortRows: [
      { text: 'Write "?" for a missed detail and immediately return attention to the current speaker.', target: 'Recovery' },
      { text: 'Replay the missed segment mentally while the recording continues.', target: 'Spiral' },
      { text: 'Use surrounding context to narrow the answer for a marked unknown.', target: 'Recovery' },
      { text: 'Leave all questions blank where you did not hear the exact answer.', target: 'Spiral' },
    ],
    sortCategories: ['Recovery', 'Spiral'],
    sortCorrect: 'Correct. Mark-and-continue and context inference are the two recovery moves. Mental replay and leaving blanks are the two spiral patterns.',
    sortWrong: 'Check again. Mental replay during live audio causes a cascade of missed details. Context inference is how you recover -- blank answers forfeit marks that inference might earn.',
    whyText: `Every CELPIP Listening candidate misses a detail. The difference between CLB 8 and CLB 9 is not whether you miss something -- it is whether you recover. The mark-and-continue system (write "?", keep listening, use context inference) prevents one missed detail from becoming a cascade. Candidates who spiral after a miss consistently underperform relative to their actual comprehension ability because the recovery failure costs more marks than the original miss.`,
  },

  'seo-2026-03-25-50-celpip-listening-celpip-listening-prediction-before-audio-starts': {
    title: 'CELPIP Listening Prediction Before Audio Starts',
    intro: 'CELPIP Listening gives you a few seconds to read the question before the audio plays. Candidates who use this preview time to predict the answer type -- number, name, reason, or action -- find answers faster and miss fewer details.',
    weakExample: '"I read the question but I did not know what to listen for, so I tried to follow everything."',
    strongExample: '"The question asked \'How many participants attended?\' I predicted: number. I listened for any number in context with \'attend\' or \'people\' and found it immediately."',
    patternRows: [
      { pattern: 'Answer type prediction', meaning: 'Decide before the audio what kind of answer you need: number, name, date, reason, or action', example: '"What did the speaker recommend?" → predict: action verb + object ("register early", "contact the office")' },
      { pattern: 'Keyword anchors', meaning: 'Pick 2-3 words from the question to anchor your listening scan', example: '"Why did the company relocate?" → anchors: company, relocate, reason/because' },
      { pattern: 'Audio entry point prediction', meaning: 'Decide which part of the conversation likely contains the answer', example: '"At the end of the announcement, the speaker typically states the action step." -- position yourself to listen for it.' },
      { pattern: 'Distractor alertness', meaning: 'Once you hear your keyword, listen one sentence further before committing', example: 'The speaker may say "many thought the reason was cost -- but actually it was location." Listening one sentence further captures the real answer.' },
    ],
    mistakes: [
      { label: 'Reading but not predicting', weak: 'I read the question but just waited for the audio to start.', strong: 'I read the question, predicted the answer type (date), and prepared my keyword anchors (opened, launched, began).', fix: 'Prediction converts passive reading into active preparation. The extra 10 seconds of thinking before the audio replaces 20 seconds of searching during it.' },
      { label: 'Listening for everything', weak: 'I tried to understand everything the speaker said equally.', strong: 'I listened actively for my keyword anchors and captured surrounding detail when I found them.', fix: 'Focused listening on keyword anchors is faster and more accurate than broad comprehension listening under time pressure.' },
      { label: 'Stopping at the first answer candidate', weak: 'I heard a number and immediately chose it as the answer without confirming.', strong: 'I heard a number, listened one sentence further to confirm it was not a contrast or correction, then captured it.', fix: 'Speakers often present incorrect options before giving the correct one ("not X -- actually Y"). Listening one sentence further catches corrections.' },
    ],
    choiceOptions: [
      'Read the question, then wait for the audio to start listening from the beginning.',
      'Read the question, predict the answer type and 2-3 keyword anchors, then listen actively for those anchors in the audio.',
      'Skip reading the question and listen to the full audio first to get the general meaning.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Option 2 describes the full preview strategy: read, predict answer type, set keyword anchors, listen actively.',
    choiceWrong: 'Not quite. Passive waiting wastes the preview time. Listening without reading the question first means you do not know what you are listening for.',
    orderChunks: ['Read the question and predict what type of answer is needed,', '||', 'identify 2-3 keyword anchors from the question,', '||', 'then listen actively for those anchors and capture the surrounding detail when you find them.'],
    orderAnswer: 'Read the question and predict what type of answer is needed,||identify 2-3 keyword anchors from the question,||then listen actively for those anchors and capture the surrounding detail when you find them.',
    orderCorrect: 'Correct. Type prediction sets your expectation; keyword anchors focus your attention; active capture records the evidence.',
    orderWrong: 'Not yet. Answer type prediction must come first because it determines what the keyword anchors should target.',
    sortRows: [
      { text: 'Predict the answer type (number, name, reason, action) before the audio plays.', target: 'Prepared' },
      { text: 'Wait for the audio to start before deciding what to listen for.', target: 'Unprepared' },
      { text: 'Set 2-3 keyword anchors from the question text before listening.', target: 'Prepared' },
      { text: 'Try to understand everything the speaker says equally without a focus.', target: 'Unprepared' },
    ],
    sortCategories: ['Prepared', 'Unprepared'],
    sortCorrect: 'Correct. Answer type prediction and keyword anchors are the two prepared-listener strategies. Passive waiting and unfocused listening are the two unprepared patterns.',
    sortWrong: 'Check again. Waiting passively wastes the only preparation time available. Listening without a focus is the approach that causes candidates to miss the specific detail the question asks for.',
    whyText: `CELPIP Listening preview time is a built-in advantage that unprepared candidates waste. The preview strategy -- predict answer type, set keyword anchors, listen actively -- converts the listening task from a comprehension exercise into a targeted search. Candidates who use preview time deliberately find answers more quickly, miss fewer details, and spend less cognitive effort during the recording because their attention is directed rather than broad.`,
  },

};

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------
function buildBody(c) {
  // Support both old-style (weak/strong/analysis/howItWorks) and new-style (weakExample/strongExample/patternRows)
  const weakText = c.weak ?? c.weakExample ?? '';
  const strongText = c.strong ?? c.strongExample ?? '';
  const analysisText = c.analysis ?? '';
  const howItWorksHtml = c.howItWorks ?? (() => {
    if (!c.patternRows || c.patternRows.length === 0) return '';
    const panels = c.patternRows.map(r =>
      `<div class="lesson-teach-panel">
  <p class="lesson-teach-pattern">${r.pattern}</p>
  <p class="lesson-teach-meaning">${r.meaning}</p>
  <p class="lesson-teach-example">${r.example}</p>
</div>`
    ).join('\n');
    return `<div class="lesson-teach-grid">\n${panels}\n</div>`;
  })();

  const mistakeRows = (c.mistakes || []).map(m =>
    `<article class="lesson-error-card">
  <p class="lesson-card-label">${m.label}</p>
  <p class="lesson-line lesson-line-weak"><span>Avoid</span>${m.weak}</p>
  <p class="lesson-line lesson-line-strong"><span>Better</span>${m.strong}</p>
  <p class="lesson-fix-line"><strong>Fix:</strong> ${m.fix}</p>
</article>`
  ).join('\n');

  const orderParts = c.orderAnswer.split('||');
  const shuffled = [...orderParts].reverse();
  const orderChips = shuffled.map((chunk, i) =>
    `<button type="button" class="practice-chip" data-chip-value="${escapeAttr(chunk)}" data-chip-id="2-${i}">
  ${chunk}
</button>`
  ).join('\n');

  const [catA, catB] = c.sortCategories;
  const sortRowsHtml = (c.sortRows || []).map((r, i) =>
    `<div class="practice-sort-row" data-sort-target="${escapeAttr(r.target)}" data-sort-row="${i}">
  <p>${r.text}</p>
  <div class="practice-sort-actions">
    <button type="button" class="practice-sort-btn" data-sort-choice="${escapeAttr(catA)}">${catA}</button>
    <button type="button" class="practice-sort-btn" data-sort-choice="${escapeAttr(catB)}">${catB}</button>
  </div>
</div>`
  ).join('\n');

  return `<div class="lesson-context"><p class="lesson-context-lead">${c.intro}</p></div>

## Examples
<div class="lesson-example-grid">
<article class="lesson-example-card">
  <p class="lesson-card-label">Weak</p>
  <p class="lesson-line lesson-line-weak"><span>Avoid</span>${weakText}</p>
</article>
<article class="lesson-example-card">
  <p class="lesson-card-label">Stronger</p>
  <p class="lesson-line lesson-line-strong"><span>Better</span>${strongText}</p>
  ${analysisText ? `<p class="lesson-card-note">${analysisText}</p>` : ''}
</article>
</div>

## How It Works
${howItWorksHtml}

## Common Mistakes
<div class="lesson-error-grid">
${mistakeRows}
</div>

## Practice Lab
<div class="practice-lab" data-practice-lab>
  <div class="practice-lab-head">
    <p class="practice-lab-intro">Self-mark each task. Retry until every answer is correct.</p>
    <div class="practice-lab-status">
      <p class="practice-lab-score" data-practice-score>Score: 0/3</p>
      <button type="button" class="practice-reset-btn" data-practice-reset>Reset</button>
    </div>
  </div>
  <div class="practice-lab-grid">
<article class="practice-task" data-task-type="choice" data-task-answer="${c.choiceAnswer}" data-task-id="1" data-correct-feedback="${escapeAttr(c.choiceCorrect)}" data-wrong-feedback="${escapeAttr(c.choiceWrong)}">
  <p class="practice-task-label">1. Quick pick</p>
  <p class="practice-task-question">${c.choiceQ ?? 'Which option best demonstrates this skill?'}</p>
  <div class="practice-choice-grid">
${c.choiceOptions.map((opt, i) => `<button type="button" class="practice-choice" data-choice-index="${i}">
  ${opt}
</button>`).join('\n')}
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
<article class="practice-task" data-task-type="order" data-task-answer="${escapeAttr(c.orderAnswer)}" data-task-id="2" data-correct-feedback="${escapeAttr(c.orderCorrect)}" data-wrong-feedback="${escapeAttr(c.orderWrong)}">
  <p class="practice-task-label">2. Build it</p>
  <p class="practice-task-question">Put the sentence in the correct order.</p>
  <p class="practice-task-note">Tap a chunk to move it between the bank and answer area.</p>
  <div class="practice-chip-bank" data-order-bank>
${orderChips}
  </div>
  <div class="practice-chip-answer" data-order-answer></div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
    <button type="button" class="practice-clear-btn" data-task-clear>Clear</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
<article class="practice-task" data-task-type="sort" data-task-id="3" data-correct-feedback="${escapeAttr(c.sortCorrect)}" data-wrong-feedback="${escapeAttr(c.sortWrong)}">
  <p class="practice-task-label">3. Sort it</p>
  <p class="practice-task-question">Sort each item into the correct category.</p>
  <div class="practice-sort-list">
${sortRowsHtml}
  </div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
  </div>
</div>

## Why It Matters
<p class="lesson-importance">${c.whyText}</p>

## Get Feedback
<div class="lesson-support-callout">
  <div class="lesson-support-hero">
    <p class="lesson-support-label">Personalized score feedback</p>
    <h3>Get clear next-step advice.</h3>
    <p class="lesson-support-copy">Choose the support that matches your study goal.</p>
  </div>
  <div class="lesson-support-grid">
    <a class="lesson-support-card lesson-support-card-tutoring" href="/tutoring">
      <span class="lesson-support-icon" aria-hidden="true">1:1</span>
      <strong>1-on-1 Tutoring</strong>
      <span>Live help when you want guided practice and fast correction.</span>
    </a>
    <a class="lesson-support-card lesson-support-card-ai" href="/ai-feedback">
      <span class="lesson-support-icon" aria-hidden="true">AI</span>
      <strong>AI Writing Feedback</strong>
      <span>Quick checks when you want to test ideas before a full review.</span>
    </a>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  let filled = 0, skipped = 0;
  for (const [slug, content] of Object.entries(CONTENT)) {
    const filePath = path.join(ROOT, `${slug}.md`);
    let raw;
    try { raw = await readFile(filePath, 'utf8'); } catch {
      console.warn(`  NOT FOUND: ${slug}.md`);
      skipped++;
      continue;
    }
    // Extract frontmatter
    const fmMatch = raw.match(/^---\n([\s\S]*?\n)---\n/);
    if (!fmMatch) { console.warn(`  NO FRONTMATTER: ${slug}.md`); skipped++; continue; }
    const newContent = `---\n${fmMatch[1]}---\n${buildBody(content)}\n`;
    await writeFile(filePath, newContent, 'utf8');
    console.log(`  filled  ${slug}.md`);
    filled++;
  }
  console.log(`\nDone. Filled: ${filled}  Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
