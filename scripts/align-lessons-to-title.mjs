#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LESSON_DIR = path.resolve('src/content/lessons');

function extractParts(raw) {
  const match = raw.match(/^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  if (!match) return null;
  return {
    head: match[1],
    frontmatter: match[2],
    sep: match[3],
    body: match[4],
  };
}

function getField(frontmatter, key) {
  const quoted = frontmatter.match(new RegExp(`^${key}:\\s*"([^"]*)"`, 'm'));
  if (quoted) return quoted[1].trim();

  const plain = frontmatter.match(new RegExp(`^${key}:\\s*([^\\n]+)`, 'm'));
  return plain ? plain[1].trim() : '';
}

function parseExam(frontmatter) {
  const raw = getField(frontmatter, 'exam');
  if (!raw) return ['IELTS', 'CELPIP'];

  if (raw.startsWith('[') && raw.endsWith(']')) {
    const items = raw
      .slice(1, -1)
      .split(',')
      .map((item) => item.replace(/"/g, '').trim())
      .filter(Boolean);
    return items.length > 0 ? items : ['IELTS', 'CELPIP'];
  }

  return [raw.replace(/"/g, '').trim()];
}

function normalizeLevel(frontmatter, fileName, title) {
  const byField = getField(frontmatter, 'level').toUpperCase();
  if (byField) return byField;

  const byFile = fileName.match(/-(a1|a2|b1|b2|c1|c2)\.md$/i);
  if (byFile) return byFile[1].toUpperCase();

  const byTitle = title.match(/\((A1|A2|B1|B2|C1|C2)\)/i);
  return byTitle ? byTitle[1].toUpperCase() : 'B2';
}

function stripLevelTag(text) {
  return text.replace(/\s*\((A1|A2|B1|B2|C1|C2)\)\s*/gi, ' ').replace(/\s+/g, ' ').trim();
}

function levelFocus(level) {
  const map = {
    A1: 'very short and very clear',
    A2: 'clear and practical',
    B1: 'organized and accurate',
    B2: 'precise with controlled complexity',
    C1: 'nuanced and efficient',
    C2: 'highly precise and strategic',
  };
  return map[level] || map.B2;
}

function grammarFocusTerm(topic) {
  if (/\b(twelve\s+tenses|12\s+tenses|tense\s+review)\b/i.test(topic)) {
    return 'the full tense system';
  }
  if (/a,\s*an,\s*and\s*the/i.test(topic)) return 'articles (a, an, the)';
  const stripped = topic.replace(/^(using|use of|how to use)\s+/i, '').trim();
  if (stripped && stripped !== topic) return stripped;
  const colonSplit = topic.split(':')[0].trim();
  if (colonSplit && colonSplit.length <= 24) return colonSplit;

  const ofMatch = topic.match(/\bof\s+([A-Za-z][A-Za-z\s'-]*)$/i);
  if (ofMatch) return ofMatch[1].trim();

  return topic;
}

function topicExplanation(topic, category) {
  const t = topic.toLowerCase();
  const focus = grammarFocusTerm(topic);

  if (/(twelve\s+tenses|12\s+tenses|tense\s+review)/.test(t)) {
    return {
      definition: 'English has 12 core tense-aspect forms: simple, progressive, perfect, and perfect progressive across present, past, and future timelines.',
      use: 'Choose tense by timeline first, then choose aspect for meaning: simple for facts/completed events, progressive for ongoing action, perfect for prior connection, and perfect progressive for duration up to a reference point.',
      conditions: [
        'Use time signals (now, yesterday, since, by next month) to anchor timeline before choosing form.',
        'Do not mix incompatible timeline markers and tense forms in the same clause.',
        'When comparing two times, use perfect forms to show the earlier action clearly.',
      ],
      examples: [
        'Since January, attendance has improved every week. (present perfect)',
        'By next month, the team will have finished the pilot. (future perfect)',
      ],
    };
  }

  if (/(semicolon|semicolons|colon|colons)/.test(t)) {
    return {
      definition: `A semicolon (;) links two closely related independent clauses when you want a stronger connection than a period but more separation than a comma. A colon (:) introduces what comes next, such as an explanation, list, reformulation, or conclusion.`,
      use: `Use a semicolon when each side can stand as a full sentence and the ideas are tightly connected. Use a colon after a complete clause when the second part clarifies or expands the first part. Avoid using either mark after incomplete sentence stems.`,
      conditions: [
        'Both sides of a semicolon should be grammatically complete clauses.',
        'A colon should follow a complete clause, not a fragment.',
        'Do not combine a semicolon with a coordinating conjunction like and/but in the same join unless style requires it.',
      ],
      examples: [
        'The pilot reduced delays by 18%; commuter satisfaction increased in the next survey cycle.',
        'The committee reached one conclusion: route reliability must improve before expansion.',
      ],
    };
  }

  if (/(article|a, an, and the|a an the)/.test(t)) {
    return {
      definition: `Articles mark whether a noun is specific, non-specific, singular, or already known to the reader. In English, the main article choices are a, an, and the.`,
      use: `Use a/an for singular countable nouns when introducing something non-specific, and use the when the noun is specific, previously mentioned, unique, or clear from context.`,
      conditions: [
        'Use a before consonant sounds and an before vowel sounds.',
        'Use the when writer and reader can identify the same noun reference.',
        'Do not add articles to most uncountable nouns in generic statements.',
      ],
      examples: [
        'A district launched a pilot, and the pilot improved response times.',
        'The policy reduced noise near the hospital during peak traffic hours.',
      ],
    };
  }

  if (category === 'grammar') {
    const lens = (() => {
      if (/(tense|past|present|future|perfect|continuous|progressive)/.test(t)) {
        return {
          definition: `${topic} is a tense-aspect control area. You choose forms to place actions on a timeline and show completion, duration, or sequence clearly.`,
          use: `Use ${topic} by anchoring time first (past/present/future), then selecting the aspect that matches meaning (simple, progressive, perfect, or perfect progressive).`,
          conditions: [
            'Identify timeline signals (e.g., yesterday, since, by next week) before choosing tense.',
            'Use perfect forms when linking an earlier action to a later reference point.',
            'Keep tense shifts intentional and visible when moving between time frames.',
          ],
        };
      }
      if (/(conditional|if\b|would\b|could\b|might\b)/.test(t)) {
        return {
          definition: `${topic} controls hypothetical vs real situations. The form shows whether a result is factual, probable, or imagined.`,
          use: `Use ${topic} by matching the if-clause form to the result clause so probability and timeline stay consistent.`,
          conditions: [
            'Choose one conditional pattern and keep both clauses aligned.',
            'Use would/could/might in result clauses for unreal present/future meaning.',
            'Avoid mixing real and unreal patterns in one condition-result pair.',
          ],
        };
      }
      if (/(passive|active voice)/.test(t)) {
        return {
          definition: `${topic} controls sentence focus. Passive forms move attention from the doer to the action/result when that focus is more useful.`,
          use: `Use ${topic} when outcome matters more than agent, or when agent is unknown, obvious, or unnecessary in exam writing.`,
          conditions: [
            'Form passive with be + past participle and keep tense accurate.',
            'Include the agent only when it adds important information.',
            'Prefer active voice when it makes responsibility clearer.',
          ],
        };
      }
      if (/(article|a,\s*an,\s*and\s*the|a an the)/.test(t)) {
        return {
          definition: `${topic} controls noun reference. Article choice signals whether a noun is new, known, specific, or generic.`,
          use: `Use ${topic} to guide reader interpretation of noun meaning, especially in formal explanations and data commentary.`,
          conditions: [
            'Use a/an for singular countable nouns introduced for the first time.',
            'Use the for shared, specific, or previously introduced references.',
            'Avoid unnecessary articles with abstract or uncountable nouns in generic claims.',
          ],
        };
      }
      if (/(preposition|in on at|for since|to from)/.test(t)) {
        return {
          definition: `${topic} controls relational meaning between words (time, place, direction, cause, and abstract relationships).`,
          use: `Use ${topic} by selecting the preposition that matches the exact relationship required by the verb, adjective, or noun pattern.`,
          conditions: [
            'Check fixed verb/adjective + preposition combinations.',
            'Differentiate time and place sets (e.g., at/on/in) by precision and scale.',
            'Remove extra prepositions that do not carry meaning.',
          ],
        };
      }
      return {
        definition: `${topic} controls how a sentence carries meaning: reference, sequence, and emphasis must stay clear from start to finish.`,
        use: `Use ${topic} to make one precise meaning per sentence, then expand only when the added structure improves clarity for exam readers.`,
        conditions: [
          'Choose the target form after deciding the exact meaning (fact, contrast, cause, or condition).',
          'Keep agreement and word order stable before adding extra clauses or modifiers.',
          'If a longer sentence becomes harder to scan, split it and keep the same logic.',
        ],
      };
    })();

    return {
      definition: lens.definition,
      use: lens.use,
      conditions: lens.conditions,
      examples: [
        `With ${focus} used correctly, each clause signals its role clearly, so the reader can follow the idea in one pass.`,
        `Under exam time limits, accurate ${focus} helps you stay concise without losing logical links between claims and evidence.`,
      ],
    };
  }

  if (category === 'vocabulary') {
    return {
      definition: `${topic} is a lexical field used to discuss a specific domain with precise meaning and natural collocations.`,
      use: `Use this vocabulary when you need topic-appropriate, register-appropriate wording in IELTS/CELPIP writing or speaking instead of vague high-frequency words.`,
      conditions: [
        'Prefer domain-specific nouns and verbs over generic adjectives like good or bad.',
        'Use collocations that native usage expects in academic and formal contexts.',
        'Maintain consistent register and avoid slang in formal exam responses.',
      ],
      examples: [
        `The proposal improves service reliability and long-term planning capacity.`,
        `Targeted intervention produced measurable gains in attendance and outcomes.`,
      ],
    };
  }

  if (category === 'writing') {
    return {
      definition: `${topic} is a writing control skill that shapes how ideas are sequenced, supported, and interpreted by the reader.`,
      use: `Use this skill to build a clear argument flow: claim, support, evidence, and consequence. Strong use helps examiners track logic without rereading.`,
      conditions: [
        'Start with a clear claim sentence that matches the task requirement.',
        'Attach evidence that is specific enough to verify your point.',
        'Use logical connectors only when they accurately represent relationships.',
      ],
      examples: [
        `The proposal is costlier in year one; however, it lowers delay-related losses over time.`,
        `The district expanded bus priority lanes: average commute times fell across peak routes.`,
      ],
    };
  }

  return {
    definition: `${topic} is a speaking control skill used to organize answers clearly and maintain coherence under time limits.`,
    use: `Use this skill to answer directly, support with a reason, and finish with a clear conclusion while maintaining natural fluency.`,
    conditions: [
      'Open with a direct response to the question.',
      'Support with one concrete example, not abstract filler.',
      'Close with a sentence that summarizes your position.',
    ],
    examples: [
      `I support this approach because it improves reliability; for example, the pilot reduced service delays.`,
      `Overall, this option is more practical because outcomes are clearer and easier to measure.`,
    ],
  };
}

function contextFromTopic(topic) {
  const t = topic.toLowerCase();
  if (/transport|traffic|commut|bus|train|road|car/.test(t)) {
    return {
      domain: 'urban transport policy',
      prompt: 'Should city councils prioritize public transport over road expansion?',
      claim: 'A transit-first strategy can reduce congestion and travel time for workers.',
      detail: 'After adding two bus-only lanes, one district reduced peak-hour delays by 18%.',
      consequence: 'Commuters arrive more reliably, which improves attendance and productivity.',
    };
  }

  if (/education|school|student|university|classroom|teacher/.test(t)) {
    return {
      domain: 'education policy and study outcomes',
      prompt: 'Should schools spend more on tutoring support programs?',
      claim: 'Targeted support programs can improve achievement for students who are behind.',
      detail: 'One school reported higher pass rates after adding two weekly tutoring sessions.',
      consequence: 'Students gain confidence and perform better in timed exam tasks.',
    };
  }

  if (/health|medical|hospital|diet|exercise|wellness/.test(t)) {
    return {
      domain: 'public health and prevention',
      prompt: 'Should local governments invest more in preventive healthcare?',
      claim: 'Prevention programs can reduce long-term pressure on emergency services.',
      detail: 'A clinic outreach campaign increased vaccination uptake in one neighborhood.',
      consequence: 'Earlier intervention lowers treatment costs and improves health outcomes.',
    };
  }

  if (/environment|ecology|climate|pollution|emission|recycling/.test(t)) {
    return {
      domain: 'environmental policy',
      prompt: 'Should cities enforce stricter pollution controls for private vehicles?',
      claim: 'Stricter controls can improve air quality in high-density areas.',
      detail: 'Monitoring data showed lower particulate levels after low-emission zones were introduced.',
      consequence: 'Cleaner air can reduce respiratory complaints and healthcare costs.',
    };
  }

  if (/technology|digital|ai|automation|online|internet/.test(t)) {
    return {
      domain: 'technology adoption',
      prompt: 'Should workplaces expand remote and digital collaboration systems?',
      claim: 'Digital workflows can improve efficiency when teams have clear communication norms.',
      detail: 'A support team reduced response time after introducing a centralized ticket platform.',
      consequence: 'Faster coordination can improve service quality and user satisfaction.',
    };
  }

  if (/work|job|career|employment|office|company|business/.test(t)) {
    return {
      domain: 'workplace development',
      prompt: 'Should employers fund more professional training for staff?',
      claim: 'Training investment can improve output and reduce costly errors.',
      detail: 'A logistics company cut processing mistakes after monthly skills workshops.',
      consequence: 'Staff performance becomes more consistent under deadlines.',
    };
  }

  return {
    domain: 'public policy and daily life',
    prompt: 'Should communities invest more in practical public services?',
    claim: 'Focused investment can improve access, reliability, and quality of life.',
    detail: 'A pilot program improved service response times in one local district.',
    consequence: 'Residents benefit from clearer systems and more predictable support.',
  };
}

function pickGrammarPack(topic) {
  const t = topic.toLowerCase();

  if (t.includes('would')) {
    return {
      ex1Weak: 'When I was younger, I am playing outside every evening.',
      ex1Better: 'When I was younger, I would play outside every evening.',
      ex2Weak: 'If I had more time, I go to the gym every day.',
      ex2Better: 'If I had more time, I would go to the gym every day.',
      err1: 'using present tense after would',
      fix1: 'use the base verb after would (would go, would study, would improve)',
      practice1: [
        'When we were children, we would to visit our grandparents every summer.',
        'If the city improved bus routes, more people would chose public transport.',
        'She said she would arrives before the meeting started.',
      ],
      answerHints: [
        'When we were children, we would visit our grandparents every summer.',
        'If the city improved bus routes, more people would choose public transport.',
        'She said she would arrive before the meeting started.',
      ],
    };
  }

  if (t.includes('adjective order')) {
    return {
      ex1Weak: 'She bought a leather red bag for work.',
      ex1Better: 'She bought a red leather bag for work.',
      ex2Weak: 'They live in a house modern large near downtown.',
      ex2Better: 'They live in a large modern house near downtown.',
      err1: 'placing adjectives in a random order before the noun',
      fix1: 'follow a natural sequence such as opinion, size, age, shape, color, origin, material',
      practice1: [
        'He wore a cotton blue shirt to the interview.',
        'We bought an old beautiful table from the market.',
        'She adopted a small black lovely dog last week.',
      ],
      answerHints: [
        'He wore a blue cotton shirt to the interview.',
        'We bought a beautiful old table from the market.',
        'She adopted a lovely small black dog last week.',
      ],
    };
  }

  if (t.includes('comparison') || t.includes('comparative') || t.includes('superlative')) {
    return {
      ex1Weak: 'This route is more cheap than the old one.',
      ex1Better: 'This route is cheaper than the old one.',
      ex2Weak: 'It is the most easiest option for students.',
      ex2Better: 'It is the easiest option for students.',
      err1: 'combining comparison forms incorrectly (more cheaper, most easiest)',
      fix1: 'use either -er/-est or more/most, but not both together',
      practice1: [
        'This phone is more better than my old one.',
        'Her explanation was clearer than all students in class.',
        'Public transit is the most cheapest way to travel downtown.',
      ],
      answerHints: [
        'This phone is better than my old one.',
        'Her explanation was clearer than all the other students in class.',
        'Public transit is the cheapest way to travel downtown.',
      ],
    };
  }

  if (t.includes('conditional')) {
    return {
      ex1Weak: 'If governments invest in transit, traffic reduced quickly.',
      ex1Better: 'If governments invest in transit, traffic will reduce quickly.',
      ex2Weak: 'If I knew the answer, I will tell you now.',
      ex2Better: 'If I knew the answer, I would tell you now.',
      err1: 'mixing first and second conditional forms in one sentence',
      fix1: 'match the if-clause tense and result clause form correctly',
      practice1: [
        'If students study consistently, they would improve their scores quickly.',
        'If I had enough money, I will travel this summer.',
        'If the policy had started earlier, results are better now.',
      ],
      answerHints: [
        'If students study consistently, they will improve their scores quickly.',
        'If I had enough money, I would travel this summer.',
        'If the policy had started earlier, results would be better now.',
      ],
    };
  }

  if (t.includes('passive')) {
    return {
      ex1Weak: 'People recycle more plastic in this city every year.',
      ex1Better: 'More plastic is recycled in this city every year.',
      ex2Weak: 'The committee will announce the results tomorrow.',
      ex2Better: 'The results will be announced tomorrow.',
      err1: 'using an active verb form where passive focus is required',
      fix1: 'use be + past participle and keep tense accurate',
      practice1: [
        'The final report publish next Monday.',
        'Many homes damaged during the storm last night.',
        'A new policy is implement by the council this year.',
      ],
      answerHints: [
        'The final report will be published next Monday.',
        'Many homes were damaged during the storm last night.',
        'A new policy is being implemented by the council this year.',
      ],
    };
  }

  if (t.includes('article')) {
    return {
      ex1Weak: 'I bought book and umbrella from market.',
      ex1Better: 'I bought a book and an umbrella from the market.',
      ex2Weak: 'Sun rises in east every day.',
      ex2Better: 'The sun rises in the east every day.',
      err1: 'omitting a, an, or the where a noun needs one',
      fix1: 'check countable singular nouns and known specific references',
      practice1: [
        'She wants to become engineer in future.',
        'I visited museum near my house yesterday.',
        'He gave me advice that changed the way I study.',
      ],
      answerHints: [
        'She wants to become an engineer in the future.',
        'I visited the museum near my house yesterday.',
        'He gave me advice that changed the way I study.',
      ],
    };
  }

  if (t.includes('preposition')) {
    return {
      ex1Weak: 'She is interested on environmental policy.',
      ex1Better: 'She is interested in environmental policy.',
      ex2Weak: 'We discussed about the budget during class.',
      ex2Better: 'We discussed the budget during class.',
      err1: 'using incorrect or unnecessary prepositions after common verbs and adjectives',
      fix1: 'learn high-frequency verb-preposition and adjective-preposition pairs',
      practice1: [
        'He apologized on arriving late to class.',
        'They are responsible of managing the event.',
        'I depended in my friend for advice.',
      ],
      answerHints: [
        'He apologized for arriving late to class.',
        'They are responsible for managing the event.',
        'I depended on my friend for advice.',
      ],
    };
  }

  if (t.includes('present perfect')) {
    return {
      ex1Weak: 'I lived here since 2020.',
      ex1Better: 'I have lived here since 2020.',
      ex2Weak: 'She has finished her task yesterday.',
      ex2Better: 'She finished her task yesterday.',
      err1: 'mixing present perfect with finished time markers like yesterday',
      fix1: 'use present perfect for unfinished time or life experience',
      practice1: [
        'We have seen that movie last week.',
        'I am here since early morning.',
        'She has never try sushi before.',
      ],
      answerHints: [
        'We saw that movie last week.',
        'I have been here since early morning.',
        'She has never tried sushi before.',
      ],
    };
  }

  if (t.includes('relative clause')) {
    return {
      ex1Weak: 'The teacher gave feedback was very specific.',
      ex1Better: 'The teacher gave feedback that was very specific.',
      ex2Weak: 'Students who study consistently they usually improve faster.',
      ex2Better: 'Students who study consistently usually improve faster.',
      err1: 'omitting or duplicating elements in relative clause structure',
      fix1: 'attach the clause to the noun once and avoid repeating the subject',
      practice1: [
        'The course provides materials are easy to review at home.',
        'People which live near stations often use public transport more.',
        'The student who she won the prize thanked her teacher.',
      ],
      answerHints: [
        'The course provides materials that are easy to review at home.',
        'People who live near stations often use public transport more.',
        'The student who won the prize thanked her teacher.',
      ],
    };
  }

  if (t.includes('quantifier') || t.includes('few') || t.includes('little') || t.includes('many') || t.includes('much')) {
    return {
      ex1Weak: 'There are much reasons to improve public transport.',
      ex1Better: 'There are many reasons to improve public transport.',
      ex2Weak: 'The city has few money for new rail lines.',
      ex2Better: 'The city has little money for new rail lines.',
      err1: 'mixing countable and uncountable quantifiers',
      fix1: 'use many/few with countable nouns and much/little with uncountable nouns',
      practice1: [
        'We have many information about this proposal.',
        'Only a little students completed the survey.',
        'There is few evidence to support that claim.',
      ],
      answerHints: [
        'We have much information about this proposal.',
        'Only a few students completed the survey.',
        'There is little evidence to support that claim.',
      ],
    };
  }

  if (t.includes('pronoun')) {
    return {
      ex1Weak: 'When Maria met Ana, she said she needed help.',
      ex1Better: 'When Maria met Ana, Maria said she needed help.',
      ex2Weak: 'The managers told the interns that they were unprepared.',
      ex2Better: 'The managers told the interns that the report was unprepared.',
      err1: 'using unclear pronoun references in complex sentences',
      fix1: 'repeat the noun when a pronoun could refer to more than one person or thing',
      practice1: [
        'James told David that he should revise the introduction.',
        'The team presented the plan to the board, and they rejected it.',
        'When the teacher spoke to the parents, they were worried.',
      ],
      answerHints: [
        'James told David that David should revise the introduction.',
        'The team presented the plan to the board, and the board rejected it.',
        'When the teacher spoke to the parents, the parents were worried.',
      ],
    };
  }

  if (t.includes('word order') || t.includes('question')) {
    return {
      ex1Weak: 'Why you are late for class today?',
      ex1Better: 'Why are you late for class today?',
      ex2Weak: 'Never I have seen such a clear explanation.',
      ex2Better: 'Never have I seen such a clear explanation.',
      err1: 'placing auxiliaries and subjects in the wrong sequence',
      fix1: 'check whether your sentence requires statement order or inversion',
      practice1: [
        'What means this policy for low-income workers?',
        'Rarely we consider the long-term effects.',
        'How many students completed actually the assignment?',
      ],
      answerHints: [
        'What does this policy mean for low-income workers?',
        'Rarely do we consider the long-term effects.',
        'How many students actually completed the assignment?',
      ],
    };
  }

  if (t.includes('tense') || t.includes('present') || t.includes('past') || t.includes('future')) {
    return {
      ex1Weak: 'Last year, the council increases bus frequency in two districts.',
      ex1Better: 'Last year, the council increased bus frequency in two districts.',
      ex2Weak: 'By next month, we finish the pilot stage.',
      ex2Better: 'By next month, we will have finished the pilot stage.',
      err1: 'choosing tense forms that do not match time references',
      fix1: 'match verb tense to the timeline signal in each sentence',
      practice1: [
        'In 2024, the team launch a revised curriculum model.',
        'Since January, attendance improved every week.',
        'By the end of this year, the city reduce emissions by 10 percent.',
      ],
      answerHints: [
        'In 2024, the team launched a revised curriculum model.',
        'Since January, attendance has improved every week.',
        'By the end of this year, the city will reduce emissions by 10 percent.',
      ],
    };
  }

  return {
    ex1Weak: 'The city policy update improve commuter access, but the sentence form is unstable.',
    ex1Better: 'The city policy update improves commuter access, and the sentence form is stable.',
    ex2Weak: 'Students in one district reported progress, but the structure of the explanation is unclear.',
    ex2Better: 'Students in one district reported progress, and the explanation is grammatically clear.',
    err1: 'using the correct idea with an incorrect form',
    fix1: 'separate meaning choice from form checking, then edit for accuracy',
    practice1: [
      'The council approve the plan, but the timeline details remain unclear.',
      'If schools add tutoring support, more students improve exam performance.',
      'The clinic report shows progress, but one sentence switch tense without reason.',
    ],
    answerHints: [
      'The council approved the plan, but the timeline details remain unclear.',
      'If schools add tutoring support, more students will improve exam performance.',
      'The clinic report shows progress, but one sentence switches tense without reason.',
    ],
  };
}

function grammarBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const focusTerm = grammarFocusTerm(topic);
  const expl = topicExplanation(topic, 'grammar');
  const pack = pickGrammarPack(topic);
  const ex1Weak = pack.ex1Weak.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const ex1Better = pack.ex1Better.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const ex2Weak = pack.ex2Weak.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const ex2Better = pack.ex2Better.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  return `## Goal
Learn how to use **${topic}** accurately in ${examText} responses.

## What ${topic} Means
This lesson is specifically about **${topic}**. By the end, you should understand when to use it, how to form it correctly, and how to avoid common errors.

## Topic Explanation and Use
${expl.definition}

${expl.use}

Use conditions:
- ${expl.conditions[0]}
- ${expl.conditions[1]}
- ${expl.conditions[2]}

Reference examples:
- *${expl.examples[0]}*
- *${expl.examples[1]}*

## Key Rule in Plain Language
1. Choose the exact grammar job first: where **${focusTerm}** controls time, relationship, or emphasis.
2. Build a complete base clause, then place **${focusTerm}** in the position required by the pattern.
3. Check agreement and tense around **${focusTerm}** before adding extra words.
4. Add one supporting clause only if the logic stays clear in ${ctx.domain} context.
5. Re-read for one specific risk: wrong form, wrong position, or mixed timeline.

## Real-World Examples with ${topic}
### Example 1
- Weak: *${ex1Weak}*
- Better: *${ex1Better}*
- Why it works: the grammar choice supports communication instead of confusing the reader.

### Example 2
- Weak: *${ex2Weak}*
- Better: *${ex2Better}*
- Why it works: the reader can follow the logic without re-reading.

## Common Errors with ${topic}
- Error: ${pack.err1}.
- Real-world weak: *${ex1Weak}*
- Real-world better: *${ex1Better}*
- Fix: ${pack.fix1}.

- Error: mixing timelines inside one sentence.
- Real-world weak: *Last year, the council improve local services, and now residents saved time every day.*
- Real-world better: *Last year, the council improved local services, and now residents save time every day.*
- Fix: keep one timeline and match all verbs to it.

- Error: adding complexity without meaning.
- Real-world weak: *The city changed the policy, and many things happened, and it was important for many people in many ways.*
- Real-world better: *The city changed the policy, so daily travel became faster for many workers.*
- Fix: keep only forms that make your message clearer.

## Practice
### Exercise 1: Correct the Sentence
Correct each sentence so it uses **${topic}** naturally.
1. ${pack.practice1[0]}
2. ${pack.practice1[1]}
3. ${pack.practice1[2]}

### Exercise 2: Build Sentences
Write 4 sentences using **${topic}**:
- one simple statement
- one contrast sentence
- one cause-result sentence
- one exam-style summary sentence

### Exercise 3: Mini Paragraph
Write 5-6 sentences for this prompt:
*${ctx.prompt}*
Use **${focusTerm}** at least twice.

## Answer Guide
For Exercise 1, your corrected versions should:
- keep one clear timeline,
- place **${topic}** in a correct position,
- and produce a sentence that sounds natural in context.

Possible corrected versions:
1. *${pack.answerHints[0]}*
2. *${pack.answerHints[1]}*
3. *${pack.answerHints[2]}*

## Want Personalized Score Feedback?
If you want faster improvement than self-study alone, use one paid support option:
- [Essay Correction](/essay-correction)
- [1-on-1 Tutoring](/tutoring)
- [AI Writing Feedback](/celpip/writing/ai-feedback)
- [Weekly Webinar](/webinar)

Best when you need precise correction on grammar control, task response quality, and exam-style scoring.`;
}

function vocabularyBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const expl = topicExplanation(topic, 'vocabulary');
  return `## Goal
Use vocabulary for **${topic}** naturally and precisely in ${examText} tasks.

## What This Topic Covers
This lesson focuses on vocabulary choices related to **${topic}**. Strong vocabulary means choosing words and collocations that fit the exact meaning and context.

## Topic Explanation and Use
${expl.definition}

${expl.use}

Use conditions:
- ${expl.conditions[0]}
- ${expl.conditions[1]}
- ${expl.conditions[2]}

Reference examples:
- *${expl.examples[0]}*
- *${expl.examples[1]}*

## Key Rule in Plain Language
1. Define the exact meaning you need in **${topic}** before choosing words.
2. Pick one precise collocation that native users expect in ${ctx.domain} discussion.
3. Use the collocation in one sentence with a clear subject, action, and outcome.
4. Replace one vague word with a measurable or concrete term.
5. Check register and tone so the wording fits ${examText} tasks.

## Real-World Examples for ${topic}
- Weak: *This point is good for people in many ways.*
- Better: *This point is significant in ${ctx.domain} because it improves access and reliability.*

- Weak: *Leaders should do something about this problem.*
- Better: *Decision-makers should implement targeted measures to address this issue.*

## Common Errors with ${topic}
- Error: using broad words when a specific term is needed.
- Real-world weak: *This proposal is good and helpful for people in many ways.*
- Real-world better: *This proposal is beneficial because it improves service reliability for local residents.*
- Fix: choose one exact term that matches your intended meaning.

- Error: literal translation from another language.
- Real-world weak: *The city made a strong traffic control and people got more facility.*
- Real-world better: *The city introduced stricter traffic controls, and residents received better services.*
- Fix: replace translated phrases with natural English chunks.

- Error: overusing one word family in a paragraph.
- Real-world weak: *The policy is important, and this importance is important for important reasons.*
- Real-world better: *The policy is significant because it improves safety, reduces delays, and supports long-term planning.*
- Fix: vary word choice while keeping meaning precise.

## Practice
### Exercise 1: Best Word Choice
Choose the most precise option.
1. The reform had a ___ impact. (big / significant / nice)
2. Governments should ___ the main cause. (address / make / get)
3. Writers must ___ evidence for each claim. (provide / tell / put)

### Exercise 2: Rewrite for Precision
Rewrite each sentence using stronger vocabulary linked to **${topic}**.
1. This proposal helps people.
2. The outcome harms some communities.
3. This policy matters for long-term planning.

### Exercise 3: Short Response
Write 6 sentences on this prompt:
*${ctx.prompt}*
Use at least 8 precise words or chunks.

## Answer Guide
Exercise 1: 1) significant 2) address 3) provide

## Want Personalized Score Feedback?
If you want faster improvement than self-study alone, use one paid support option:
- [Essay Correction](/essay-correction)
- [1-on-1 Tutoring](/tutoring)
- [AI Writing Feedback](/celpip/writing/ai-feedback)
- [Weekly Webinar](/webinar)

Best when you need precise correction on word choice, collocations, and band-level lexical control.`;
}

function writingBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const expl = topicExplanation(topic, 'writing');

  if (/(semicolon|semicolons|colon|colons)/i.test(topic)) {
    return `## Goal
Apply **${topic}** to produce clearer, higher-scoring ${examText} writing.

## What ${topic} Means
Semicolons and colons are punctuation marks used to control logic between clauses and to guide reader expectations.

## Topic Explanation and Use
A semicolon (;) links two independent clauses that are closely related in meaning. A colon (:) introduces an explanation, list, restatement, or key conclusion after a complete clause.

Use a semicolon when both sides can stand as full sentences and the link is tight. Use a colon only after a complete clause when the next part directly explains or expands that clause.

Use conditions:
- Use a semicolon between complete clauses without a coordinating conjunction.
- Use a semicolon before conjunctive adverbs such as however, therefore, and moreover when clauses are complete.
- Use a colon after a full clause to introduce a list, explanation, or reformulation.

Reference examples:
- *The pilot reduced delays by 18%; commuter satisfaction increased in the next survey cycle.*
- *The committee reached one conclusion: route reliability must improve before expansion.*

## Key Rule in Plain Language
1. Check clause completeness first: each side of a semicolon should be a full sentence.
2. Use a semicolon to join related independent clauses without and/but.
3. Use a semicolon before conjunctive adverbs when both clauses are complete.
4. Use a colon only after a complete clause to introduce explanation, list, or conclusion.
5. Avoid punctuation misuse after fragments; rewrite the clause first, then punctuate.

## Real-World Examples with ${topic}
### Example 1
- Weaker: *The bus reform reduced delays, residents reported better reliability.*
- Better: *The bus reform reduced delays; residents reported better reliability.*
- Why it works: the semicolon correctly joins two complete, closely related clauses.

### Example 2
- Weaker: *The city prioritized one objective, to improve route reliability.*
- Better: *The city prioritized one objective: improving route reliability.*
- Why it works: the colon introduces a focused explanation after a complete clause.

## Common Errors with ${topic}
- Error: using a semicolon between an independent clause and a fragment.
- Real-world weak: *The council changed the schedule; because delays were increasing.*
- Real-world better: *The council changed the schedule because delays were increasing.*
- Fix: use semicolons only when both sides are complete clauses.

- Error: using a colon after an incomplete lead-in.
- Real-world weak: *The committee recommended: increasing peak-hour services.*
- Real-world better: *The committee made one recommendation: increase peak-hour services.*
- Fix: ensure the clause before the colon is complete.

- Error: joining clauses with commas when a semicolon is required.
- Real-world weak: *The trial lowered costs, service quality improved in three districts.*
- Real-world better: *The trial lowered costs; service quality improved in three districts.*
- Fix: replace comma splices with semicolons or split into separate sentences.

## Practice
### Exercise 1: Correct Punctuation
Correct these sentences.
1. The pilot was expensive, results improved significantly.
2. The board adopted one policy, improve off-peak frequency.
3. The route was expanded; because demand increased.

### Exercise 2: Build Sentences
Write 4 sentences using **${topic}**:
- one semicolon sentence with two independent clauses
- one colon sentence introducing explanation
- one contrast sentence using however with correct punctuation
- one exam-style summary sentence

### Exercise 3: Mini Paragraph
Write 5-6 sentences for this prompt:
*${ctx.prompt}*
Use at least one semicolon and one colon correctly.

## Sample Answer Style
Your response should prioritize clarity and syntactic control.
Aim for punctuation that reflects logic, not decoration.

## Want Personalized Score Feedback?
If you want faster improvement than self-study alone, use one paid support option:
- [Essay Correction](/essay-correction)
- [1-on-1 Tutoring](/tutoring)
- [AI Writing Feedback](/celpip/writing/ai-feedback)
- [Weekly Webinar](/webinar)

Best when you need expert correction on punctuation accuracy, cohesion, and higher-band writing control.`;
  }

  return `## Goal
Apply **${topic}** to produce clearer, higher-scoring ${examText} writing.

## What ${topic} Changes in Writing
This lesson is about using **${topic}** to improve clarity, development, and control. Examiners reward writing that is direct, logical, and easy to follow.

## Topic Explanation and Use
${expl.definition}

${expl.use}

Use conditions:
- ${expl.conditions[0]}
- ${expl.conditions[1]}
- ${expl.conditions[2]}

Reference examples:
- *${expl.examples[0]}*
- *${expl.examples[1]}*

## Key Rule in Plain Language
1. Turn the prompt into one specific claim linked to **${topic}**.
2. Build a clear sequence: claim, reason, evidence, consequence.
3. Keep sentence structure controlled so each line adds one function.
4. Add one concrete detail (group, time, or measured change) to prove the point.
5. Edit for precision: remove filler and keep only evidence-bearing wording.

## Real-World Examples with ${topic}
### Example 1
- Weaker: *This topic is important and has many effects.*
- Better: *${ctx.claim}*
- Why it works: the sentence is specific and measurable.

### Example 2
- Weaker: *I think this is good and bad in many ways.*
- Better: *${ctx.detail}*
- Why it works: the contrast is explicit and balanced.

## Common Errors with ${topic}
- Error: repeating the same point with different words.
- Real-world weak: *This policy is important, very important, and important in many ways.*
- Real-world better: *This policy matters because it improves access, reduces delays, and supports daily routines.*
- Fix: state one idea once, then add evidence.

- Error: using generic examples with no detail.
- Real-world weak: *Many places improved after changes were made.*
- Real-world better: *One district reduced response times by 18% after introducing coordinated service planning.*
- Fix: include a specific place, group, timeline, or measured result.

- Error: writing long sentences with weak logic links.
- Real-world weak: *The policy changed and many people were affected and it was good and bad for many reasons.*
- Real-world better: *The policy improved reliability for commuters; however, implementation costs were higher in the first quarter.*
- Fix: split ideas and use clear logical connectors.

## Practice
### Exercise 1: Rewrite for Clarity
Improve these sentences.
1. This issue affects public services in several ways.
2. The government should respond because current results are weak.
3. This policy has benefits and costs that need evaluation.

### Exercise 2: Focused Paragraph
Write 5-6 sentences using **${topic}**.
Include one claim, one reason, one example, and one consequence.
Use this real-world context: ${ctx.domain}.

### Exercise 3: Level Upgrade
Rewrite this sentence at ${level} standard:
*People lose marks because they do not practice enough.*

## Sample Answer Style
Your improved sentence should be specific, concise, and logically connected.
Aim to include a concrete detail such as a measured change, timeline, or named group.

## Want Personalized Score Feedback?
If you want faster improvement than self-study alone, use one paid support option:
- [Essay Correction](/essay-correction)
- [1-on-1 Tutoring](/tutoring)
- [AI Writing Feedback](/celpip/writing/ai-feedback)
- [Weekly Webinar](/webinar)

Best when you need detailed scoring guidance on clarity, cohesion, evidence use, and task achievement.`;
}

function speakingBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const expl = topicExplanation(topic, 'speaking');
  return `## Goal
Use **${topic}** to deliver clear and well-supported ${examText} speaking responses.

## What This Lesson Covers
This lesson focuses on how **${topic}** improves spoken response quality: direct answers, clear support, and smoother organization.

## Topic Explanation and Use
${expl.definition}

${expl.use}

Use conditions:
- ${expl.conditions[0]}
- ${expl.conditions[1]}
- ${expl.conditions[2]}

Reference examples:
- *${expl.examples[0]}*
- *${expl.examples[1]}*

## Key Rule in Plain Language
1. Decide your main answer first.
2. Add one clear reason linked to **${topic}**.
3. Give one concrete example from real life.
4. Keep sentence forms simple and accurate under time pressure.
5. End with one final sentence that summarizes your point.

## Real-World Examples with ${topic}
- Weak: *I agree because it is good.*
- Better: *I support this idea because ${ctx.claim.charAt(0).toLowerCase()}${ctx.claim.slice(1)} For example, ${ctx.detail.charAt(0).toLowerCase()}${ctx.detail.slice(1)}*
- Why it works: the response includes a reason and a real example.

## Common Errors with ${topic}
- Error: long introductions before the actual answer.
- Real-world weak: *Well, there are many perspectives and many factors, and in my opinion this topic is complex.*
- Real-world better: *I support this approach because it improves service reliability for residents.*
- Fix: answer in the first sentence, then expand.

- Error: repeating fillers instead of adding meaning.
- Real-world weak: *Like, you know, it is good, like, because it is good for people.*
- Real-world better: *It is effective because it reduces delays and improves access for workers.*
- Fix: replace fillers with one reason and one concrete detail.

- Error: finishing without a clear conclusion.
- Real-world weak: *So yes, that is all, maybe.*
- Real-world better: *Overall, this option is more practical because it delivers clearer and more predictable outcomes.*
- Fix: end with one summary sentence.

## Practice
### Exercise 1
Speak for 35 seconds on this prompt:
*${ctx.prompt}*

### Exercise 2
Improve this response:
*I agree because it is better and good.*

### Exercise 3
Speak for 50 seconds and include comparison, one concrete example, and a final conclusion.
Try to use this consequence idea: ${ctx.consequence}

## Want Personalized Score Feedback?
If you want faster improvement than self-study alone, use one paid support option:
- [Essay Correction](/essay-correction)
- [1-on-1 Tutoring](/tutoring)
- [AI Writing Feedback](/celpip/writing/ai-feedback)
- [Weekly Webinar](/webinar)

Best when you need speaking-specific feedback on fluency, coherence, grammar range, and lexical resource.`;
}

function decorateLessonBody(body) {
  const quizItems = [];
  let next = body
    .replace(/Real-world weak:/g, 'Weak:')
    .replace(/Real-world better:/g, 'Strong:')
    .replace(/-\s+Weaker:/g, '- Weak:')
    .replace(/-\s+Better:/g, '- Strong:');

  next = next.replace(/## Common Errors with ([^\n]+)\n([\s\S]*?)(?=\n##\s+)/g, (_m, topic, sectionBody) => {
    const cards = [];
    const errorPattern = /- Error:\s*([^\n]+)\n-\s*Weak:\s*([^\n]+)\n-\s*Strong:\s*([^\n]+)\n-\s*Fix:\s*([^\n]+)\n?/g;
    let match;
    let index = 1;

    while ((match = errorPattern.exec(sectionBody)) !== null) {
      const error = match[1].trim().replace(/\.$/, '');
      const weak = match[2].trim();
      const strong = match[3].trim();
      const fix = match[4].trim();
      if (quizItems.length < 3) {
        quizItems.push({ error, weak, strong });
      }
      cards.push(`<details class="lesson-accordion lesson-error">\n<summary>Error ${index}: ${error}</summary>\n\n- Weak: ${weak}\n- Strong: ${strong}\n- Fix: ${fix}\n</details>`);
      index += 1;
    }

    if (cards.length === 0) {
      return `## Common Errors with ${topic}\n${sectionBody}`;
    }

    return `## Common Errors with ${topic}\n${cards.join('\n\n')}\n`;
  });

  next = next.replace(/## Practice\n([\s\S]*?)(?=\n##\s+)/g, (_m, sectionBody) => {
    const intro = (() => {
      const headingIndex = sectionBody.search(/^###\s+/m);
      if (headingIndex === -1) return sectionBody.trim();
      return sectionBody.slice(0, headingIndex).trim();
    })();
    const exercisePattern = /###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+|\s*$)/g;
    const accordions = [];
    let match;

    while ((match = exercisePattern.exec(sectionBody)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      accordions.push(`<details class="lesson-accordion lesson-practice">\n<summary>${title}</summary>\n\n${content}\n</details>`);
    }

    if (accordions.length === 0) {
      return `## Practice\n${sectionBody}`;
    }

    const introBlock = intro ? `${intro}\n\n` : '';
    return `## Practice\n${introBlock}${accordions.join('\n\n')}\n`;
  });

  next = next.replace(/## Answer Guide\n([\s\S]*?)(?=\n##\s+)/g, (_m, sectionBody) => {
    return `## Answer Guide\n<details class="lesson-accordion lesson-answer">\n<summary>Open Answer Guide</summary>\n\n${sectionBody.trim()}\n</details>\n`;
  });

  if (quizItems.length > 0) {
    const cards = quizItems
      .map((item, idx) => {
        const weak = item.weak.replace(/^\*/, '').replace(/\*$/, '');
        const strong = item.strong.replace(/^\*/, '').replace(/\*$/, '');
        return `<article class="mini-quiz-card" data-answer="B">\n<p class="mini-quiz-title">Q${idx + 1}. Choose the stronger version for: ${item.error}</p>\n<div class="mini-quiz-options">\n<button type="button" data-choice="A">A. ${weak}</button>\n<button type="button" data-choice="B">B. ${strong}</button>\n</div>\n<p class="mini-quiz-feedback" aria-live="polite"></p>\n</article>`;
      })
      .join('\n\n');

    const checkpoint = `## Interactive Exercise Test\n<div class="mini-quiz" data-mini-quiz>\n<div class="mini-quiz-head">\n<p class="mini-quiz-intro">It's your turn. Choose the stronger sentence in each item.</p>\n<p class="mini-quiz-score" data-mini-quiz-score>Score: 0/${quizItems.length} | Attempted: 0/${quizItems.length}</p>\n<button type="button" class="mini-quiz-reset" data-mini-quiz-reset>Try again</button>\n</div>\n${cards}\n</div>\n`;

    next = next.replace(/\n## Want Personalized Score Feedback\?/m, `\n${checkpoint}\n## Want Personalized Score Feedback?`);
  }

  return next;
}

function buildBody(category, topic, level, examText) {
  let body = '';
  if (category === 'grammar') body = grammarBody(topic, level, examText);
  else if (category === 'vocabulary') body = vocabularyBody(topic, level, examText);
  else if (category === 'writing') body = writingBody(topic, level, examText);
  else if (category === 'speaking') body = speakingBody(topic, level, examText);
  else body = writingBody(topic, level, examText);
  return decorateLessonBody(body);
}

async function main() {
  const entries = await readdir(LESSON_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md'));

  let updated = 0;

  for (const file of files) {
    const filePath = path.join(LESSON_DIR, file.name);
    const raw = await readFile(filePath, 'utf8');
    const parts = extractParts(raw);
    if (!parts) continue;

    const titleRaw = getField(parts.frontmatter, 'title') || file.name.replace(/\.md$/i, '').replace(/-/g, ' ');
    const topic = stripLevelTag(titleRaw);
    const level = normalizeLevel(parts.frontmatter, file.name, titleRaw);
    const category = (getField(parts.frontmatter, 'category') || 'writing').toLowerCase();
    const exam = parseExam(parts.frontmatter);
    const examText = exam.join(' and ');

    const newBody = buildBody(category, topic, level, examText);
    const next = `${parts.head}${parts.frontmatter}${parts.sep}${newBody}\n`;

    if (next !== raw) {
      await writeFile(filePath, next, 'utf8');
      updated += 1;
    }
  }

  console.log(`Aligned lesson bodies to title/topic: ${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
