#!/usr/bin/env node
/**
 * generate-lessons-v2.mjs
 *
 * Lesson generator for ieltscorner.ca.
 * Generates MDX lessons in: src/content/lessons/{exam}/{skill}/{NN}-{slug}.mdx
 *
 * Every topic has its own specific content object - no generic placeholders.
 *
 * Usage:
 *   node scripts/generate-lessons-v2.mjs [--exam ielts|celpip|both] [--skill writing|...] [--count N] [--dry-run] [--overwrite]
 */

import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const LESSONS_ROOT = path.resolve('src/content/lessons');

// ---------------------------------------------------------------------------
// Topic-specific content map
// Each entry: slug -> { intro, patternRows, whenItems, mistakes, choiceQ,
//                       orderChunks, sortRows, sortCategories, whyText }
// ---------------------------------------------------------------------------
const CONTENT = {

  // ---- IELTS WRITING -------------------------------------------------------

  'task-2-opinion-essay-structure': {
    intro: `An opinion essay asks you to state your view clearly and defend it through two body paragraphs. Many test-takers write a position in the introduction and then forget it entirely by the time they reach the body. The structure below keeps your position visible in every paragraph so the examiner never has to guess where you stand.`,
    weak: `There are many advantages and disadvantages of working from home. Some people think it is good but others disagree. In my opinion both sides have good points.`,
    strong: `Working from home significantly improves employee wellbeing, and for this reason I believe remote work should become the default arrangement in knowledge-based industries. The drawbacks — reduced collaboration and weaker team culture — are real but manageable through structured meeting schedules.`,
    analysis: `The strong response states a precise position in the first sentence and acknowledges the counter-argument in the second. The examiner immediately knows the writer's view and how the essay will develop.`,
    patternRows: [
      { pattern: 'Position in sentence 1', meaning: 'State your view before giving any reasons', example: 'I firmly believe that universal healthcare produces better long-term economic outcomes than private systems.' },
      { pattern: 'Topic sentence = reason', meaning: 'Open each body paragraph with the reason, not a topic announcement', example: 'The primary reason is the elimination of cost barriers to early treatment.' },
      { pattern: 'Conclusion = restatement only', meaning: 'Restate your position in new words — do not add new arguments', example: 'For these reasons, universal coverage remains the more economically rational model.' },
    ],
    whenItems: [
      'The question asks "To what extent do you agree or disagree?"',
      'The question says "Give your own opinion."',
      'You want to use a concession in body paragraph 2 to show range.',
    ],
    mistakes: [
      { weak: '"In my opinion, I think that people should..."', strong: '"People should..." or "I believe people should..."', fix: 'Remove "In my opinion" when you already use "I believe" — do not double-signal your stance.' },
      { weak: '"There are many reasons for this." (paragraph opener)', strong: '"The principal reason is the cost of infrastructure."', fix: 'Name the reason immediately. "Many reasons" delays your point and wastes words.' },
      { weak: '"In conclusion, there are pros and cons."', strong: '"In conclusion, the economic evidence favours universal coverage."', fix: 'A conclusion that re-opens the debate signals you never took a position.' },
    ],
    choiceQ: 'Which opening sentence best positions the writer for a Band 7 opinion essay?',
    choiceOptions: [
      'There are many arguments both for and against this idea, and I will discuss them in this essay.',
      'I believe governments should prioritise mental health funding above other healthcare spending.',
      'This is a very interesting topic that many people around the world discuss every day.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. A specific, debatable position in sentence 1 signals Task Achievement immediately.',
    choiceWrong: 'Not yet. Look for the sentence that states a clear, specific position without filler.',
    orderChunks: ['Affordable access to treatment', '||', 'eliminates the financial barrier', '||', 'that prevents early diagnosis.'],
    orderAnswer: 'Affordable access to treatment||eliminates the financial barrier||that prevents early diagnosis.',
    orderCorrect: 'Correct. Subject-reason-result is the core pattern for a body sentence that supports an opinion.',
    orderWrong: 'Not yet. Start with the subject (what), add the reason (eliminates...), then the result (that prevents...).',
    sortInstruction: 'Sort each sentence: strong opinion essay language or weak?',
    sortRows: [
      { text: 'Remote work reduces commute stress, which directly improves employee concentration.', target: 'Strong' },
      { text: 'Some people like working from home but some people do not.', target: 'Weak' },
      { text: 'The long-term economic case for renewable energy outweighs its initial infrastructure cost.', target: 'Strong' },
      { text: 'There are many things to consider about this interesting topic.', target: 'Weak' },
    ],
    sortCategories: ['Strong', 'Weak'],
    sortCorrect: 'Correct. Strong opinion writing is specific and makes a clear claim. Weak writing is vague and avoids commitment.',
    sortWrong: 'Some rows are wrong. Strong sentences name a specific claim; weak ones hedge with "some people" or "many things".',
    whyText: `Task Achievement is one of four equal IELTS writing criteria. If your position drifts between paragraphs — or if you present both sides equally in an opinion essay — examiners score Task Achievement at Band 5 or lower regardless of your grammar. A consistent, visible opinion earns Band 7 on that criterion alone.`,
  },

  'task-2-discussion-essay-both-views': {
    intro: `A discussion essay ("Discuss both views and give your own opinion") requires you to do three things: represent one side fairly, represent the other side fairly, and state your own position. Most test-takers fail on the third requirement — they summarise both sides and then add "I think both views have merit," which gives no position. You must choose a side, even in a discussion essay.`,
    weak: `Some people think technology helps education. Other people think it is harmful. There are many reasons for both sides. In my opinion both views are important.`,
    strong: `Proponents of technology in education argue that digital tools provide access to knowledge that was previously limited to elite institutions. Critics, however, contend that screen dependence reduces students' capacity for sustained concentration. On balance, I believe the access benefits outweigh the concentration costs, provided schools set clear device boundaries.`,
    analysis: `The strong version fairly summarises both views in one sentence each, uses contrast signposting ("however"), and commits to a position with a condition. That condition shows nuanced thinking, not fence-sitting.`,
    patternRows: [
      { pattern: 'View A + "argue/contend/suggest"', meaning: 'Present the first view without using your own voice', example: 'Advocates of stricter immigration controls argue that wage competition harms low-income workers.' },
      { pattern: '"Critics/Opponents, however..."', meaning: 'Signal the shift to View B with a contrast marker', example: 'Critics, however, maintain that immigration fills critical labour shortages that domestic workers cannot.' },
      { pattern: '"On balance, I believe..." + condition', meaning: 'State your position and qualify it to show critical thinking', example: 'On balance, I believe managed immigration benefits the economy, provided integration support is adequately funded.' },
    ],
    whenItems: [
      'The question says "Discuss both views and give your own opinion."',
      'You want to demonstrate range by handling two separate perspectives.',
      'You are writing body paragraph 1 for View A and body paragraph 2 for View B.',
    ],
    mistakes: [
      { weak: '"Both views are valid and I agree with both."', strong: '"On balance, View A is more persuasive because..."', fix: 'Saying both views are equally valid is not a position. Pick the stronger argument.' },
      { weak: 'Using "I" in the View A paragraph.', strong: '"Supporters of this view argue that..." (third person)', fix: 'Distance yourself from View A if it is not your opinion. Use reporting verbs: argue, claim, suggest.' },
      { weak: 'Starting body paragraph 2 with "On the other hand, some people..."', strong: '"Critics of this position, however, point out that..."', fix: '"Some people" is vague. Name the group or their stance to sound more authoritative.' },
    ],
    choiceQ: 'Which sentence best introduces the writer\'s own opinion at the end of a discussion essay?',
    choiceOptions: [
      'In conclusion, I think both views are interesting and both have good points.',
      'On balance, I find the economic argument more compelling than the environmental one, particularly in developing nations.',
      'To sum up, there are advantages and disadvantages to both of these views.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "On balance" signals a decision, and "particularly in developing nations" shows context-specific reasoning.',
    choiceWrong: 'Not yet. Find the sentence that commits to one side with a specific reason.',
    orderAnswer: 'Critics of this position, however,||argue that digital access alone||does not close the attainment gap.',
    orderCorrect: 'Correct. Contrast marker first, then reporting verb, then the specific counter-claim.',
    orderWrong: 'Not yet. The contrast phrase comes first, then who argues it, then the actual argument.',
    sortInstruction: 'Sort each sentence: suitable for a discussion essay or not?',
    sortRows: [
      { text: 'Proponents of urban cycling infrastructure argue that it reduces both congestion and emissions.', target: 'Suitable' },
      { text: 'I personally totally disagree with people who think cars are bad for cities.', target: 'Not suitable' },
      { text: 'Critics, however, contend that cycling infrastructure displaces parking that small businesses depend on.', target: 'Suitable' },
      { text: 'Some people like this and some people don\'t, so it\'s hard to say.', target: 'Not suitable' },
    ],
    sortCategories: ['Suitable', 'Not suitable'],
    sortCorrect: 'Correct. Suitable sentences use reporting verbs and precise claims. Unsuitable ones are too personal or vague.',
    sortWrong: 'Some rows are wrong. Suitable sentences report views using third-person verbs; unsuitable ones are casual or uncommitted.',
    whyText: `Examiners distinguish a discussion essay from an opinion essay specifically by looking for two fairly-represented views and a clear final position. Missing any of these three components drops Task Achievement to Band 5. The patterns in this lesson ensure all three are present and visible.`,
  },

  'task-2-problem-solution-essay': {
    intro: `A problem-solution essay asks you to identify causes or problems and propose realistic solutions. The key discipline is specificity: "governments should do more" is not a solution. You need to name what governments should do, why it would work, and ideally what has worked elsewhere. Vague solutions get scored the same as no solutions.`,
    weak: `Traffic congestion is a big problem in cities. There are many reasons for this. The government should do something about it. Also people should use public transport more.`,
    strong: `Urban traffic congestion stems primarily from the absence of financially competitive public transport alternatives. When commuters can drive door-to-door for less than a bus ticket, they will. The most effective solution is fare subsidisation funded by congestion charges on peak-hour private vehicles — a model London introduced in 2003 that reduced city-centre traffic by 30% within two years.`,
    analysis: `The strong version names one specific cause (cost competitiveness), explains the mechanism driving the problem, and proposes a concrete solution with a named real-world example. Each sentence advances the argument.`,
    patternRows: [
      { pattern: 'Problem → cause chain', meaning: 'Link the surface problem to its underlying cause', example: 'Youth unemployment persists not because jobs are scarce, but because required qualifications have inflated beyond entry-level positions.' },
      { pattern: 'Solution → mechanism', meaning: 'Explain why the solution would work, not just what it is', example: 'Mandatory financial literacy classes in secondary school would reduce personal debt by equipping graduates with loan-evaluation skills before their first major financial decision.' },
      { pattern: 'Real-world evidence', meaning: 'Name a country, city, or study that validates the solution', example: 'Singapore\'s water recycling programme demonstrates that full domestic self-sufficiency is achievable within two decades of sustained investment.' },
    ],
    whenItems: [
      'The question asks "What are the causes? What solutions can you suggest?"',
      'The question asks "What problems does X cause, and how can they be solved?"',
      'You want to use paragraph 1 for problems/causes and paragraph 2 for solutions.',
    ],
    mistakes: [
      { weak: '"The government should raise awareness."', strong: '"A public campaign targeting new drivers — modelled on the UK\'s THINK! road safety initiative — would reduce first-year accident rates."', fix: 'Raising awareness is not a solution. Name the specific action, the target audience, and the expected outcome.' },
      { weak: 'Listing three solutions briefly.', strong: 'Developing one solution in full with mechanism and evidence.', fix: 'One well-explained solution scores higher than three vague ones. Depth beats breadth.' },
      { weak: '"This problem is very serious and affects many people."', strong: '"This problem costs the UK economy an estimated £4.5 billion annually in lost productivity."', fix: 'Quantify impact where possible. "Very serious" tells the examiner nothing.' },
    ],
    choiceQ: 'Which sentence best introduces a solution in a problem-solution essay?',
    choiceOptions: [
      'The government should do something to fix this serious problem quickly.',
      'Introducing a tiered carbon tax — with revenues ringfenced for public transport subsidies — would shift commuter behaviour within five years.',
      'People need to think more carefully about the environment and make better choices.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. The solution is specific (tiered carbon tax), the mechanism is clear (ringfenced revenues), and the timeframe is realistic (five years).',
    choiceWrong: 'Not yet. A strong solution sentence names the specific action and explains how it produces change.',
    orderAnswer: 'Childhood obesity rates have risen||because ultra-processed food||is cheaper and more accessible than fresh produce in low-income areas.',
    orderCorrect: 'Correct. Problem → cause chain: state the problem, then use "because" to name the specific underlying cause.',
    orderWrong: 'Not yet. Lead with the problem statement, then use "because" to connect to the root cause.',
    sortInstruction: 'Sort each sentence: specific enough for Band 7 or too vague?',
    sortRows: [
      { text: 'Free after-school coding programmes in state schools would reduce the digital skills gap by targeting students before career tracking begins.', target: 'Specific enough' },
      { text: 'Society should try to be more aware of these important issues.', target: 'Too vague' },
      { text: 'Congestion pricing of £15 per vehicle per peak-hour journey, as implemented in Stockholm, reduced city-centre traffic by 22%.', target: 'Specific enough' },
      { text: 'The government needs to take action and make things better for everyone.', target: 'Too vague' },
    ],
    sortCategories: ['Specific enough', 'Too vague'],
    sortCorrect: 'Correct. Specific sentences name the action, mechanism, and often a real example. Vague ones use generic verbs and no detail.',
    sortWrong: 'Some rows are wrong. Specific sentences answer: what exactly, how does it work, and for whom?',
    whyText: `Task Achievement in a problem-solution essay specifically rewards "fully relevant, extended, and well-supported" ideas. An unsupported claim ("people should use public transport more") earns partial credit at best. A claim supported by a mechanism and evidence earns full credit. Every body sentence should do three things: claim, explain, support.`,
  },

  'task-2-advantages-disadvantages': {
    intro: `Advantages-disadvantages essays ("Discuss the advantages and disadvantages") are different from opinion essays. Your job is to give an objective analysis of both sides, not to argue for one. The most common error is treating them like an opinion essay by stating a strong personal preference. A neutral analytical tone scores higher here.`,
    weak: `There are many advantages of social media. For example people can talk to friends. But there are also disadvantages. Social media can be bad for mental health.`,
    strong: `Social media offers two primary advantages: frictionless communication across geographic distance, and democratised access to niche communities that were previously inaccessible. The principal disadvantage is the psychological cost — extended passive consumption of curated content is consistently associated with reduced life satisfaction in adolescents. Whether the advantages outweigh this cost depends largely on how intentionally the platform is used.`,
    analysis: `The strong version groups advantages (two, named precisely), then names the disadvantage with its specific mechanism ("passive consumption" rather than just "social media"), and closes with a nuanced weighing statement rather than a verdict.`,
    patternRows: [
      { pattern: 'Grouped advantage list', meaning: 'Name 2 advantages together before developing them', example: 'Remote work offers two clear advantages: reduced commuting costs and improved schedule flexibility.' },
      { pattern: 'Disadvantage + mechanism', meaning: 'Explain why it is a disadvantage, not just that it is one', example: 'The principal disadvantage is reduced team cohesion — informal knowledge transfer that happens in corridors does not occur over video call.' },
      { pattern: 'Weighing conclusion', meaning: 'Compare the two sides without forcing a definitive verdict', example: 'Whether the advantages outweigh the disadvantages depends on the industry and the individual\'s working style.' },
    ],
    whenItems: [
      'The question asks "What are the advantages and disadvantages of X?"',
      'The question says "Do the advantages outweigh the disadvantages?" — here you do need a position.',
      'You want to dedicate paragraph 1 to advantages and paragraph 2 to disadvantages.',
    ],
    mistakes: [
      { weak: '"I totally think that the advantages are much more important."', strong: '"On balance, the advantages appear to outweigh the disadvantages for most working adults."', fix: 'Use measured language. "Totally" sounds informal; "appear to" signals academic register.' },
      { weak: 'Listing four advantages and one disadvantage.', strong: 'Developing two advantages and two disadvantages with equal depth.', fix: 'Balance is scored. Unequal development suggests bias and harms Coherence.' },
      { weak: '"For example, there are many people who use this every day."', strong: '"In Norway, 78% of commuters switched to cycling within three years of dedicated lane installation."', fix: '"Many people" adds nothing. Use a specific proportion, country, or study instead.' },
    ],
    choiceQ: 'Which sentence works best as a weighing conclusion in an advantages-disadvantages essay?',
    choiceOptions: [
      'I strongly believe that the disadvantages are much worse and people should stop doing this.',
      'In summary, both the advantages and disadvantages of this topic are very important.',
      'On balance, the productivity gains from flexible working appear to outweigh its social costs for roles that require minimal collaboration.',
    ],
    choiceAnswer: 2,
    choiceCorrect: 'Correct. This conclusion weighs both sides, uses qualified language ("appear to"), and adds a condition that shows critical thinking.',
    choiceWrong: 'Not yet. Find the sentence that compares both sides using measured, academic language.',
    orderAnswer: 'The primary disadvantage||is the erosion of spontaneous collaboration,||which is difficult to replicate in a remote environment.',
    orderCorrect: 'Correct. Name the disadvantage, then explain the mechanism, then specify why it is hard to fix.',
    orderWrong: 'Not yet. Start by naming the disadvantage, then explain the mechanism using "is" or "involves", then add the consequence.',
    sortInstruction: 'Sort each sentence: suitable for an advantages-disadvantages essay or too biased?',
    sortRows: [
      { text: 'One significant advantage is the reduction in daily commute time, which improves work-life balance for many employees.', target: 'Suitable' },
      { text: 'This is obviously a terrible idea and nobody should support it.', target: 'Too biased' },
      { text: 'A notable disadvantage, however, is the blurring of professional and personal boundaries when working from home.', target: 'Suitable' },
      { text: 'I personally hate this and I think anyone who likes it is wrong.', target: 'Too biased' },
    ],
    sortCategories: ['Suitable', 'Too biased'],
    sortCorrect: 'Correct. Suitable sentences use measured, third-person analysis. Biased sentences use strong personal judgment.',
    sortWrong: 'Some rows are wrong. Academic advantages-disadvantages writing avoids emotional or dismissive language.',
    whyText: `Advantages-disadvantages essays are marked on how thoroughly and equitably you cover both sides. If you develop advantages deeply but dismiss disadvantages in a single sentence — or vice versa — Coherence and Task Achievement both suffer. Equal depth on each side, even if the sides are not equally strong in reality, is the target.`,
  },

  'task-1-academic-overview-sentences': {
    intro: `The overview is the most important sentence in Task 1. It tells the examiner you understand what the chart shows before you go into any numbers. A missing or wrong overview is the single most common reason for a Task 1 score below Band 6. The overview comes after the introduction and before any data — it describes the main trend or comparison, not a specific figure.`,
    weak: `The graph shows many different things. In 2000 the figure was 20%. In 2010 it was 30%. In 2020 it reached 45%.`,
    strong: `Overall, the data reveals a consistent upward trend in renewable energy adoption across all three countries over the 20-year period, with solar power accounting for the largest share of growth in every case.`,
    analysis: `The strong overview uses "Overall" to signal its role, identifies the dominant trend ("consistent upward"), covers scope ("all three countries," "20-year period"), and notes the most striking detail ("solar power, largest share"). It contains no specific numbers because the body paragraphs will cover those.`,
    patternRows: [
      { pattern: '"Overall, ..." + main trend', meaning: 'Signal the overview with "Overall" and name the single clearest pattern', example: 'Overall, the proportion of households with internet access rose steadily in all five countries throughout the period.' },
      { pattern: 'Scope statement', meaning: 'Define what the chart covers: time range, countries, categories', example: 'The data spans three decades and compares four major economies.' },
      { pattern: '"Notably/Remarkably, ..." + standout detail', meaning: 'Add the most striking feature — a peak, a reversal, a surprise', example: 'Notably, France was the only country to record a decline, falling from 60% in 1990 to 48% in 2020.' },
    ],
    whenItems: [
      'After writing the introduction (which paraphrases the question).',
      'Before writing any body paragraph with specific figures.',
      'When you notice one trend that clearly dominates the chart.',
    ],
    mistakes: [
      { weak: 'Writing the overview at the end of the essay.', strong: 'Writing the overview immediately after the introduction.', fix: 'Examiners expect the overview in paragraph 2. Placing it last suggests you identified the trend retrospectively.' },
      { weak: '"The graph shows many things."', strong: '"Overall, consumption rose in developed nations while declining in emerging economies."', fix: '"Many things" is not an overview. State the dominant pattern explicitly.' },
      { weak: 'Including specific numbers in the overview.', strong: '"Overall, car ownership increased significantly across all regions." (no numbers)', fix: 'Numbers belong in body paragraphs. The overview identifies the pattern, not the data.' },
    ],
    choiceQ: 'Which sentence is the strongest overview for a line chart showing rising internet use in five countries from 2000 to 2020?',
    choiceOptions: [
      'The chart shows that in 2000, Country A had 20% internet access and Country B had 15%.',
      'Overall, internet access increased across all five countries over the two-decade period, with the most dramatic growth occurring in developing nations.',
      'The graph is about internet access in different countries, and there are many interesting things to discuss.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Overall" signals the overview; the trend is named clearly; the most notable feature (developing nations) is highlighted — all without specific figures.',
    choiceWrong: 'Not yet. A strong overview names the dominant trend without specific numbers and signals its role with "Overall."',
    orderAnswer: 'Overall, the data shows||a clear upward trend in electric vehicle adoption||across all six countries between 2010 and 2024.',
    orderCorrect: 'Correct. "Overall" first, then the trend description, then the scope (countries and time period).',
    orderWrong: 'Not yet. Open with "Overall", then name the trend, then define the scope.',
    sortInstruction: 'Sort each sentence: belongs in the overview or belongs in a body paragraph?',
    sortRows: [
      { text: 'Overall, renewable energy production tripled in all three nations over the 30-year period.', target: 'Overview' },
      { text: 'In Germany, solar output rose from 5 GW in 2000 to 59 GW in 2020, a tenfold increase.', target: 'Body paragraph' },
      { text: 'Overall, the most striking feature is the consistent gap between urban and rural adoption rates.', target: 'Overview' },
      { text: 'The UK figure peaked at 45% in 2015 before falling sharply to 30% by 2020.', target: 'Body paragraph' },
    ],
    sortCategories: ['Overview', 'Body paragraph'],
    sortCorrect: 'Correct. Overviews describe general patterns; body paragraphs contain specific data points and figures.',
    sortWrong: 'Some rows are wrong. Overview sentences describe trends without numbers; body paragraphs develop specific figures.',
    whyText: `IELTS Academic Task 1 marking criteria explicitly list "overview of main trends" as a requirement for Task Achievement at Band 6 and above. Without an overview, the maximum Task Achievement score is Band 5. With a clear, accurate overview, the examiner can verify at a glance that you understood the chart — everything else in the essay builds on that.`,
  },

  'task-1-data-comparison-language': {
    intro: `Task 1 Academic requires you to compare data, not just describe it. Describing is listing numbers in order; comparing is explaining the relationship between them. The language of comparison — proportions, ratios, contrasts, rates of change — is what separates a Band 6 from a Band 7 response.`,
    weak: `In 2000, Country A had 20%. In 2010 Country A had 30%. Country B had 25% in 2000 and 40% in 2010.`,
    strong: `Country A's figure rose by 10 percentage points over the decade, while Country B's growth was steeper — a 15-point increase that reduced the gap between the two nations from 5 points to zero by 2010.`,
    analysis: `The strong version calculates the change (not just the endpoint), uses "while" to compare simultaneously, quantifies the gap, and tracks how it changed. These moves make the comparison analytical rather than descriptive.`,
    patternRows: [
      { pattern: 'rose/fell by X (percentage points)', meaning: 'Describe the amount of change, not just start and end values', example: 'Internet access rose by 35 percentage points, from 15% to 50%, between 2000 and 2020.' },
      { pattern: 'X was twice/half as high as Y', meaning: 'Express proportional comparisons', example: 'The UK\'s renewable energy share was roughly twice that of France throughout the period.' },
      { pattern: 'while/whereas + contrast', meaning: 'Compare two data points simultaneously in one sentence', example: 'Solar adoption increased steadily in Germany, while nuclear capacity declined sharply in France.' },
      { pattern: 'the gap narrowed/widened', meaning: 'Track how the relationship between two data sets changed', example: 'By 2020, the gap between the highest and lowest-earning groups had widened to its largest point in 30 years.' },
    ],
    whenItems: [
      'Comparing two or more countries, groups, or time periods in the same sentence.',
      'Describing the rate of change rather than just the values at each point.',
      'Writing the overview and needing to note a striking proportional difference.',
    ],
    mistakes: [
      { weak: '"In 2000 it was 20% and in 2020 it was 60%."', strong: '"The figure tripled — rising from 20% to 60% over two decades."', fix: 'Calculate the proportional change (tripled, doubled, fell by half) rather than just listing start and end.' },
      { weak: '"Country A is big and Country B is small."', strong: '"Country A\'s figure was approximately three times that of Country B throughout the period."', fix: 'Use precise language: "approximately three times" instead of "big/small."' },
      { weak: 'Writing one country per sentence for the whole essay.', strong: 'Combining two countries in one sentence using "while/whereas."', fix: 'Sentences that compare two things simultaneously are more efficient and show higher Coherence.' },
    ],
    choiceQ: 'Which sentence best compares two data points in Task 1 Academic style?',
    choiceOptions: [
      'Country A was 45% and Country B was 20%.',
      'Country A\'s share was more than double that of Country B, at 45% compared to 20%.',
      'The graph shows Country A and Country B have different figures.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "More than double" is a proportional comparison; "at 45% compared to 20%" provides the specific evidence for it.',
    choiceWrong: 'Not yet. Find the sentence that makes a proportional comparison and provides the evidence in the same clause.',
    orderAnswer: 'While the UK\'s oil consumption fell by 12%,||France\'s rose by an equivalent margin,||leaving both countries at similar levels by 2015.',
    orderCorrect: 'Correct. "While" starts the comparison; the second clause mirrors it; the third clause notes the convergence outcome.',
    orderWrong: 'Not yet. "While" opens the sentence with Country A\'s change; Country B\'s change follows; the result (convergence) closes it.',
    sortInstruction: 'Sort each sentence: uses comparison language or only describes?',
    sortRows: [
      { text: 'The proportion of car owners tripled in Vietnam, whereas in Japan it barely changed over the same period.', target: 'Comparison' },
      { text: 'In 2005 the figure was 30%. In 2010 it was 40%. In 2015 it was 50%.', target: 'Description only' },
      { text: 'By 2020, urban areas had twice the recycling rate of rural ones, a gap that had doubled since 2005.', target: 'Comparison' },
      { text: 'Australia had 25% in 2000. The UK had 30% in 2000.', target: 'Description only' },
    ],
    sortCategories: ['Comparison', 'Description only'],
    sortCorrect: 'Correct. Comparison sentences use proportional or relational language; description-only sentences just list figures.',
    sortWrong: 'Some rows are wrong. Look for "while/whereas", "twice/half", "gap", or "compared to" as comparison signals.',
    whyText: `Lexical Resource in Task 1 is assessed partly on your ability to paraphrase chart data using varied language. Using only "increased" and "decreased" limits your band score. The comparison structures in this lesson — proportional language, simultaneous contrasts, gap-tracking — are exactly what examiners reward in Band 7 and 8 model answers.`,
  },

  'task-1-general-training-letter-types': {
    intro: `IELTS General Training Task 1 gives you a scenario and three bullet points to cover. The most common error is using the wrong tone. A formal complaint to a company manager and an informal letter to a friend are completely different registers — vocabulary, greeting, closing, and sentence style all change. If you use a casual tone in a formal letter, you lose Lexical Resource points even if your grammar is perfect.`,
    weak: `Hi there! I am writing because I have a problem with my order. It was really bad and I was not happy. Please fix it or give me money back. Thanks!`,
    strong: `Dear Customer Services Manager,\n\nI am writing to express my dissatisfaction with an order I placed on 14 March. The item arrived significantly later than the stated delivery window, and the packaging was damaged on arrival, rendering the product unusable.\n\nI would be grateful if you could arrange a full refund at your earliest convenience.\n\nYours faithfully,\n[Your Name]`,
    analysis: `The strong letter uses a formal salutation, precise vocabulary ("express my dissatisfaction," "rendering the product unusable"), a polite but firm request ("would be grateful"), and the correct closing for a letter to an unknown recipient ("Yours faithfully").`,
    patternRows: [
      { pattern: 'Formal: "I am writing to..."', meaning: 'Open with your purpose — do not write a greeting that omits the reason', example: 'I am writing to request a full refund for the damaged goods delivered on 14 March.' },
      { pattern: 'Semi-formal: "I hope this finds you well."', meaning: 'Appropriate for letters to people you know professionally (e.g., a landlord)', example: 'I hope this finds you well. I am contacting you regarding a maintenance issue at the property.' },
      { pattern: 'Informal: "Just a quick note to..."', meaning: 'Use only when the scenario specifies a close friend or family member', example: 'Just a quick note to say I cannot make it to dinner on Saturday after all — work has been relentless this week.' },
    ],
    whenItems: [
      'Formal: writing to a company, manager, official body, or unknown recipient.',
      'Semi-formal: writing to a landlord, teacher, or professional you know by name.',
      'Informal: writing to a close friend, flatmate, or relative.',
    ],
    mistakes: [
      { weak: '"Dear Sir/Madam" + "Yours sincerely"', strong: '"Dear Sir/Madam" + "Yours faithfully"', fix: '"Yours sincerely" is for letters where you know the recipient\'s name. "Yours faithfully" is for Dear Sir/Madam.' },
      { weak: 'Covering two bullet points in detail and ignoring the third.', strong: 'Covering all three bullet points with roughly equal depth.', fix: 'Each bullet point is a separate Task Achievement requirement. Missing one can drop your score to Band 5.' },
      { weak: '"I am very, very upset about this terrible situation."', strong: '"I was disappointed to find that the product did not meet the standard described."', fix: 'Formal complaints are firm, not emotional. Replace "very upset" with precise descriptive language.' },
    ],
    choiceQ: 'You are writing a formal complaint to a hotel manager about a noisy room. Which opening is correct?',
    choiceOptions: [
      'Hey! I had a really bad time at your hotel and I want to complain about the noise.',
      'I am writing to bring to your attention an issue I experienced during my stay at your hotel from 10 to 12 April.',
      'Hello, I stayed at your hotel recently and I was not very happy with some things.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "I am writing to bring to your attention" is formal, states the purpose immediately, and includes the specific dates.',
    choiceWrong: 'Not yet. A formal complaint opening states the purpose, uses formal vocabulary, and avoids casual greetings.',
    orderAnswer: 'I am writing to request||a replacement for the faulty item||delivered to my address on 3 May.',
    orderCorrect: 'Correct. Purpose first ("I am writing to request"), then the specific request, then the supporting detail (date).',
    orderWrong: 'Not yet. Open with "I am writing to request", then state what you are requesting, then add the context.',
    sortInstruction: 'Sort each phrase: formal letter language or informal letter language?',
    sortRows: [
      { text: 'I would be grateful if you could address this matter promptly.', target: 'Formal' },
      { text: 'Can you sort this out for me ASAP? Really need it fixed!', target: 'Informal' },
      { text: 'I wish to express my dissatisfaction with the standard of service received.', target: 'Formal' },
      { text: 'Honestly it was a bit of a disaster and I was pretty annoyed.', target: 'Informal' },
    ],
    sortCategories: ['Formal', 'Informal'],
    sortCorrect: 'Correct. Formal language is measured, precise, and impersonal. Informal language uses contractions, intensifiers, and casual vocabulary.',
    sortWrong: 'Some rows are wrong. Formal phrases use "I would be grateful," "I wish to," "I am writing to." Informal uses "can you," "really," "pretty."',
    whyText: `Task Achievement for a General Training letter is assessed on whether you covered all bullet points, used the appropriate format, and matched the right tone. A single bullet point missed drops Task Achievement to Band 5. A formal letter written in an informal register loses Lexical Resource points on every line. Getting tone right is the quickest way to protect your overall score.`,
  },

  'cohesion-techniques-band-7': {
    intro: `Coherence and Cohesion is one of four equal criteria in IELTS writing, worth 25% of your score. It measures how smoothly a reader can follow your ideas — specifically, whether your paragraphs flow as a connected argument or read like a list of separate points. The most common problem at Band 6 is relying on "Furthermore" and "However" as the only cohesion tools. Band 7 writers use referencing, substitution, and logical sentence chaining alongside connectors.`,
    weak: `Education is important. Education helps people get jobs. Furthermore, education helps people think critically. Furthermore, education reduces crime. Furthermore, education improves society.`,
    strong: `A strong education system provides the foundation for individual and collective advancement. It equips graduates with the analytical skills employers increasingly demand, and it reduces the likelihood of long-term unemployment — a social cost that falls disproportionately on those without qualifications. The downstream effects extend beyond employment: communities with higher average education levels consistently record lower crime rates and stronger civic participation.`,
    analysis: `The strong version uses "It" (referencing "education system"), a dash for elaboration (not "Furthermore"), and "The downstream effects" to chain logically to the next idea. "Furthermore" does not appear once. The ideas feel connected because each sentence builds on the previous one's meaning.`,
    patternRows: [
      { pattern: 'Pronoun referencing', meaning: 'Use "it/they/this/these" to refer back to nouns — avoids repetition', example: 'Remote work increases flexibility. It also reduces commuting costs significantly.' },
      { pattern: 'Lexical substitution', meaning: 'Replace a repeated noun with a synonym or descriptive phrase', example: 'Deforestation harms local ecosystems. This practice also accelerates global warming.' },
      { pattern: 'Logical chain opener', meaning: 'Start the next sentence with the consequence of the previous one', example: 'Tourism creates seasonal employment. This cyclical demand, however, leaves workers vulnerable in off-peak months.' },
      { pattern: 'Sentence connector variety', meaning: 'Use different connectors for the same logical relationship', example: 'Consequently / As a result / This means that / The outcome is that' },
    ],
    whenItems: [
      'When you notice you have used "Furthermore" three or more times in one paragraph.',
      'When two consecutive sentences repeat the same subject noun.',
      'When you want to show the consequence of one idea before introducing the next.',
    ],
    mistakes: [
      { weak: '"Furthermore, Moreover, Additionally, Also" — all in one paragraph.', strong: 'Use one addition connector, then substitute the next with pronoun referencing.', fix: 'Using four addition connectors in a row signals you cannot link ideas through meaning — only through labels.' },
      { weak: '"This shows that it is important and affects many things."', strong: '"This pattern suggests that early intervention produces compounding long-term benefits."', fix: '"It is important" and "many things" are fillers. The cohesive reference needs to name what it points to.' },
      { weak: 'Starting every sentence with the same subject.', strong: 'Vary the sentence opening: start with a consequence, a condition, or a concession.', fix: 'Repeating the same subject at the start of three consecutive sentences loses Coherence score even if the ideas are sound.' },
    ],
    choiceQ: 'Which sentence uses cohesion more effectively?',
    choiceOptions: [
      'Education is important. Furthermore, education helps people. Furthermore, education is good for society.',
      'Education builds individual capability. This investment in human capital then generates broader social returns, from reduced unemployment to stronger civic institutions.',
      'Education is very important and has many advantages for people and for society as a whole.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "This investment" substitutes for "education" and "then" shows the logical sequence — no connector needed.',
    choiceWrong: 'Not yet. Look for the sentence that links ideas through meaning and reference rather than labelling with "Furthermore."',
    orderAnswer: 'Urban green spaces reduce air pollution.||This environmental benefit also lowers||the incidence of respiratory illness in surrounding communities.',
    orderCorrect: 'Correct. The first clause states the fact; "This environmental benefit" cohesively labels it; "also" adds a second consequence.',
    orderWrong: 'Not yet. State the fact first, then use "This + noun phrase" to refer back to it, then extend with "also" plus the second effect.',
    sortInstruction: 'Sort each pair: the second sentence coheres with the first, or it does not?',
    sortRows: [
      { text: 'Universities provide research funding. This investment drives innovation across entire industrial sectors.', target: 'Coheres' },
      { text: 'The government raised taxes. Furthermore, taxes are important for public spending.', target: 'Does not cohere' },
      { text: 'Plastic waste harms marine life. The pollution also enters the food chain, ultimately affecting human health.', target: 'Coheres' },
      { text: 'Healthcare is expensive. Moreover, healthcare is necessary for society.', target: 'Does not cohere' },
    ],
    sortCategories: ['Coheres', 'Does not cohere'],
    sortCorrect: 'Correct. Cohering pairs link through meaning (referencing, consequence, substitution). Non-cohering pairs just label the relationship without building on it.',
    sortWrong: 'Some rows are wrong. Ask yourself: does the second sentence pick up a specific idea from the first, or does it just add a new idea with a connector?',
    whyText: `Coherence and Cohesion is assessed on three things: logical sequencing of information, use of cohesive devices (not just connectors), and paragraph unity. Over-relying on "Furthermore/However" signals a limited range of cohesive devices. Referencing ("this/these/it"), substitution (synonyms), and consequence chaining demonstrate the range that examiners reward at Band 7.`,
  },

  'grammar-accuracy-under-time-pressure': {
    intro: `Grammatical Range and Accuracy (GRA) is worth 25% of your IELTS writing score. Under exam conditions, most errors are not caused by not knowing a rule — they are caused by writing faster than your editing can keep up. The fix is not to slow down overall, but to build a five-point accuracy checklist you apply automatically to every paragraph before moving on.`,
    weak: `Many people they use social media every day and this is affect their mental health. Government need to make law to control the social medias.`,
    strong: `Many people use social media daily, and this habit has measurable effects on mental wellbeing. Governments should introduce regulatory frameworks to manage the sector more responsibly.`,
    analysis: `The weak version has five errors: double subject ("people they"), wrong verb form ("is affect"), missing article ("the mental health" should be "mental health"), subject-verb agreement ("Government need"), and incorrect plural ("the social medias"). All five are fixable with a checklist scan that takes 30 seconds.`,
    patternRows: [
      { pattern: 'Subject-verb check', meaning: 'One subject. No repeated pronoun. Verb agrees in number.', example: 'Correct: "The number of applicants has increased." Error caught: "The number of applicants have increased."' },
      { pattern: 'Article check', meaning: '"The" for specific/known nouns; no article for general plurals and uncountable nouns', example: '"Education is important." (not "The education") / "The education system needs reform." (specific)' },
      { pattern: 'Verb form check', meaning: 'After auxiliary verbs (has, does, will, should), use base form or past participle — not gerund', example: '"This affects..." not "is affect." "Should introduce..." not "should introducing."' },
      { pattern: 'Countable/uncountable check', meaning: 'Uncountable nouns have no plural: information, advice, evidence, research, equipment', example: '"The research shows..." not "The researches show." "No advice is..." not "No advices are."' },
      { pattern: 'Sentence boundary check', meaning: 'Every sentence has one subject and one main verb. No fused sentences.', example: '"The policy failed. It did not account for regional variation." (two clean sentences)' },
    ],
    whenItems: [
      'At the end of each paragraph — scan once before moving to the next.',
      'In the final two minutes — one full-essay scan for the five points above.',
      'When you notice you have written a long sentence — check it has only one main clause.',
    ],
    mistakes: [
      { weak: '"The informations are not enough to make a decisions."', strong: '"The information is insufficient to support a definitive conclusion."', fix: '"Information" and "decision" are uncountable and countable respectively. "Information" has no plural; "a decision" needs no "s" after "a".' },
      { weak: '"Many peoples think that the government should do something."', strong: '"Many people believe the government should intervene."', fix: '"People" is already plural — no "s". Also: "do something" is too vague; name the action.' },
      { weak: '"This is very importance issue."', strong: '"This is a critically important issue."', fix: '"Importance" is a noun; "important" is the adjective. "Very" with an adjective needs "very important," not "very importance."' },
    ],
    choiceQ: 'Which sentence is grammatically correct?',
    choiceOptions: [
      'The researches shows that children who reads more scores higher in comprehension tests.',
      'Research shows that children who read more score higher on comprehension tests.',
      'The research show that childrens who read more are score higher in comprehension test.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Research" is uncountable (no article, no plural); "children" is already plural; "score" agrees with plural subject.',
    choiceWrong: 'Not yet. Check each noun for countability and each verb for agreement with its subject.',
    orderAnswer: 'Many people use social media daily,||and this habit affects mental wellbeing||in ways that researchers are only beginning to quantify.',
    orderCorrect: 'Correct. No double subject, correct verb forms, and the relative clause extends the idea precisely.',
    orderWrong: 'Not yet. The first clause has one subject (people) and one verb (use). The second clause uses "this habit" — a noun, not a pronoun — for clarity.',
    sortInstruction: 'Sort each sentence: grammatically correct or contains an error?',
    sortRows: [
      { text: 'The evidence suggests that investment in early education produces long-term economic benefits.', target: 'Correct' },
      { text: 'Many peoples they think that the government they should make more laws.', target: 'Contains an error' },
      { text: 'Access to affordable healthcare remains a challenge in rural communities.', target: 'Correct' },
      { text: 'The informations are very important for the researches we are doing.', target: 'Contains an error' },
    ],
    sortCategories: ['Correct', 'Contains an error'],
    sortCorrect: 'Correct. The error sentences have double subjects, wrong plurals of uncountable nouns, or agreement mistakes.',
    sortWrong: 'Some rows are wrong. Check for: double subject ("they they"), wrong plurals ("informations"), and agreement ("are" with uncountable noun).',
    whyText: `GRA accounts for 25% of your Task 2 score and is equally weighted in Task 1. The five-point checklist in this lesson targets the errors that appear most often in Band 5-6 scripts. Eliminating these does not require advanced grammar knowledge — it requires 30 seconds of focused editing after each paragraph. Most test-takers skip this step entirely.`,
  },

  'lexical-resource-upgrade': {
    intro: `Lexical Resource (LR) is worth 25% of your IELTS writing score. It rewards not just the difficulty of words you use, but how naturally and accurately you use them. The common mistake is memorising lists of "advanced" words and forcing them into essays where they do not fit. This approach backfires: examiners specifically flag "inappropriate use of uncommon vocabulary." The goal is precision, not difficulty.`,
    weak: `The government should ameliorate the deleterious ramifications of the aforementioned predicament by implementing efficacious countermeasures that will engender propitious outcomes for the populace.`,
    strong: `Governments should address the problem directly by investing in targeted programmes that have a measurable impact on the communities most affected.`,
    analysis: `The weak version strings together low-frequency words incorrectly (ramifications of a predicament is not idiomatic; propitious outcomes is forced). The strong version is clearer, more natural, and would score higher on LR because every word is used accurately and the collocations are native-speaker patterns.`,
    patternRows: [
      { pattern: 'Precise verb + noun collocations', meaning: 'Use the verb that native speakers pair with each noun', example: '"raise awareness" (not "increase awareness") / "address a problem" (not "solve a predicament")' },
      { pattern: 'Topic-specific vocabulary', meaning: 'Use field-specific words naturally, not as decoration', example: 'Education: "attainment gap," "curriculum," "pedagogy." Environment: "carbon footprint," "biodiversity," "mitigation."' },
      { pattern: 'Hedging vocabulary for claims', meaning: 'Show academic caution with precise hedging rather than vague words', example: '"Evidence suggests..." / "This may account for..." / "A plausible explanation is..." (not "maybe" or "probably")' },
      { pattern: 'Paraphrase the question', meaning: 'Use synonyms to restate the topic in your introduction without copying', example: 'Question: "Many people believe..." → Introduction: "A growing body of opinion holds that..." / "It is widely argued that..."' },
    ],
    whenItems: [
      'When writing your introduction — paraphrase the question using synonyms, not copied phrases.',
      'When you notice you have used the same verb ("increase," "decrease") three times.',
      'When you want to hedge a claim but find yourself writing "maybe" or "I think perhaps."',
    ],
    mistakes: [
      { weak: '"The problem is very big and affects many people greatly."', strong: '"The problem is widespread, affecting millions of low-income households disproportionately."', fix: '"Very big" and "greatly" are imprecise. "Widespread" and "disproportionately" show range and accuracy.' },
      { weak: 'Using "utilize" instead of "use."', strong: 'Using "use" confidently — it is always correct and never sounds wrong.', fix: '"Utilize" is not more advanced than "use" — it means something specific (using something for an unintended purpose). Misusing it costs LR points.' },
      { weak: 'Repeating "increase" for every rising trend.', strong: 'surge, climb, escalate, expand, grow, rise, jump sharply', fix: 'Vary your trend vocabulary. Each word has a slightly different register and rate of change connotation.' },
    ],
    choiceQ: 'Which sentence demonstrates better Lexical Resource?',
    choiceOptions: [
      'The government should do things to help people who have a lot of problems with money.',
      'Authorities should introduce targeted financial support programmes for households below the poverty line.',
      'The government must utilize various efficacious methodologies to ameliorate monetary predicaments.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Targeted financial support programmes," "households," and "poverty line" are precise, natural collocations that show genuine lexical range.',
    choiceWrong: 'Not yet. Find the sentence where every word is used accurately and the collocations sound natural.',
    orderAnswer: 'Access to quality education||remains the single most reliable predictor||of long-term income and social mobility.',
    orderCorrect: 'Correct. "Remains" (not "is"), "reliable predictor" (accurate collocation), and "social mobility" (field-specific term) all demonstrate LR precision.',
    orderWrong: 'Not yet. The subject comes first, then the verb "remains" (more precise than "is"), then the predicate noun phrase.',
    sortInstruction: 'Sort each sentence: demonstrates strong Lexical Resource or relies on weak vocabulary?',
    sortRows: [
      { text: 'The policy has narrowed the attainment gap between affluent and disadvantaged school districts.', target: 'Strong LR' },
      { text: 'The policy is very good and makes things better for a lot of different people.', target: 'Weak vocabulary' },
      { text: 'Carbon emissions have escalated sharply since the onset of rapid industrialisation.', target: 'Strong LR' },
      { text: 'The environment gets more and more bad because of many different bad things people do.', target: 'Weak vocabulary' },
    ],
    sortCategories: ['Strong LR', 'Weak vocabulary'],
    sortCorrect: 'Correct. Strong LR uses precise nouns, topic-specific vocabulary, and accurate collocations. Weak vocabulary relies on "very," "a lot," and vague verbs.',
    sortWrong: 'Some rows are wrong. Strong LR = specific noun + precise verb + accurate preposition. Weak = "very," "things," "good," "bad."',
    whyText: `LR is the IELTS criterion that most test-takers try to improve by memorising word lists — and it is the one where that strategy most often backfires. Examiners mark down "uncommon vocabulary used inaccurately" explicitly. The lesson in this content is: use a precise, accurate word rather than a risky advanced one. Range comes from topic vocabulary and collocation control, not from dictionary mining.`,
  },

  'passive-voice-task-1-and-task-2': {
    intro: `The passive voice is not just a stylistic option — in IELTS writing it serves two specific purposes. In Task 1 Academic, it describes processes (how things are made or happen) where the actor is unknown or irrelevant. In Task 2, it allows you to report data, attribute arguments, and discuss policies in a formal academic register. Using only active voice in Task 2 forces you to name an actor for every claim, which is often impossible or unnatural.`,
    weak: `Someone made the product in a factory. They sent it to shops. People buy it. Someone uses it. Then someone throws it away.`,
    strong: `The raw materials are extracted and processed at a central facility, from which the finished goods are distributed to retail outlets. Once purchased, the product is typically used for two to three years before being discarded.`,
    analysis: `The strong version uses passive throughout because the actor (a company, workers) is irrelevant to the process description. The passive also creates a formal, impersonal tone appropriate for academic writing.`,
    patternRows: [
      { pattern: 'is/are + past participle (present passive)', meaning: 'Describe ongoing processes or general facts', example: 'The data is collected annually by national statistics agencies.' },
      { pattern: 'was/were + past participle (past passive)', meaning: 'Describe completed actions where the actor is unimportant', example: 'The policy was introduced in 2015 and subsequently revised in 2018.' },
      { pattern: 'It is argued/suggested/believed that...', meaning: 'Report a general view without naming a specific person', example: 'It is widely argued that preventive healthcare reduces long-term expenditure.' },
      { pattern: 'has/have been + past participle (perfect passive)', meaning: 'Describe changes with present relevance', example: 'Emissions have been reduced by 20% since the carbon tax was implemented.' },
    ],
    whenItems: [
      'Task 1 Academic process diagrams — always use passive for stages: "The water is filtered..."',
      'Task 2 — when reporting what "researchers," "governments," or "critics" claim.',
      'When the actor of an action is unknown, unimportant, or obvious from context.',
    ],
    mistakes: [
      { weak: '"People invented electricity in the 19th century."', strong: '"Electricity was developed as a practical technology in the 19th century."', fix: 'In academic writing, "people" is almost always the wrong actor. Use passive when the actor is general.' },
      { weak: '"The results were being analysed by the team."', strong: '"The results were analysed by the research team" or "The team analysed the results."', fix: 'Past passive progressive is rarely needed in IELTS. Use simple past passive or active instead.' },
      { weak: 'Using passive for every sentence in Task 2 body paragraphs.', strong: 'Alternating active and passive to show grammatical range.', fix: 'All-passive writing loses GRA points because it shows limited range. Alternate with active sentences for balance.' },
    ],
    choiceQ: 'Which sentence correctly uses passive voice to describe a Task 1 process?',
    choiceOptions: [
      'Workers put the material into the machine and the machine makes the product.',
      'The raw material is fed into the machine, where it is shaped and sealed before packaging.',
      'The machine is put the material in it by the workers to make the products.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Is fed," "is shaped," and "is sealed" are correct present passive forms describing a process where the actor is irrelevant.',
    choiceWrong: 'Not yet. A correct passive uses is/are + past participle. The actor ("by workers") is omitted when unimportant.',
    orderAnswer: 'Once the application has been submitted,||it is reviewed by a selection panel||and a decision is issued within four weeks.',
    orderCorrect: 'Correct. Three passive clauses describe sequential process steps: submission → review → decision.',
    orderWrong: 'Not yet. The first clause describes when (after submission); the second describes the action (reviewed); the third describes the outcome (decision issued).',
    sortInstruction: 'Sort each sentence: correct passive use or incorrect?',
    sortRows: [
      { text: 'The vaccine was developed over a period of 18 months and approved for public use in 2021.', target: 'Correct passive' },
      { text: 'It is widely believed by many people that they should implement more laws by governments.', target: 'Incorrect' },
      { text: 'Carbon emissions have been reduced significantly since the introduction of the carbon tax.', target: 'Correct passive' },
      { text: 'The problem was being solved by it after many years of trying by everyone.', target: 'Incorrect' },
    ],
    sortCategories: ['Correct passive', 'Incorrect'],
    sortCorrect: 'Correct. Correct passives use is/are/was/were/has been + past participle cleanly. Incorrect ones mix passive and active awkwardly or use the wrong verb form.',
    sortWrong: 'Some rows are wrong. Check that the passive structure is: subject + auxiliary (be) + past participle, with no extra agents tangled in.',
    whyText: `Passive voice is a specific GRA skill. Examiners at Band 7 expect you to use passive and active interchangeably. Task 1 process descriptions that use only active voice ("The worker puts...") read as informal and show limited range. Task 2 responses that never use passive cannot report findings or attribute views without naming a specific actor every time — which forces unnatural sentence structures.`,
  },

  'basic-essay-paragraph-structure': {
    intro: `Every IELTS Task 2 body paragraph needs three parts: a point (your main idea), evidence (a reason, example, or statistic), and an explanation (why the evidence proves the point). Skipping the explanation is the most common reason a paragraph gets full marks for idea but low marks for task achievement — the examiner cannot see the logical connection between your example and your claim.`,
    weak: `Education is important. Many people go to university. Finland has a good education system.`,
    strong: `A strong education system is the most reliable driver of long-term economic productivity. When a population has access to quality education, it develops the technical and critical-thinking skills that employers in high-value industries require. Finland's consistent performance in PISA rankings demonstrates that sustained government investment in teacher training and curriculum development produces measurable national outcomes over time.`,
    analysis: `The point is stated in sentence 1. The explanation (why education drives productivity) is in sentence 2. The evidence (Finland, PISA) is in sentence 3, followed by what that evidence proves. Every sentence advances the same central claim.`,
    patternRows: [
      { pattern: 'Point sentence', meaning: 'State the main idea of the paragraph in the first sentence', example: 'The primary advantage of renewable energy is its independence from geopolitical supply chains.' },
      { pattern: 'Evidence sentence', meaning: 'Give a specific example, statistic, or real-world case', example: 'Denmark generates over 60% of its electricity from wind power, having invested heavily in offshore infrastructure since the 1990s.' },
      { pattern: 'Explanation sentence', meaning: 'Connect the evidence back to your point explicitly', example: 'This demonstrates that long-term infrastructure investment produces energy security that fossil-fuel-dependent nations cannot achieve.' },
    ],
    whenItems: [
      'Writing any Task 2 body paragraph regardless of essay type.',
      'Checking a paragraph you have written — does it contain all three parts?',
      'When you feel like you need more to say — add the explanation, not another example.',
    ],
    mistakes: [
      { weak: 'Writing two points in one paragraph.', strong: 'One point per paragraph, developed fully.', fix: 'Two points in one paragraph means neither is developed. The examiner sees two underdeveloped ideas, not two strong ones.' },
      { weak: '"For example, Japan is a good country." (example with no explanation)', strong: '"Japan\'s investment in robotics manufacturing demonstrates that automation, if managed with retraining programmes, can expand rather than contract employment."', fix: 'Every example needs an explanation of what it proves. "Japan is good" proves nothing.' },
      { weak: 'Starting the paragraph with "Firstly," then "Secondly," then "Thirdly" for three separate ideas.', strong: 'Dedicate one paragraph to each point, using "Firstly/Secondly/Finally" only at the paragraph level.', fix: '"Firstly, Secondly, Thirdly" inside one paragraph creates a list, not a developed argument. Give each point its own paragraph.' },
    ],
    choiceQ: 'Which body paragraph is most developed?',
    choiceOptions: [
      'Technology is important. Many people use it. It is very useful for society.',
      'Technology accelerates economic growth by enabling small businesses to reach global markets. An independent survey of UK SMEs found that companies that adopted e-commerce platforms between 2015 and 2020 grew revenue 40% faster than those that did not. This demonstrates that digital adoption is not merely a convenience but a structural competitive advantage.',
      'Technology has many advantages and disadvantages. Firstly it is fast. Secondly it is expensive. Thirdly it can be dangerous.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Point (accelerates growth), evidence (UK survey, 40% figure), explanation (structural competitive advantage) — all three parts present.',
    choiceWrong: 'Not yet. Look for the paragraph that has a clear claim, a specific piece of evidence, and an explanation of what that evidence proves.',
    orderAnswer: 'Access to clean water is a prerequisite for public health.||Without reliable sanitation infrastructure,||waterborne diseases spread unchecked, raising mortality rates and straining healthcare systems.',
    orderCorrect: 'Correct. Point first, then the conditional mechanism ("without X"), then the consequence chain that proves the point.',
    orderWrong: 'Not yet. State the point (access to clean water), then the mechanism (without infrastructure), then the consequence that proves the point.',
    sortInstruction: 'Sort each sentence: plays a clear role in a PEE paragraph or is filler?',
    sortRows: [
      { text: 'Urban green spaces reduce average temperatures by up to 2°C, according to a 2022 WHO study.', target: 'Clear role (evidence)' },
      { text: 'This is a very interesting topic that has many different aspects to consider.', target: 'Filler' },
      { text: 'This demonstrates that nature-based urban planning is a cost-effective climate adaptation tool.', target: 'Clear role (explanation)' },
      { text: 'There are many things to say about this subject and it affects a lot of people.', target: 'Filler' },
    ],
    sortCategories: ['Clear role (evidence)', 'Filler'],
    sortCorrect: 'Correct. Every sentence in a body paragraph should be either a point, evidence, or explanation. Filler sentences delay the argument without advancing it.',
    sortWrong: 'Some rows are wrong. Ask: does this sentence make a specific claim, provide specific evidence, or explain the connection? If not, it is filler.',
    whyText: `The point-evidence-explanation structure is the minimum requirement for a body paragraph to score Band 6 or above on Task Achievement. Without all three parts, examiners see an "underdeveloped" response. With all three, even a paragraph on a simple topic can achieve Band 7 — because the development is what is being assessed, not the complexity of the idea.`,
  },

  // ---- IELTS SPEAKING -------------------------------------------------------

  'part-1-answer-pattern': {
    intro: `IELTS Speaking Part 1 lasts 4-5 minutes and covers familiar topics: your hometown, work or study, hobbies, daily routines. Answers should be 2-4 sentences — long enough to show vocabulary and fluency, short enough to leave time for the examiner's next question. The most common error is either a one-word answer ("Yes") or an answer so long it resembles a Part 2 monologue.`,
    weak: `Do you enjoy cooking? "Yes. I like cooking."`,
    strong: `"I do, actually. I find it a good way to decompress after a long day — I tend to cook fairly simple things like stir-fries or pasta, but I enjoy the process of putting a meal together from scratch."`,
    analysis: `The strong answer uses a natural opener ("I do, actually"), gives a reason (decompress after work), adds a concrete example (stir-fries, pasta), and ends on the process itself rather than just the outcome. It sounds like natural conversation, not a rehearsed script.`,
    patternRows: [
      { pattern: 'Direct answer + "actually/to be honest"', meaning: 'Add a natural hedge that sounds conversational', example: 'I do, actually. / Not particularly, to be honest. / It depends, really.' },
      { pattern: 'Reason + specific example', meaning: 'Give one reason and one concrete detail — no more', example: '"I enjoy it because it helps me switch off. I usually try a new recipe on weekends."' },
      { pattern: 'Personal feeling + brief extension', meaning: 'Share how something makes you feel, then extend with a comparison or contrast', example: '"I find it quite therapeutic, actually — much more so than I expected when I first started."' },
    ],
    whenItems: [
      'When the examiner asks about hobbies, routines, preferences, or experiences.',
      'When you want to extend naturally without sounding scripted.',
      'When you have given a short answer and the examiner is waiting — add the "because/actually/I find that" extension.',
    ],
    mistakes: [
      { weak: '"Yes, I like my hometown because it is a very nice place with many things."', strong: '"I have a lot of affection for it, actually. It is a fairly quiet city, but there is a strong community feel that you do not always find in larger places."', fix: '"Nice" and "many things" are filler. Describe what specifically makes it nice.' },
      { weak: 'Answering every question with a memorised script.', strong: 'Answering directly, then extending naturally.', fix: 'Memorised answers often sound unnatural and disconnect from the specific question asked. React to each question genuinely.' },
      { weak: '"I am not sure. Maybe yes. I think so. It depends."', strong: '"It depends on the season, really. I tend to prefer it in summer when there is more going on."', fix: '"It depends" is a valid start — but always follow it with what it depends on and which side you favour.' },
    ],
    choiceQ: 'Which Part 1 answer uses the best extension technique?',
    choiceOptions: [
      'Yes, I like reading. I read books. Reading is good.',
      'I do enjoy reading, yes — particularly non-fiction. I find it easier to stay focused when I am genuinely curious about the topic.',
      'Reading is a very good hobby and I think everyone should do it because it is educational.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Natural confirmation ("I do, yes"), specific genre (non-fiction), and a personal insight (focus + curiosity) — all in two sentences.',
    choiceWrong: 'Not yet. Look for the answer that extends with a specific detail and a personal feeling rather than a general statement.',
    orderAnswer: '"I find it quite relaxing, actually —||I tend to walk along the river||when I need to clear my head after work."',
    orderCorrect: 'Correct. Feeling first, then "I tend to" for a habitual behaviour, then the context (when/why).',
    orderWrong: 'Not yet. Lead with the personal feeling, add "I tend to" for the habit, then explain the context.',
    sortInstruction: 'Sort each Part 1 response: well-extended or underdeveloped?',
    sortRows: [
      { text: '"I really enjoy it. I have been playing guitar for about six years now, and I find it is one of the few activities that genuinely helps me switch off."', target: 'Well-extended' },
      { text: '"Yes. I like it."', target: 'Underdeveloped' },
      { text: '"Not particularly, to be honest — I prefer spending time outdoors. I find that sitting inside for long periods makes me feel restless."', target: 'Well-extended' },
      { text: '"I think so. Maybe. It depends."', target: 'Underdeveloped' },
    ],
    sortCategories: ['Well-extended', 'Underdeveloped'],
    sortCorrect: 'Correct. Well-extended answers give a position, a reason, and a specific detail. Underdeveloped ones stop at the position.',
    sortWrong: 'Some rows are wrong. Well-extended = position + reason + concrete detail or feeling. Underdeveloped = position only, or no position at all.',
    whyText: `Part 1 answers contribute to your Fluency and Coherence score. Examiners assess whether you can produce connected speech without long pauses, repetition, or self-correction. A two-sentence answer that flows naturally scores higher than a long answer filled with "um," "uh," and false starts. Aim for 2-4 sentences per question, no more.`,
  },

  'part-2-cue-card-strategy': {
    intro: `IELTS Speaking Part 2 gives you a topic card and one minute to prepare, then asks you to speak for 1-2 minutes. Most test-takers underuse the preparation minute. The key is to write four content points in your notes — one for each bullet on the card plus "why you chose this topic" — and plan your first sentence before you speak. Starting confidently is the hardest part; the rest flows from a strong opening.`,
    weak: `"I want to talk about a holiday. I went to the beach. It was nice. The weather was good. I enjoyed it. I ate good food. That is all I can remember."`,
    strong: `"I'd like to talk about a trip I took to Kyoto three years ago, which remains one of the most memorable travel experiences I have had. I visited during autumn when the maple trees were changing colour — something I had wanted to see since I was a teenager. What struck me most was the contrast between the ancient temples and the very modern city surrounding them. I chose this trip because I had been studying Japanese history, and seeing the Fushimi Inari shrine in person made everything I had read feel real."`,
    analysis: `The strong answer opens with a specific detail (Kyoto, three years ago), develops three bullet points (season, contrast, shrine), and ends on a personal connection (study + reality). It uses past tense accurately throughout and varies sentence length naturally.`,
    patternRows: [
      { pattern: 'Opening: "I\'d like to talk about..."', meaning: 'Name the specific person/place/event immediately — no vague warm-up', example: '"I\'d like to talk about a colleague I worked with about five years ago, who had an unusually practical approach to problem-solving."' },
      { pattern: 'Past narrative tense', meaning: 'Use past simple for completed actions, past continuous for background', example: '"We were working on a tight deadline when she suggested an approach that none of us had considered."' },
      { pattern: '"What struck me most was..." / "The thing I remember best is..."', meaning: 'Signal your most developed point — shows evaluation, not just description', example: '"What struck me most was how calm she remained under pressure — a quality I have consciously tried to develop since."' },
    ],
    whenItems: [
      'During the one-minute preparation: write four brief notes, not full sentences.',
      'When starting: use "I\'d like to talk about..." to launch without hesitation.',
      'At the 90-second mark: move to your "and the reason I chose this is..." closing.',
    ],
    mistakes: [
      { weak: 'Starting with "Um, so, I think I will talk about..." for 10 seconds.', strong: '"I\'d like to talk about a book I read during university that significantly changed how I thought about..."', fix: 'Hesitation at the start wastes time and lowers Fluency scores. Prepare your first sentence in the minute before you speak.' },
      { weak: 'Finishing in 45 seconds.', strong: 'Extending to 1.5-2 minutes by developing the "why" and "what I learned."', fix: 'If you run out of content, use: "What I found interesting about this was..." or "Looking back on this now, I think..."' },
      { weak: 'Describing only what happened without evaluation.', strong: 'Describing what happened + what you thought/felt + what changed because of it.', fix: 'Description alone earns Band 5-6. Evaluation ("What this taught me was...") pushes into Band 7.' },
    ],
    choiceQ: 'Which opening sentence best starts a Part 2 answer about a person you admire?',
    choiceOptions: [
      '"Um, so I will talk about someone I admire. I need to think about who... maybe my teacher."',
      '"I\'d like to talk about my secondary school science teacher, who had a talent for making abstract concepts feel immediately practical."',
      '"There are many people I admire and it is hard to choose just one because they are all very good."',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Specific person (science teacher), specific quality (abstract → practical), no hesitation, no vague warm-up.',
    choiceWrong: 'Not yet. The best opening names the specific person and includes one identifying detail immediately.',
    orderAnswer: '"What struck me most||was how she managed to connect||each lesson to a real problem we might actually face."',
    orderCorrect: 'Correct. "What struck me most" signals your main evaluation point; "was how she managed to" describes the quality; the that-clause specifies it.',
    orderWrong: 'Not yet. "What struck me most" opens the evaluative clause; "was how" connects; the specific behaviour follows.',
    sortInstruction: 'Sort each Part 2 extension sentence: adds evaluative depth or just describes?',
    sortRows: [
      { text: '"Looking back, I think that trip fundamentally changed how I approach unfamiliar situations — I became much more comfortable with uncertainty."', target: 'Evaluative depth' },
      { text: '"We went to the beach and it was hot and we swam and ate food and it was nice."', target: 'Just describes' },
      { text: '"What I found most valuable about that experience was the way it challenged assumptions I had held for years."', target: 'Evaluative depth' },
      { text: '"The weather was good and I took many photos and I enjoyed it very much."', target: 'Just describes' },
    ],
    sortCategories: ['Evaluative depth', 'Just describes'],
    sortCorrect: 'Correct. Evaluative sentences reflect on meaning, change, or insight. Descriptive sentences list events without interpretation.',
    sortWrong: 'Some rows are wrong. Evaluative depth uses "Looking back," "What I found valuable," "This changed how I..." Purely descriptive narrates events in sequence.',
    whyText: `Part 2 is the main opportunity to demonstrate range of vocabulary and grammar. Evaluative language ("What struck me was...," "This taught me...," "Looking back...") shows the examiner you can handle abstract ideas and personal reflection — both of which are directly assessed in Lexical Resource and GRA. A narrative with no evaluation stays at Band 6 regardless of grammar accuracy.`,
  },

  // ---- GRAMMAR (SHARED) ----------------------------------------------------

  'present-perfect-vs-past-simple': {
    intro: `Both tenses describe past events, but they have completely different jobs. The past simple describes a finished action at a specific time. The present perfect connects a past action to the present — either the action happened at an unspecified time, or its effects are still relevant now. Confusing them is one of the most penalised grammar errors in both IELTS and CELPIP writing because it changes meaning, not just style.`,
    weak: `"I have graduated in 2019." / "She already told me." / "Have you seen him yesterday?"`,
    strong: `"I graduated in 2019." (specific time = past simple) / "She has already told me." (relevance to now = present perfect) / "Did you see him yesterday?" (specific time = past simple)`,
    analysis: `The rule: if the sentence contains a specific past time reference (yesterday, in 2019, last week, when I was young), use past simple. If there is no specific time or the effect continues now, use present perfect. Time references and present perfect cannot share a sentence.`,
    patternRows: [
      { pattern: 'Past simple + specific time', meaning: 'Use past simple when you name when the action happened', example: 'She graduated in 2018. / They launched the product last March. / I visited Kyoto three years ago.' },
      { pattern: 'Present perfect + no specific time', meaning: 'Use present perfect when time is unspecified or ongoing', example: 'She has graduated. (we do not know or care when) / Research has shown that... / I have visited Kyoto.' },
      { pattern: 'Present perfect with "since/for/already/yet/just/ever/never"', meaning: 'These time words signal present perfect — they connect past to present', example: 'She has worked here for five years. / I have already submitted the application. / Have you ever been to Canada?' },
      { pattern: 'Past simple with "yesterday/last/ago/in [year]/when"', meaning: 'These time words require past simple — they pin the action to a finished point', example: 'She worked here last year. / I submitted it yesterday. / When did you arrive?' },
    ],
    whenItems: [
      'IELTS Task 1: describing changes up to the present ("has risen since 2010") vs changes at a past point ("rose in 2015").',
      'CELPIP Task 2: discussing personal experience ("I have worked in healthcare for ten years").',
      'Speaking Part 1: talking about your life experience ("I have lived here for three years") vs a completed event ("I moved here in 2021").',
    ],
    mistakes: [
      { weak: '"Research has proved in 2020 that screen time affects sleep."', strong: '"Research proved in 2020 that screen time affects sleep." (specific year → past simple)', fix: '"Has proved in 2020" is wrong because the specific year makes it a completed past event. Past simple required.' },
      { weak: '"I have visited Paris last year."', strong: '"I visited Paris last year." (last year = specific time)', fix: '"Last year" always triggers past simple. Never use present perfect with "last year/month/week."' },
      { weak: '"She already told me."', strong: '"She has already told me." (already = present perfect signal)', fix: '"Already" usually goes with present perfect in formal writing (past simple in informal American English, but not in IELTS).' },
    ],
    choiceQ: 'Which sentence uses the correct tense?',
    choiceOptions: [
      'Researchers have discovered a new vaccine last year.',
      'Researchers discovered a new vaccine last year.',
      'Researchers have discovered a new vaccine in last year.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Last year" is a specific past time reference, so past simple ("discovered") is required. Present perfect cannot be used with specific past time.',
    choiceWrong: 'Not yet. Identify the time reference in each sentence — does it name a specific past time or not? That determines the tense.',
    orderAnswer: 'The government has invested heavily in renewable energy||since the carbon tax was introduced||in 2018.',
    orderCorrect: 'Correct. "Has invested" (present perfect, no end time) + "since" (connects to a past starting point) + "was introduced in 2018" (specific past event = past simple).',
    orderWrong: 'Not yet. The main clause uses present perfect + "since." The since-clause names the starting point in past simple.',
    sortInstruction: 'Sort each sentence: correct tense use or tense error?',
    sortRows: [
      { text: 'Emissions have risen steadily since the industrial era began.', target: 'Correct' },
      { text: 'The company has launched its new product last Tuesday.', target: 'Tense error' },
      { text: 'She has worked in public health for over a decade.', target: 'Correct' },
      { text: 'I have seen him yesterday at the conference.', target: 'Tense error' },
    ],
    sortCategories: ['Correct', 'Tense error'],
    sortCorrect: 'Correct. Present perfect pairs with "since/for" and unspecified time; past simple pairs with specific times like "last Tuesday" and "yesterday."',
    sortWrong: 'Some rows are wrong. The test: if the sentence has "yesterday," "last [period]," or "in [year]," it must use past simple — not present perfect.',
    whyText: `This tense distinction is tested directly in both IELTS and CELPIP reading (identifying the time frame of a statement) and penalised in writing and speaking under Grammatical Range and Accuracy. A single wrong tense in a paragraph is a minor error; a pattern of tense confusion across the essay signals poor GRA control and pushes the band score below 7.`,
  },

  'passive-voice-exam-writing': {
    intro: `The passive voice is a grammatical structure, not just a style choice. In exam writing it serves three specific functions: describing processes (where the actor is irrelevant), attributing general views (without naming a specific person), and creating formal academic register. Using it arbitrarily does not help; using it for these three purposes does.`,
    weak: `"People do many things with data. Companies collect it. They analyse it. Then they use it to make decisions."`,
    strong: `"Data is collected continuously from user interactions, then analysed for patterns, and ultimately used to inform product and pricing decisions."`,
    analysis: `The strong version uses passive throughout because the actor (tech companies, their teams) is irrelevant — the focus is the process itself. The passive also allows three actions to be linked in one sentence, which is more efficient and shows grammatical range.`,
    patternRows: [
      { pattern: 'is/are + past participle', meaning: 'Present passive — ongoing or habitual processes', example: 'Applications are reviewed by a panel of three experts.' },
      { pattern: 'was/were + past participle', meaning: 'Past passive — completed action, actor not important', example: 'The policy was introduced in 2015 and remained in effect for a decade.' },
      { pattern: 'has/have been + past participle', meaning: 'Perfect passive — past action with present relevance', example: 'Significant progress has been made in reducing carbon emissions since 2010.' },
      { pattern: 'It is argued/claimed/suggested that', meaning: 'Impersonal passive for reporting views — avoids "people say"', example: 'It is widely argued that standardised testing fails to capture genuine intellectual ability.' },
    ],
    whenItems: [
      'Task 1 Academic — process diagrams: always use passive for each stage.',
      'Task 2 — attributing a view to researchers, critics, or society in general.',
      'Any time the actor of the action is unknown, obvious, or irrelevant to your point.',
    ],
    mistakes: [
      { weak: '"It was introduced by them in 2020."', strong: '"It was introduced in 2020." (omit the by-agent when it adds nothing)', fix: 'If the by-agent is "them" or "someone" or "people," drop it entirely. Passive exists partly to omit vague agents.' },
      { weak: '"The results were being analysed carefully."', strong: '"The results were analysed carefully." (past passive, not past passive progressive)', fix: 'Past passive progressive (were being + pp) is rare and often unnecessary. Use simple past passive instead.' },
      { weak: 'Using passive in every sentence to sound formal.', strong: 'Mixing active and passive — one-two per paragraph of each.', fix: 'All-passive writing is unnatural and loses GRA points for range. Active and passive should alternate.' },
    ],
    choiceQ: 'Which sentence correctly uses passive voice to describe a process?',
    choiceOptions: [
      'Workers are putting the material in the machine where it makes the product.',
      'The raw material is fed into the machine, compressed under high pressure, and then formed into the final shape.',
      'The machine is being put the material into by the workers who are there.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. Three consecutive passive verbs (is fed, compressed, formed) describe a manufacturing process efficiently without naming who performs each step.',
    choiceWrong: 'Not yet. A correct process passive uses is/are + past participle. The actor is omitted.',
    orderAnswer: 'The application is submitted online,||reviewed by an automated system within 24 hours,||and then forwarded to a human assessor.',
    orderCorrect: 'Correct. Three passive stages linked with commas and "then" — the correct structure for a process description.',
    orderWrong: 'Not yet. Stage 1 (submitted), then stage 2 (reviewed + timeframe), then stage 3 (forwarded) — all in present passive.',
    sortInstruction: 'Sort each sentence: appropriate passive use or passive error?',
    sortRows: [
      { text: 'It is widely believed that regular exercise improves cognitive function.', target: 'Appropriate' },
      { text: 'The data has been analysed by it and the results were produced by someone.', target: 'Passive error' },
      { text: 'Carbon emissions have been reduced by 18% since the introduction of the carbon tax.', target: 'Appropriate' },
      { text: 'The problem was being very difficult and it was not being solved by them.', target: 'Passive error' },
    ],
    sortCategories: ['Appropriate', 'Passive error'],
    sortCorrect: 'Correct. Appropriate passive omits vague agents and uses clean auxiliary + past participle. Errors use vague agents ("by it," "by someone") or progressive passive unnecessarily.',
    sortWrong: 'Some rows are wrong. Good passive: subject + is/are/was/were/has been + past participle (agent optional). Bad passive: tangled agents, progressive overuse, or wrong verb form.',
    whyText: `Passive voice is assessed under GRA for range and under LR for register. Using it for process descriptions (Task 1) and view attribution (Task 2) shows you can deploy it for a purpose. Using it randomly or excessively signals you are over-relying on it to sound academic — which examiners can detect.`,
  },

  'articles-a-an-the': {
    intro: `Articles are the most frequently tested grammar point in IELTS and CELPIP writing, and the most frequently wrong. Native English speakers use articles automatically; non-native speakers must learn the rule explicitly. The rule is not complicated: "a/an" introduces something new or non-specific; "the" refers to something already known or unique; zero article (no article) is used for general plurals and most uncountable nouns.`,
    weak: `"The education is important for the society. The government should invest in the education to improve the quality of life."`,
    strong: `"Education is important for society as a whole. Governments should invest in educational infrastructure to improve quality of life."`,
    analysis: `"Education" and "society" are general concepts — no article. "The education" implies a specific education system already discussed, which it is not here. "The government" implies a specific government — here, governments in general are meant, so plural with no article is correct.`,
    patternRows: [
      { pattern: 'Zero article = general/uncountable', meaning: 'No article before uncountable nouns used generally, and plural nouns used generally', example: 'Education is valuable. / Governments face difficult decisions. / Research suggests... / Information is power.' },
      { pattern: '"The" = specific/already known', meaning: '"The" signals: we both know which one', example: 'The government of Canada (specific government) / The research conducted in 2020 (the one we just mentioned) / The sun (unique)' },
      { pattern: '"A/An" = first mention or non-specific', meaning: 'Use before singular countable nouns on first mention or when the specific identity does not matter', example: 'A recent study found that... / She works at a university. / This is an important issue.' },
      { pattern: 'Uncountable nouns: never "a/an", never plural', meaning: '"Information, advice, research, evidence, equipment, knowledge, furniture" have no article and no plural form', example: 'Research shows... (not: A research / researches) / He gave me advice. (not: an advice / advices)' },
    ],
    whenItems: [
      'Before any noun — pause and decide: general? specific? first mention?',
      'When the noun is uncountable — remove the article and the plural s.',
      'When writing an IELTS introduction that paraphrases the question — check every noun.',
    ],
    mistakes: [
      { weak: '"The social media has many advantages."', strong: '"Social media has many advantages." (general concept = no article)', fix: '"The social media" implies a specific social media platform already named. For the general concept, use no article.' },
      { weak: '"A government should provide the free healthcare for a public."', strong: '"Governments should provide free healthcare for the public." (general plural; "the public" is a fixed phrase)', fix: '"A government" means one specific unnamed government. For governments in general, use the plural with no article.' },
      { weak: '"The education plays an important role in a development of society."', strong: '"Education plays an important role in the development of society."', fix: '"The education" and "a development" are both wrong. "Education" is general (no article); "the development of society" is specific (named relationship).' },
    ],
    choiceQ: 'Which sentence uses articles correctly?',
    choiceOptions: [
      'The technology has changed the way a people communicate in the modern society.',
      'Technology has changed the way people communicate in modern society.',
      'A technology has changed the ways people are communicate in a modern society.',
    ],
    choiceAnswer: 1,
    choiceCorrect: 'Correct. "Technology" (general, uncountable = no article), "the way" (specific reference = the), "people" (general plural = no article), "modern society" (general concept = no article).',
    choiceWrong: 'Not yet. Check each noun: is it being used generally (no article) or specifically (the)? Is it uncountable (no article, no plural)?',
    orderAnswer: 'Access to quality education||is one of the most reliable predictors||of long-term economic mobility.',
    orderCorrect: 'Correct. "Access to quality education" — both uncountable, no article. "One of the most reliable predictors" — superlative requires "the." "Long-term economic mobility" — general abstract, no article.',
    orderWrong: 'Not yet. "Access to education" = no articles (uncountable). "One of the most..." always needs "the." "Economic mobility" = general, no article.',
    sortInstruction: 'Sort each phrase: correct article use or article error?',
    sortRows: [
      { text: 'Research suggests that regular exercise improves cognitive function.', target: 'Correct' },
      { text: 'The researches show that the people need more sleep.', target: 'Error' },
      { text: 'Access to healthcare is a fundamental human right.', target: 'Correct' },
      { text: 'An information is very useful for a decision-making.', target: 'Error' },
    ],
    sortCategories: ['Correct', 'Error'],
    sortCorrect: 'Correct. "Research" and "information" are uncountable — no article, no plural. "People" is a general plural — no article. "The people" means a specific group.',
    sortWrong: 'Some rows are wrong. Uncountable nouns (research, information, advice, evidence) never take "a" or "the" when used generally, and never add "s."',
    whyText: `Article errors are among the most frequently penalised mistakes in IELTS and CELPIP writing because they appear in almost every sentence. A single article error does not heavily penalise you, but consistent article errors across an essay signal a pattern of inaccuracy that holds the GRA score at Band 5-6. Eliminating article errors from your writing is one of the highest-return grammar improvements available.`,
  },

};

// ---------------------------------------------------------------------------
// Topic registry - must match CONTENT keys exactly for full content
// ---------------------------------------------------------------------------
const TOPIC_REGISTRY = [
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'task-2-opinion-essay-structure', title: 'IELTS Task 2 Opinion Essay Structure', excerpt: 'Build a clear opinion essay with a consistent position, two developed body paragraphs, and a conclusion that earns Band 7.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'task-2-discussion-essay-both-views', title: 'IELTS Task 2 Discussion Essay: Both Views', excerpt: 'Write a balanced discussion essay that represents both sides fairly and commits to a clear final position.' },
  { exam: 'ielts', skill: 'writing', level: 'C1', slug: 'task-2-problem-solution-essay', title: 'IELTS Task 2 Problem Solution Essay', excerpt: 'Present specific causes and concrete, mechanism-backed solutions for a Band 7+ problem-solution response.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'task-2-advantages-disadvantages', title: 'IELTS Task 2 Advantages and Disadvantages Essay', excerpt: 'Analyse both sides equitably with precise vocabulary and a measured weighing conclusion.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'task-1-academic-overview-sentences', title: 'IELTS Task 1 Academic Overview Sentences', excerpt: 'Write accurate overview statements that identify the dominant trend without listing data points.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'task-1-data-comparison-language', title: 'IELTS Task 1 Data Comparison Language', excerpt: 'Move from description to analysis using proportional comparisons, gap-tracking, and simultaneous contrasts.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'task-1-general-training-letter-types', title: 'IELTS Task 1 General Training: Letter Types and Tone', excerpt: 'Match formal, semi-formal, and informal tone precisely so every bullet point is fully addressed.' },
  { exam: 'ielts', skill: 'writing', level: 'C1', slug: 'cohesion-techniques-band-7', title: 'IELTS Writing Cohesion Techniques for Band 7+', excerpt: 'Replace over-reliance on connectors with referencing, substitution, and logical sentence chaining.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'grammar-accuracy-under-time-pressure', title: 'IELTS Writing Grammar Accuracy Under Time Pressure', excerpt: 'Apply a five-point accuracy checklist to catch the errors that consistently hold scores below Band 7.' },
  { exam: 'ielts', skill: 'writing', level: 'C1', slug: 'lexical-resource-upgrade', title: 'IELTS Lexical Resource Upgrade for Band 7+', excerpt: 'Use precise collocations and topic vocabulary naturally — without forcing memorised phrases that cost you points.' },
  { exam: 'ielts', skill: 'writing', level: 'B2', slug: 'passive-voice-task-1-and-task-2', title: 'Passive Voice in IELTS Writing Tasks 1 and 2', excerpt: 'Use passive voice for processes, view attribution, and register — and alternate it with active for GRA range.' },
  { exam: 'ielts', skill: 'writing', level: 'B1', slug: 'basic-essay-paragraph-structure', title: 'Basic Essay Paragraph Structure for IELTS', excerpt: 'Build every body paragraph using the point-evidence-explanation pattern that earns Task Achievement.' },

  { exam: 'ielts', skill: 'speaking', level: 'B2', slug: 'part-1-answer-pattern', title: 'IELTS Speaking Part 1: High-Score Answer Pattern', excerpt: 'Deliver 2-4 sentence answers with a position, a reason, and a specific detail — no fillers, no scripts.' },
  { exam: 'ielts', skill: 'speaking', level: 'B2', slug: 'part-2-cue-card-strategy', title: 'IELTS Speaking Part 2 Cue Card Strategy', excerpt: 'Use the one-minute preparation to plan four content points and a confident opening sentence.' },

  { exam: 'both', skill: 'grammar', level: 'B1', slug: 'present-perfect-vs-past-simple', title: 'Present Perfect vs Past Simple', excerpt: 'Choose the right tense every time: specific past time = past simple; unspecified or ongoing = present perfect.' },
  { exam: 'both', skill: 'grammar', level: 'B2', slug: 'passive-voice-exam-writing', title: 'Passive Voice in Exam Writing', excerpt: 'Use passive for processes, view attribution, and formality — and avoid the three most common passive errors.' },
  { exam: 'both', skill: 'grammar', level: 'B1', slug: 'articles-a-an-the', title: 'Articles: A, An, and The in Exam Writing', excerpt: 'Apply the three-rule system — general/no article, first mention/a, specific/the — consistently across your writing.' },
];

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = { exam: 'all', skill: 'all', count: Infinity, dryRun: false, overwrite: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--exam') opts.exam = argv[++i];
    else if (arg === '--skill') opts.skill = argv[++i];
    else if (arg === '--count') opts.count = Number(argv[++i]);
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--overwrite') opts.overwrite = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function escapeYaml(v) { return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
function escapeAttr(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

function scoreMap(level) {
  return { A1: '3.0-4.0', A2: '4.0-5.0', B1: '5.0-6.0', B2: '6.0-7.0', C1: '7.0-8.0', C2: '8.5-9.0' }[level] ?? '6.0-7.0';
}
function clbMap(level) {
  return { A1: '2-3', A2: '4-5', B1: '6-7', B2: '7-8', C1: '9-10', C2: '11-12' }[level] ?? '7-8';
}
function examArray(exam) {
  if (exam === 'ielts') return ['IELTS'];
  if (exam === 'celpip') return ['CELPIP'];
  return ['IELTS', 'CELPIP'];
}
function outDir(exam, skill) {
  return path.join(LESSONS_ROOT, exam === 'both' ? 'shared' : exam, skill);
}
async function nextIndex(dir) {
  let files = [];
  try { files = (await readdir(dir)).filter(f => /^\d+/.test(f)); } catch { }
  if (files.length === 0) return 1;
  const nums = files.map(f => parseInt(f.match(/^(\d+)/)[1], 10));
  return Math.max(...nums) + 1;
}
async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function levelLabel(level) {
  return { B1: 'Band 5-6', B2: 'Band 6-7', C1: 'Band 7+', C2: 'Band 8+' }[level] ?? level;
}

function buildMdx(topic, idx) {
  const { exam, skill, level, slug, title, excerpt } = topic;
  const c = CONTENT[slug];
  const today = new Date().toISOString().slice(0, 10);
  const exams = examArray(exam);
  const examStr = exam === 'both' ? 'IELTS' : exam.toUpperCase();
  const examLabel = exam === 'both' ? 'IELTS and CELPIP' : exam.toUpperCase();

  if (!c) {
    console.warn(`  WARNING: No specific content for slug "${slug}" — skipping.`);
    return null;
  }

  // Build pattern rows JSX
  const patternRowsJsx = c.patternRows.map(r =>
    `    { pattern: "${escapeYaml(r.pattern)}", meaning: "${escapeYaml(r.meaning)}", example: "${escapeYaml(r.example)}" }`
  ).join(',\n');

  // Build mistakes table rows
  const mistakeRows = (c.mistakes || []).map(m =>
    `| ${m.weak} | ${m.strong} | ${m.fix} |`
  ).join('\n');

  // Build sort rows
  const sortRows = (c.sortRows || []).map((r, i) => {
    const [catA, catB] = c.sortCategories;
    return `<div class="practice-sort-row" data-sort-target="${escapeAttr(r.target)}" data-sort-row="${i}">
  <p>${r.text}</p>
  <div class="practice-sort-actions">
    <button type="button" class="practice-sort-btn" data-sort-choice="${escapeAttr(catA)}">${catA}</button>
    <button type="button" class="practice-sort-btn" data-sort-choice="${escapeAttr(catB)}">${catB}</button>
  </div>
</div>`;
  }).join('\n');

  // Build order chips (shuffled — reverse order from answer)
  const orderParts = c.orderAnswer.split('||');
  const shuffled = [...orderParts].reverse(); // simple shuffle: just reverse
  const orderChips = shuffled.map((chunk, i) =>
    `<button type="button" class="practice-chip" data-chip-value="${escapeAttr(chunk)}" data-chip-id="2-${i}">
  ${chunk}
</button>`
  ).join('\n');

  const [catA, catB] = c.sortCategories;

  return `---
test: "${examStr}"
skill: "${skill}"
title: "${escapeYaml(title)}"
category: "${skill}"
level: "${level}"
ieltsBand: "${scoreMap(level)}"
clb: "${clbMap(level)}"
exam: [${exams.map(e => `"${e}"`).join(', ')}]
excerpt: "${escapeYaml(excerpt)}"
date: "${today}"
tags: ["${skill}", "${exam === 'both' ? 'ielts' : exam}", "exam-prep", "${level.toLowerCase()}"]
heroTip: "Read the Examples first. Do the Practice Lab without looking back. Then note one pattern to use in your next practice session."
draft: false
---

import LessonShell from "../../../../components/lesson/LessonShell.astro";
import Callout from "../../../../components/lesson/Callout.astro";
import PatternTable from "../../../../components/lesson/PatternTable.astro";
import MiniQuiz from "../../../../components/lesson/MiniQuiz.astro";

<LessonShell
  title="${escapeYaml(title)}"
  description="${escapeYaml(excerpt)}"
  level="${levelLabel(level)}"
  exam="${examStr}"
  skill="${skill}"
  date="${today}"
>

## What this lesson covers

${c.intro}

## Examples

<div class="lesson-grid">
  <div class="panel">
    <h3>Weak</h3>
    <p>${c.weak}</p>
  </div>
  <div class="panel">
    <h3>Stronger</h3>
    <p>${c.strong}</p>
  </div>
</div>

${c.analysis}

## How It Works

<PatternTable
  caption="Core patterns"
  rows={[
${patternRowsJsx}
  ]}
/>

<section class="lesson-panel lesson-panel-when">
  <h3>Use this when</h3>
  <ul>
    ${c.whenItems.map(w => `<li>${w}</li>`).join('\n    ')}
  </ul>
</section>

## Common Mistakes

| Avoid | Prefer | Why |
|-------|--------|-----|
${mistakeRows}

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
  <p class="practice-task-question">${c.choiceQ}</p>
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
  <p class="practice-task-question">${c.sortInstruction}</p>
  <div class="practice-sort-list">
${sortRows}
  </div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
  </div>
</div>

## Why It Matters

${c.whyText}

<div class="lesson-support-callout">
  <p>Get targeted corrections and a practical improvement plan.</p>
  <ul>
    <li><a href="/tutoring">Private Tutoring</a></li>
    <li><a href="/ai-feedback">AI Writing Feedback</a></li>
  </ul>
</div>

</LessonShell>
`;
}

async function main() {
  const opts = parseArgs(process.argv);

  let topics = TOPIC_REGISTRY.filter(t => {
    const examMatch = opts.exam === 'all'
      ? true
      : opts.exam === 'both'
        ? t.exam === 'both'
        : t.exam === opts.exam;
    const skillMatch = opts.skill === 'all' || t.skill === opts.skill;
    return examMatch && skillMatch;
  });

  if (opts.count < Infinity) topics = topics.slice(0, opts.count);

  console.log(`\nLesson generator v2 — specific content per topic`);
  console.log(`Topics: ${topics.length}${opts.dryRun ? ' (dry run)' : ''}\n`);

  let created = 0, skipped = 0;

  for (const topic of topics) {
    const dir = outDir(topic.exam, topic.skill);
    const idx = await nextIndex(dir);
    const paddedIdx = String(idx).padStart(2, '0');
    const filename = `${paddedIdx}-${topic.slug}.mdx`;
    const filepath = path.join(dir, filename);

    if (await fileExists(filepath) && !opts.overwrite) {
      console.log(`  skip  ${path.relative(process.cwd(), filepath)}`);
      skipped++;
      continue;
    }

    const content = buildMdx(topic, idx);
    if (!content) { skipped++; continue; }

    if (!opts.dryRun) {
      await mkdir(dir, { recursive: true });
      await writeFile(filepath, content, 'utf8');
    }
    console.log(`  ${opts.dryRun ? 'would create' : 'created'}  ${path.relative(process.cwd(), filepath)}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
