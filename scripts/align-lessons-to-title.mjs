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

function escapeYaml(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function renderStringArrayField(key, items) {
  return `${key}: [${items.map((item) => `"${escapeYaml(item)}"`).join(', ')}]`;
}

function renderQuizBlock(quiz) {
  if (!Array.isArray(quiz) || quiz.length === 0) {
    return 'quiz: []';
  }

  const lines = ['quiz:'];
  for (const item of quiz) {
    lines.push(`  - prompt: "${escapeYaml(item.prompt)}"`);
    lines.push('    options:');
    for (const option of item.options) {
      lines.push(`      - "${escapeYaml(option)}"`);
    }
    lines.push(`    correctIndex: ${Math.max(0, Number(item.correctIndex) || 0)}`);
    lines.push(`    explanation: "${escapeYaml(item.explanation || '')}"`);
  }

  return lines.join('\n');
}

function replaceFrontmatterBlock(frontmatter, key, replacement) {
  const lines = frontmatter.split(/\r?\n/);
  const next = [];
  let index = 0;
  let replaced = false;

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*):/);

    if (!match) {
      next.push(line);
      index += 1;
      continue;
    }

    const currentKey = match[1];
    if (currentKey !== key) {
      next.push(line);
      index += 1;
      continue;
    }

    if (!replaced) {
      next.push(...replacement.split('\n'));
      replaced = true;
    }

    index += 1;
    while (index < lines.length && (/^\s+/.test(lines[index]) || lines[index].trim() === '')) {
      index += 1;
    }
  }

  if (!replaced) {
    next.push(replacement);
  }

  return next.join('\n');
}

function updateLessonFrontmatter(frontmatter, metadata) {
  let next = frontmatter;
  next = replaceFrontmatterBlock(next, 'excerpt', `excerpt: "${escapeYaml(metadata.excerpt)}"`);
  next = replaceFrontmatterBlock(next, 'heroTip', `heroTip: "${escapeYaml(metadata.heroTip)}"`);
  next = replaceFrontmatterBlock(next, 'visualAids', renderStringArrayField('visualAids', metadata.visualAids));
  next = replaceFrontmatterBlock(next, 'quiz', renderQuizBlock(metadata.quiz));
  return next;
}

function detectTopicFamily(category, topic) {
  const t = topic.toLowerCase();

  if (category === 'grammar') {
    return detectGrammarLessonKind(topic);
  }

  if (category === 'vocabulary') {
    if (/(academic verbs|academic discussion)/.test(t)) return 'academic';
    if (/(formal|letter writing)/.test(t)) return 'formal-register';
    if (/(opinion|argument|reasons)/.test(t)) return 'opinion';
    if (/(collocation|make and do|common phrases)/.test(t)) return 'collocations';
    if (/(linking|transition|connective|addition|contrast|cause and effect)/.test(t)) return 'linking';
    if (/(confused|confusing)/.test(t)) return 'confusing-words';
    if (/phrasal verbs?/.test(t)) return 'phrasal-verbs';
    if (/prepositions?/.test(t)) return 'prepositions';
    if (/(quantifiers?|amounts?)/.test(t)) return 'quantifiers';
    return 'topic-vocabulary';
  }

  if (category === 'writing') {
    if (/task 2: opinion/.test(t)) return 'opinion-essay';
    if (/task 2: discussion/.test(t)) return 'discussion-essay';
    if (/task 2: advantage\/disadvantage/.test(t)) return 'advantages-disadvantages';
    if (/task 1: maps/.test(t)) return 'task1-maps';
    if (/task 1: process/.test(t)) return 'task1-process';
    if (/task 1: email/.test(t)) return 'email';
    if (/task 2: survey/.test(t)) return 'survey';
    if (/introduction/.test(t)) return 'introduction';
    if (/body paragraphs/.test(t)) return 'body-paragraphs';
    if (/conclusion/.test(t)) return 'conclusion';
    if (/formal vs informal/.test(t)) return 'register';
    if (/active voice/.test(t)) return 'active-voice';
    if (/avoiding repetition/.test(t)) return 'avoid-repetition';
    if (/hedging/.test(t)) return 'hedging';
    if (/comma usage/.test(t)) return 'comma-usage';
    if (/organize essay arguments/.test(t)) return 'argument-organization';
    return 'general-writing';
  }

  if (category === 'speaking') {
    if (/asking for clarification/.test(t)) return 'clarification';
    if (/confidence/.test(t)) return 'confidence';
    if (/fluency|fillers|linking phrases/.test(t)) return 'fluency';
    if (/part 1: introducing yourself|part 1: answer techniques/.test(t)) return 'part1';
    if (/part 2: cue card|part 2: giving details/.test(t)) return 'part2';
    if (/part 3: follow-up/.test(t)) return 'part3';
    if (/task 1: describe an experience/.test(t)) return 'experience';
    if (/task 2: give your opinion/.test(t)) return 'speaking-opinion';
    if (/task 3: interview scenario/.test(t)) return 'interview';
    if (/pronunciation: connected speech|pronunciation: stress and intonation/.test(t)) return 'pronunciation';
    if (/paraphrasing and rephrasing/.test(t)) return 'paraphrasing';
    if (/topic management/.test(t)) return 'topic-management';
    return 'general-speaking';
  }

  if (category === 'listening') {
    if (/note-taking/.test(t)) return 'note-taking';
    if (/predict keywords/.test(t)) return 'predicting';
    return 'recovery';
  }

  if (category === 'reading') {
    if (/time management/.test(t)) return 'time-management';
    return 'proof-reading';
  }

  return 'general';
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
  const wordFormationMatch = topic.match(/word formation:\s*([A-Za-z][A-Za-z\s-]*)/i);
  if (wordFormationMatch) return wordFormationMatch[1].trim();
  if (/noun formation/i.test(topic)) return 'noun formation';
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
    const family = detectTopicFamily('vocabulary', topic);

    if (family === 'academic') {
      return {
        definition: `${topic} teaches verbs that help you explain evidence, interpret data, and justify claims more precisely.`,
        use: `Use this vocabulary when you need to describe what evidence shows or what a writer is doing, instead of relying on vague verbs like say or do.`,
        conditions: [
          'Choose the verb from the job you need: indicate, evaluate, justify, or interpret.',
          'Follow the verb with real evidence or a clear idea.',
          'Use the word that fits the meaning, not the word that only sounds more advanced.',
        ],
        examples: [
          'The chart indicates that bus use rose after the route change.',
          'The writer evaluates both the short-term cost and the long-term benefit.',
        ],
      };
    }

    if (family === 'formal-register') {
      return {
        definition: `${topic} focuses on polite, controlled language for emails, letters, and formal writing tasks.`,
        use: `Use this vocabulary when the task expects professional or respectful communication rather than casual spoken wording.`,
        conditions: [
          'Prefer polite request frames over direct demands.',
          'Use clear purpose phrases such as regarding or I am writing to.',
          'Keep the tone professional without adding unnecessary long words.',
        ],
        examples: [
          'I am writing regarding the delay in my order.',
          'I would appreciate a prompt response to this issue.',
        ],
      };
    }

    if (family === 'opinion') {
      return {
        definition: `${topic} helps you state a position, compare sides, and explain benefits and drawbacks clearly.`,
        use: `Use this vocabulary when you need to take a clear position and support it with reasons instead of repeating I think in every sentence.`,
        conditions: [
          'State the opinion directly, then give the reason.',
          'Use balanced words such as benefit, drawback, and outweigh.',
          'Avoid dramatic wording if the evidence only supports a moderate claim.',
        ],
        examples: [
          'From my perspective, the main benefit is shorter commuting time.',
          'In the long term, the advantages outweigh the initial cost.',
        ],
      };
    }

    if (family === 'collocations') {
      return {
        definition: `${topic} teaches natural word partnerships such as make progress and take responsibility.`,
        use: `Use these phrases to sound natural and efficient. English often prefers one fixed word partnership, even when other combinations seem logical.`,
        conditions: [
          'Study the whole phrase, not only the head word.',
          'Check whether English uses make, do, take, or another partner.',
          'Reuse the collocation in a complete sentence soon after learning it.',
        ],
        examples: [
          'Students make progress when they review consistently.',
          'Teams take responsibility for checking the final draft.',
        ],
      };
    }

    if (family === 'linking') {
      return {
        definition: `${topic} teaches linking words and transition phrases that show addition, contrast, example, and result.`,
        use: `Use this vocabulary when you want to guide the reader through a paragraph or spoken answer. A good linker matches the real relationship between the ideas.`,
        conditions: [
          'Choose the linker from the real logic: addition, contrast, example, or result.',
          'Use only the linkers you need; too many make the paragraph heavy.',
          'Check punctuation because some transitions connect full clauses and some do not.',
        ],
        examples: [
          'However, the cheaper option may take longer in heavy traffic.',
          'As a result, more students arrived on time for class.',
        ],
      };
    }

    if (family === 'confusing-words') {
      return {
        definition: `${topic} focuses on similar-looking or similar-sounding words that do different jobs in the sentence.`,
        use: `Use this lesson to separate close meanings and part-of-speech differences before they become repeated mistakes in writing and speaking.`,
        conditions: [
          'Check whether the sentence needs a noun, verb, adjective, or adverb.',
          'Notice the meaning difference before you choose the word.',
          'Write one sentence for each member of the pair so the contrast becomes clear.',
        ],
        examples: [
          'The new rule had a positive effect on attendance.',
          'Rising fuel prices affect both workers and students.',
        ],
      };
    }

    if (family === 'phrasal-verbs') {
      return {
        definition: `${topic} teaches verb + particle combinations that are common in everyday English and must be learned as full phrases.`,
        use: `Use phrasal verbs when they are natural for the topic and level. They are especially useful in speaking, but they still need accurate word order.`,
        conditions: [
          'Learn the verb and particle as one unit.',
          'Check whether the object can go between the verb and particle.',
          'Use the phrasal verb only if it sounds natural in the task and register.',
        ],
        examples: [
          'The speaker brought up a problem with the timetable.',
          'Please look up the station name before you leave.',
        ],
      };
    }

    if (family === 'prepositions') {
      return {
        definition: `${topic} is best learned in chunks such as interested in, depend on, and on time rather than as single words.`,
        use: `Use these phrases when a verb, adjective, or time expression needs a fixed partner.`,
        conditions: [
          'Study the full chunk, not only the preposition.',
          'Notice whether the phrase shows time, place, direction, or a fixed pattern.',
          'Check for extra prepositions after verbs that do not need them.',
        ],
        examples: [
          'She is responsible for the final booking.',
          'We arrived at the station on time.',
        ],
      };
    }

    if (family === 'quantifiers') {
      return {
        definition: `${topic} helps you talk about amount and number more precisely by matching the word to a countable or uncountable noun.`,
        use: `Use these words when you need to describe quantity accurately in speaking and writing.`,
        conditions: [
          'Match the quantifier to a countable or uncountable noun.',
          'Notice the difference between a few and few, or a little and little.',
          'Use amount words that fit the message instead of guessing from translation.',
        ],
        examples: [
          'There are many reasons to book early in summer.',
          'We have very little time left before the shop closes.',
        ],
      };
    }

    if (/education|school|student|study/.test(t)) {
      return {
        definition: `${topic} teaches the words learners need to talk about study, assessment, support, and achievement more clearly.`,
        use: `Use this vocabulary when describing how students learn, how schools measure progress, and what support improves outcomes.`,
        conditions: [
          'Learn each topic word with one practical school-based example.',
          'Notice which nouns and verbs often appear together, such as improve attendance or support learning outcomes.',
          'Use only the words that fit the exact school context you are describing.',
        ],
        examples: [
          'Regular assessment helped teachers identify gaps in reading.',
          'Targeted instructional support improved student attendance.',
        ],
      };
    }

    if (/health|medical/.test(t)) {
      return {
        definition: `${topic} teaches useful words for prevention, treatment, symptoms, and access so you can describe health topics more precisely.`,
        use: `Use this vocabulary when discussing public health, personal wellbeing, and medical services.`,
        conditions: [
          'Choose health words that match the stage: prevention, screening, treatment, or outcome.',
          'Keep the wording clear enough for a general reader or listener.',
          'Learn the term with a natural example sentence, not as an isolated list item.',
        ],
        examples: [
          'Preventive care can reduce long-term treatment costs.',
          'Better treatment access improves health outcomes in rural areas.',
        ],
      };
    }

    if (/environment|ecology|climate/.test(t)) {
      return {
        definition: `${topic} teaches the words you need to describe pollution, sustainability, conservation, and energy choices clearly.`,
        use: `Use this vocabulary when discussing environmental causes, effects, and solutions in writing and speaking.`,
        conditions: [
          'Choose words that match the exact issue, such as emissions, air quality, or renewable energy.',
          'Pair the topic word with a realistic cause, effect, or solution sentence.',
          'Avoid broad words like problem when a more exact environmental term is available.',
        ],
        examples: [
          'Lower vehicle emissions improved air quality near the school.',
          'Investment in renewable energy supports long-term sustainability.',
        ],
      };
    }

    if (/technology|digital|online/.test(t)) {
      return {
        definition: `${topic} teaches useful words for systems, tools, privacy, access, and digital skills so you can talk about technology more accurately.`,
        use: `Use this vocabulary when describing online services, digital tools, remote work, and user experience.`,
        conditions: [
          'Link each term to a real use case such as study, work, or customer support.',
          'Check whether the word describes a tool, an action, or a problem.',
          'Use simple sentence frames so the technology word stays clear.',
        ],
        examples: [
          'Digital literacy helps workers adapt to new software quickly.',
          'The platform improved remote collaboration across three offices.',
        ],
      };
    }

    if (/business|employment|career|work/.test(t)) {
      return {
        definition: `${topic} teaches useful words for training, hiring, productivity, and workplace development.`,
        use: `Use this vocabulary when describing jobs, companies, staff development, and performance.`,
        conditions: [
          'Choose words that match the stage: hiring, training, output, or promotion.',
          'Pair the word with a realistic workplace action or result.',
          'Keep the tone clear and practical instead of sounding like a slogan.',
        ],
        examples: [
          'Regular training programs improved staff productivity.',
          'The company expanded recruitment after reducing turnover.',
        ],
      };
    }

    if (/travel|tourism|food|shopping|weather|season|social|society|policy|politic|community|communication|personality/.test(t)) {
      return {
        definition: `${topic} teaches topic words and useful chunks that help you describe a real everyday subject more clearly.`,
        use: `Use this vocabulary when you need topic-appropriate wording instead of vague general words in speaking or writing.`,
        conditions: [
          'Choose the word from the exact meaning you need.',
          'Learn each word with a collocation or model sentence.',
          'Replace vague language only when the new word is accurate and natural.',
        ],
        examples: [
          `A more precise word usually makes a sentence about ${topic} easier to trust.`,
          'Topic vocabulary becomes useful when you can use it in a real sentence quickly.',
        ],
      };
    }

    return {
      definition: `${topic} teaches topic words and useful chunks that help you talk about a real subject area more clearly and naturally.`,
      use: `Use this vocabulary when you need topic-appropriate wording in IELTS or CELPIP writing and speaking instead of vague high-frequency words.`,
      conditions: [
        'Choose the word from the exact meaning you need.',
        'Learn each word with a collocation or model sentence.',
        'Replace vague language only when the new word is accurate and natural.',
      ],
      examples: [
        'A more precise word usually makes the sentence easier to trust.',
        'Topic vocabulary becomes useful when you can use it in a real sentence quickly.',
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

  if (/weather|season|forecast|rain|snow/.test(t)) {
    return {
      domain: 'daily life, climate, and seasonal planning',
      prompt: 'Should cities invest more in weather-prepared public services?',
      claim: 'Reliable weather planning helps communities prepare for disruption before it becomes a crisis.',
      detail: 'One city expanded snow-route alerts and reduced school transport delays during winter storms.',
      consequence: 'Clear forecasts and practical preparation improve safety and routine decision-making.',
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

  if (/travel|tourism|airport|hotel|trip|journey/.test(t)) {
    return {
      domain: 'travel planning and tourism services',
      prompt: 'Should cities invest more in transport and visitor information for tourists?',
      claim: 'Clear travel systems make a destination easier to use for both visitors and residents.',
      detail: 'After adding multilingual signs and airport bus links, one region reported fewer visitor complaints.',
      consequence: 'Better information reduces confusion and improves the travel experience.',
    };
  }

  if (/food|shopping|restaurant|market|store|grocery/.test(t)) {
    return {
      domain: 'food choices, retail, and daily routines',
      prompt: 'Should neighborhoods support more local food markets instead of large chain stores?',
      claim: 'Local markets can improve access to fresh food and strengthen small businesses.',
      detail: 'A weekend market program brought more customers to independent shops in one district.',
      consequence: 'Residents gain more choice, and local spending stays in the community.',
    };
  }

  if (/social|society|policy|politic|community/.test(t)) {
    return {
      domain: 'social policy and community life',
      prompt: 'Should governments invest more in local social support services?',
      claim: 'Practical social support can reduce long-term pressure on schools, health services, and policing.',
      detail: 'One district expanded youth support programs and reported lower dropout rates the next year.',
      consequence: 'Communities become safer and more stable when early support is available.',
    };
  }

  if (/communication|personality|emotion/.test(t)) {
    return {
      domain: 'communication, relationships, and daily interaction',
      prompt: 'Should schools teach communication skills as part of the core curriculum?',
      claim: 'Clear communication helps students collaborate, solve problems, and avoid unnecessary conflict.',
      detail: 'One program added short speaking workshops and saw more confident classroom participation.',
      consequence: 'Students explain ideas more clearly in both daily life and exam settings.',
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

  if (t.includes('article') || /a,\s*an,\s*and\s*the/.test(t) || /a,\s*an,\s*the/.test(t)) {
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

function renderNumberedSteps(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function renderBulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function renderErrorCards(errors) {
  return errors
    .map(
      (error) => `- Error: ${error.error}.
- Real-world weak: *${error.weak}*
- Real-world better: *${error.strong}*
- Fix: ${error.fix}.`
    )
    .join('\n\n');
}

function stripMarkdownMarkers(text = '') {
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(text = '') {
  return escapeHtml(text);
}

function hashString(input = '') {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle(items, seedText) {
  const arr = [...items];
  let seed = hashString(seedText);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.length > 1 && arr.every((item, index) => item === items[index])) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

function chunkSentence(text) {
  const clean = stripMarkdownMarkers(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const words = clean.split(' ');
  const chunks = [];
  let index = 0;

  while (index < words.length) {
    const remaining = words.length - index;
    let size = 3;
    if (remaining <= 4) size = 2;
    else if (remaining % 3 === 1) size = 2;
    chunks.push(words.slice(index, index + size).join(' '));
    index += size;
  }

  return chunks;
}

function renderHtmlList(items, className = '') {
  const classes = className ? ` class="${className}"` : '';
  return `<ul${classes}>${items
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(stripMarkdownMarkers(item))}</li>`)
    .join('')}</ul>`;
}

function renderTaskFeedbackAttrs(task) {
  const attrs = [];
  if (task.correctFeedback) {
    attrs.push(`data-correct-feedback="${escapeAttr(stripMarkdownMarkers(task.correctFeedback))}"`);
  }
  if (task.wrongFeedback) {
    attrs.push(`data-wrong-feedback="${escapeAttr(stripMarkdownMarkers(task.wrongFeedback))}"`);
  }
  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

function renderTeachingSection({ lead, definition, use, levelNote, useBullets, modelPatterns, rememberBullets }) {
  const coreParagraphs = [lead, definition, use, levelNote]
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(stripMarkdownMarkers(paragraph))}</p>`)
    .join('\n');

  const sentenceCards = (modelPatterns || [])
    .filter(Boolean)
    .map(
      (sentence) => `<div class="lesson-pattern-sentence">${escapeHtml(stripMarkdownMarkers(sentence))}</div>`
    )
    .join('\n');

  return `## Topic Explanation and Use
<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Core idea</p>
    ${coreParagraphs}
  </section>
  <section class="lesson-panel lesson-panel-when">
    <p class="lesson-panel-label">Use it here</p>
    ${renderHtmlList(useBullets)}
  </section>
  <section class="lesson-panel lesson-panel-pattern">
    <p class="lesson-panel-label">Watch it work</p>
    <div class="lesson-pattern-stack">${sentenceCards}</div>
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Remember this</p>
    ${renderHtmlList(rememberBullets)}
  </section>
</div>`;
}

function renderExampleCardsSection(title, examples) {
  const cards = (examples || [])
    .map(
      (example, index) => `<article class="lesson-example-card">
  <p class="lesson-card-label">Example ${index + 1}</p>
  <p class="lesson-line lesson-line-weak"><span>Too weak</span>${escapeHtml(stripMarkdownMarkers(example.weak))}</p>
  <p class="lesson-line lesson-line-strong"><span>Better</span>${escapeHtml(stripMarkdownMarkers(example.strong))}</p>
  <p class="lesson-card-note">${escapeHtml(stripMarkdownMarkers(example.why))}</p>
</article>`
    )
    .join('\n');

  return `## ${title}
<div class="lesson-example-grid">
${cards}
</div>`;
}

function renderVisibleErrorSection(title, errors) {
  const cards = (errors || [])
    .map(
      (error, index) => `<article class="lesson-error-card">
  <p class="lesson-card-label">Common problem ${index + 1}</p>
  <h3>${escapeHtml(stripMarkdownMarkers(error.error))}</h3>
  <p class="lesson-line lesson-line-weak"><span>Weak</span>${escapeHtml(stripMarkdownMarkers(error.weak))}</p>
  <p class="lesson-line lesson-line-strong"><span>Strong</span>${escapeHtml(stripMarkdownMarkers(error.strong))}</p>
  <p class="lesson-fix-line"><strong>Fix:</strong> ${escapeHtml(stripMarkdownMarkers(error.fix))}</p>
</article>`
    )
    .join('\n');

  return `## ${title}
<div class="lesson-error-grid">
${cards}
</div>`;
}

function renderChoiceTask(task, index) {
  const options = task.options
    .map(
      (option, optionIndex) => `<button type="button" class="practice-choice" data-choice-index="${optionIndex}">
  ${escapeHtml(stripMarkdownMarkers(option))}
</button>`
    )
    .join('\n');

  return `<article class="practice-task" data-task-type="choice" data-task-answer="${task.correctIndex}" data-task-id="${index}"${renderTaskFeedbackAttrs(task)}>
  <p class="practice-task-label">${index + 1}. ${escapeHtml(task.label || 'Quick check')}</p>
  <h3>${escapeHtml(stripMarkdownMarkers(task.prompt))}</h3>
  <div class="practice-choice-grid">
${options}
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>`;
}

function renderOrderTask(task, index) {
  const answer = task.answer.map((chunk) => stripMarkdownMarkers(chunk));
  const shuffled = stableShuffle(answer, `${task.prompt}-${answer.join('|')}`);
  const bank = shuffled
    .map(
      (chunk, chunkIndex) => `<button type="button" class="practice-chip" data-chip-value="${escapeAttr(chunk)}" data-chip-origin="bank-${index}" data-chip-id="${index}-${chunkIndex}">
  ${escapeHtml(chunk)}
</button>`
    )
    .join('\n');

  return `<article class="practice-task" data-task-type="order" data-task-answer="${escapeAttr(answer.join('||'))}" data-task-id="${index}"${renderTaskFeedbackAttrs(task)}>
  <p class="practice-task-label">${index + 1}. ${escapeHtml(task.label || 'Build it')}</p>
  <h3>${escapeHtml(stripMarkdownMarkers(task.prompt))}</h3>
  <p class="practice-task-note">${escapeHtml(stripMarkdownMarkers(task.note || 'Put the chunks in the natural order.'))}</p>
  <div class="practice-chip-bank" data-order-bank>
${bank}
  </div>
  <div class="practice-chip-answer" data-order-answer></div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
    <button type="button" class="practice-clear-btn" data-task-clear>Clear</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>`;
}

function renderTypingTask(task, index) {
  const answers = (task.answers || []).map((answer) => stripMarkdownMarkers(answer)).filter(Boolean);
  return `<article class="practice-task" data-task-type="typing" data-task-answers="${escapeAttr(answers.join('||'))}" data-task-id="${index}"${renderTaskFeedbackAttrs(task)}>
  <p class="practice-task-label">${index + 1}. ${escapeHtml(task.label || 'Type the fix')}</p>
  <h3>${escapeHtml(stripMarkdownMarkers(task.prompt))}</h3>
  <p class="practice-source-line"><span>Fix this:</span> ${escapeHtml(stripMarkdownMarkers(task.source))}</p>
  <div class="practice-input-row">
    <input type="text" class="practice-input" data-typing-input placeholder="${escapeAttr(task.placeholder || 'Type your answer here')}" />
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>`;
}

function renderSortTask(task, index) {
  const rows = (task.items || [])
    .map(
      (item, rowIndex) => `<div class="practice-sort-row" data-sort-target="${escapeAttr(item.target)}" data-sort-row="${rowIndex}">
  <p>${escapeHtml(stripMarkdownMarkers(item.text))}</p>
  <div class="practice-sort-actions">
    <button type="button" class="practice-sort-btn" data-sort-choice="works">${escapeHtml(task.leftLabel || 'Works')}</button>
    <button type="button" class="practice-sort-btn" data-sort-choice="fix">${escapeHtml(task.rightLabel || 'Needs fixing')}</button>
  </div>
</div>`
    )
    .join('\n');

  return `<article class="practice-task" data-task-type="sort" data-task-id="${index}"${renderTaskFeedbackAttrs(task)}>
  <p class="practice-task-label">${index + 1}. ${escapeHtml(task.label || 'Final sort')}</p>
  <h3>${escapeHtml(stripMarkdownMarkers(task.prompt))}</h3>
  <div class="practice-sort-list">
${rows}
  </div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>`;
}

function renderPracticeTask(task, index) {
  if (task.type === 'order') return renderOrderTask(task, index);
  if (task.type === 'typing') return renderTypingTask(task, index);
  if (task.type === 'sort') return renderSortTask(task, index);
  return renderChoiceTask(task, index);
}

function renderPracticeLab({ intro, coach, tasks }) {
  const cards = tasks.map((task, index) => renderPracticeTask(task, index)).join('\n');
  return `## Interactive Practice Lab
<div class="practice-lab" data-practice-lab>
  <div class="practice-lab-head">
    <div>
      <h3>Practice</h3>
      <p class="practice-lab-intro">${escapeHtml(stripMarkdownMarkers(intro))}</p>
    </div>
    <div class="practice-lab-status">
      <p class="practice-lab-score" data-practice-score>Score: 0/${tasks.length}</p>
      <button type="button" class="practice-reset-btn" data-practice-reset>Reset</button>
    </div>
  </div>
  <p class="practice-lab-coach">${escapeHtml(stripMarkdownMarkers(coach))}</p>
  <div class="practice-lab-grid">
${cards}
  </div>
</div>`;
}

function renderLessonSupportSection(bestWhen) {
  return `## Get Feedback
<div class="lesson-support-callout">
  <div class="lesson-support-hero">
    <p class="lesson-support-label">Personalized score feedback</p>
    <h3>Get clear next-step advice.</h3>
    <p class="lesson-support-copy">Choose the support that matches your study goal. You get direct correction, clear scoring language, and a simple next step.</p>
  </div>
  <div class="lesson-support-grid">
    <a class="lesson-support-card lesson-support-card-essay" href="/essay-correction">
      <span class="lesson-support-icon" aria-hidden="true">A+</span>
      <strong>Essay Correction</strong>
      <span>Detailed comments on one draft with band-style scoring.</span>
    </a>
    <a class="lesson-support-card lesson-support-card-tutoring" href="/tutoring">
      <span class="lesson-support-icon" aria-hidden="true">1:1</span>
      <strong>1-on-1 Tutoring</strong>
      <span>Live help when you want guided practice and fast correction.</span>
    </a>
    <a class="lesson-support-card lesson-support-card-ai" href="/celpip/writing/ai-feedback">
      <span class="lesson-support-icon" aria-hidden="true">AI</span>
      <strong>AI Writing Feedback</strong>
      <span>Quick checks when you want to test ideas before a full review.</span>
    </a>
    <a class="lesson-support-card lesson-support-card-webinar" href="/webinar">
      <span class="lesson-support-icon" aria-hidden="true">Live</span>
      <strong>Weekly Webinar</strong>
      <span>Join a guided session and learn with real exam-style examples.</span>
    </a>
  </div>
  <p class="lesson-support-best">${escapeHtml(stripMarkdownMarkers(bestWhen))}</p>
</div>`;
}

function buildGrammarPracticeLab({ topic, focusTerm, pack }) {
  return renderPracticeLab({
    intro: `First notice the right form. Then build it yourself. Then fix it in a full sentence.`,
    coach: `Read for meaning first. If the meaning changes, the grammar usually has to change too.`,
    tasks: [
      {
        type: 'choice',
        label: 'Quick pick',
        prompt: `Choose the stronger sentence for ${focusTerm}.`,
        options: [pack.practice1[0], pack.answerHints[0]],
        correctIndex: 1,
        correctFeedback: `Correct. The better sentence keeps the intended meaning and the ${focusTerm} form fits naturally.`,
        wrongFeedback: `Not yet. Check what the sentence really means before you choose the form.`,
      },
      {
        type: 'order',
        label: 'Build it',
        prompt: `Put this ${focusTerm} sentence in the correct order.`,
        note: 'Tap a chunk to move it down. Tap it again to send it back.',
        answer: chunkSentence(pack.answerHints[1]),
        correctFeedback: `Correct. The sentence now reads in a natural English order.`,
        wrongFeedback: `Not yet. Build the sentence around the main subject and verb first.`,
      },
      {
        type: 'typing',
        label: 'Type the fix',
        prompt: `Rewrite the sentence so ${focusTerm} is correct.`,
        source: pack.practice1[2],
        answers: [pack.answerHints[2]],
        correctFeedback: `Correct. You repaired the sentence without changing the message.`,
        wrongFeedback: `Not yet. Check the target form, then type the full corrected sentence.`,
      },
      {
        type: 'sort',
        label: 'Final sort',
        prompt: 'Mark each sentence as correct or needing a fix.',
        leftLabel: 'Works',
        rightLabel: 'Needs fixing',
        items: [
          { text: pack.answerHints[0], target: 'works' },
          { text: pack.practice1[0], target: 'fix' },
          { text: pack.answerHints[1], target: 'works' },
          { text: pack.practice1[1], target: 'fix' },
        ],
        correctFeedback: `Correct. You can now see which sentences already work and which ones still need repair.`,
        wrongFeedback: `Some choices are off. Compare the meaning and grammar in each pair again.`,
      },
    ],
  });
}

function grammarLessonLead(topic, family, focusTerm) {
  const leadByFamily = {
    articles: 'Articles look small, but they change what the noun means to the reader.',
    'adjective-order': 'Adjectives can all be correct on their own, but they still need a natural order.',
    comparison: 'Comparison language should sound simple and exact, not heavy or doubled.',
    'noun-clauses': 'This lesson shows how to turn a full idea into one clause that works like a noun.',
    'verb-patterns': 'After some verbs, only one grammar pattern sounds natural.',
    'word-formation-prefixes': 'Prefixes sit at the front of a word and change the meaning quickly.',
    'word-formation-suffixes': 'Suffixes often change the job of a word, so you need to watch the sentence slot carefully.',
    'noun-formation': 'Noun formation helps you name actions, results, and ideas more clearly.',
    'word-formation': 'Word formation works best when grammar and meaning are checked together.',
    'phrasal-verbs': 'Phrasal verbs need to be learned as whole units, not guessed from the base verb alone.',
    'noun-phrases': 'A good noun phrase adds detail without hiding the main noun.',
    agreement: 'Agreement problems usually happen because the real subject is harder to see than it looks.',
    adverbs: 'Adverbs add useful detail, but the wrong form or position can make the sentence sound odd.',
    correlatives: 'These paired forms only work well when both sides match.',
    'like-as': 'Like and as look similar, but they do different grammar jobs.',
    'result-structures': 'These forms help you show enough, too much, or a clear result.',
    imperatives: 'Instructions work best when they are short, direct, and easy to follow.',
    connectors: 'Connectors should make the logic easier to follow, not harder.',
    emphasis: 'Emphasis is useful only when the stronger form also stays clear.',
    'clause-building': 'A longer sentence is only better if the reader can still follow it easily.',
    'register-precision': 'This lesson is about sounding clear, measured, and believable.',
    conditionals: 'Conditionals become easier when you match the time and the result carefully.',
    passive: 'The passive is mainly a focus choice: who matters more, the doer or the result.',
    prepositions: 'Prepositions are small, but they carry exact meaning and often come in fixed patterns.',
    'relative-clauses': 'Relative clauses help you join ideas smoothly without repeating the noun.',
    'questions-word-order': 'Question forms depend on word order, not only on adding a question word.',
    pronouns: 'Pronouns save repetition, but only when the reference stays clear.',
    quantifiers: 'Quantifiers become easier when you check countable and uncountable meaning first.',
    punctuation: 'Punctuation should guide the reader through the sentence, not decorate it.',
    reporting: 'Reporting grammar is about repeating an idea accurately in a new sentence.',
    modals: 'Modal verbs are really about meaning strength: advice, possibility, ability, or obligation.',
    auxiliaries: 'Helper verbs are small, but they control the grammar of the whole clause.',
    tenses: 'Tense choice becomes easier when you decide the timeline before the verb form.',
    'grammar-general': `This lesson shows how to use ${focusTerm} in clear, natural English.`,
  };

  return leadByFamily[family] || `This lesson shows how to use ${focusTerm} in clear, natural English.`;
}

function buildVocabularyPracticeLab({ topic, wordBank, support, frames, pack }) {
  const firstWord = stripMarkdownMarkers((wordBank[0] || '').split(':')[0] || topic);
  const firstMeaning = stripMarkdownMarkers(((wordBank[0] || '').split(':').slice(1).join(':')) || 'the main lesson word');
  const firstSupport = stripMarkdownMarkers(support[0] || 'use natural vocabulary');
  const missingWord = firstSupport.split(' ').pop() || firstWord;
  const orderSentence = `${firstWord.charAt(0).toUpperCase()}${firstWord.slice(1)} works best when the meaning is clear in the sentence.`;
  const firstChoice = pack.choiceItems[0];
  const choiceOptions = firstChoice?.options || [firstWord, firstMeaning, firstSupport];
  const foundAnswerIndex = choiceOptions.findIndex((option) => option === firstChoice?.answer);
  const correctIndex = foundAnswerIndex >= 0 ? foundAnswerIndex : 0;

  return renderPracticeLab({
    intro: `Start with meaning. Then move to collocations and sentence control for ${topic}.`,
    coach: 'Use words that sound natural together. Precision is more important than difficulty.',
    tasks: [
      {
        type: 'choice',
        label: 'Quick pick',
        prompt: firstChoice?.prompt || `Choose the best word choice for ${topic}.`,
        options: choiceOptions,
        correctIndex,
      },
      {
        type: 'order',
        label: 'Build it',
        prompt: 'Put the sentence in a natural order.',
        answer: chunkSentence(orderSentence),
      },
      {
        type: 'typing',
        label: 'Type the missing word',
        prompt: `Complete the useful chunk: ${firstSupport.replace(new RegExp(`${missingWord}$`), '_____')}`,
        source: `${firstWord}: ${firstMeaning}`,
        answers: [missingWord],
        placeholder: 'Type one word',
      },
    ],
  });
}

function buildSkillPracticeLab({
  topic,
  intro,
  coach,
  strongSentence,
  comparisonSentence,
  steps,
  negatives,
  weakSentence = 'Keep the idea vague and hope the reader understands.',
  weakComparison = 'This point is important in many ways and that is all.',
}) {
  const positiveSteps = (steps || []).slice(0, 4);
  const sortItems = [
    ...positiveSteps.slice(0, 2).map((step) => ({ text: step, target: 'works' })),
    ...(negatives || []).slice(0, 2).map((step) => ({ text: step, target: 'fix' })),
  ];

  return renderPracticeLab({
    intro,
    coach,
    tasks: [
      {
        type: 'choice',
        label: 'Quick pick',
        prompt: `Choose the stronger move for ${topic}.`,
        options: [weakSentence, strongSentence],
        correctIndex: 1,
      },
      {
        type: 'order',
        label: 'Build the flow',
        prompt: 'Put these moves in a helpful order.',
        answer: positiveSteps,
      },
      {
        type: 'sort',
        label: 'Final sort',
        prompt: 'Sort these habits into helpful or not helpful.',
        leftLabel: 'Helpful',
        rightLabel: 'Not helpful',
        items: sortItems,
      },
      {
        type: 'choice',
        label: 'Last check',
        prompt: 'Choose the sentence that sounds more controlled.',
        options: [weakComparison, comparisonSentence],
        correctIndex: 1,
      },
    ],
  });
}

function buildWordBank(topic) {
  const t = topic.toLowerCase();

  if (/(academic verbs|academic discussion)/.test(t)) {
    return [
      'analyze: examine information carefully',
      'indicate: show a result or trend',
      'demonstrate: show clearly with evidence',
      'justify: give reasons or evidence for a claim',
      'evaluate: judge strengths and weaknesses',
      'interpret: explain the meaning of information',
    ];
  }

  if (/(formal|letter writing)/.test(t)) {
    return [
      'I would appreciate: a polite way to request action',
      'I am writing to: a formal opening for purpose',
      'regarding: about a specific issue',
      'resolve: solve a problem formally',
      'further information: extra detail in a formal register',
      'prompt response: a quick reply requested politely',
    ];
  }

  if (/(opinion|reasons|argument)/.test(t)) {
    return [
      'from my perspective: a clear opinion opener',
      'a key reason: a main support point',
      'a major drawback: an important negative point',
      'it is reasonable to argue: a cautious opinion frame',
      'in the long term: a time frame for evaluating impact',
      'outweigh: be more important than the other side',
    ];
  }

  if (/(collocation|make and do|common phrases)/.test(t)) {
    return [
      'make progress: move forward successfully',
      'make a decision: choose between options',
      'do research: study a topic carefully',
      'take responsibility: accept duty for something',
      'meet a deadline: finish on time',
      'reach a conclusion: decide after thinking',
    ];
  }

  if (/(linking|transition|connective|addition|contrast|cause and effect)/.test(t)) {
    return [
      'however: introduces contrast',
      'in addition: adds another point',
      'for example: introduces a specific illustration',
      'as a result: shows consequence',
      'in contrast: highlights a difference',
      'therefore: gives a logical conclusion',
    ];
  }

  if (/(confused|confusing)/.test(t)) {
    return [
      'affect/effect: influence/result',
      'economic/economical: related to the economy/cost-saving',
      'advice/advise: noun/verb pair',
      'sensible/sensitive: practical/easily affected',
      'borrow/lend: receive temporarily/give temporarily',
      'compliment/complement: praise/complete well',
    ];
  }

  if (/phrasal verbs?: communication/.test(t)) {
    return [
      'speak up: talk more loudly or clearly',
      'bring up: introduce a topic',
      'point out: highlight something important',
      'talk over: discuss in detail',
      'get across: communicate successfully',
      'sum up: give the main points briefly',
    ];
  }

  if (/phrasal verbs?: emotions/.test(t)) {
    return [
      'calm down: become less upset',
      'cheer up: become happier',
      'bottle up: hide emotions inside',
      'break down: lose emotional control',
      'open up: speak honestly about feelings',
      'brighten up: become more cheerful',
    ];
  }

  if (/phrasal verbs?: movement/.test(t)) {
    return [
      'set off: begin a journey',
      'get on: enter a bus or train',
      'head back: return to a place',
      'drop off: leave someone or something',
      'run into: meet unexpectedly',
      'pull over: stop a vehicle at the side',
    ];
  }

  if (/phrasal verbs?: work/.test(t)) {
    return [
      'carry out: complete a task or plan',
      'take on: accept work or responsibility',
      'hand in: submit work officially',
      'fall behind: fail to keep up',
      'follow up: continue after the first step',
      'sort out: solve or organize a problem',
    ];
  }

  if (/prepositions?/.test(t)) {
    return [
      'interested in: an adjective + preposition pair',
      'responsible for: used with duties and roles',
      'depend on: used for reliance',
      'apologize for: used after saying sorry',
      'on time: at the planned time',
      'in advance: before something happens',
    ];
  }

  if (/(quantifiers?|amounts?)/.test(t)) {
    return [
      'many: used with countable plural nouns',
      'much: used with uncountable nouns',
      'a few: a small positive number',
      'a little: a small positive amount',
      'plenty of: more than enough',
      'not much: a small amount in negative meaning',
    ];
  }

  if (/education|school|student/.test(t)) {
    return [
      'curriculum: the content students study',
      'assessment: a method of checking learning',
      'attendance: regular presence in class',
      'learning outcome: a measurable study result',
      'instructional support: help that improves learning',
      'dropout rate: the percentage who leave early',
    ];
  }

  if (/environment|ecology|climate/.test(t)) {
    return [
      'emissions: gases released into the air',
      'renewable energy: power from naturally replaced sources',
      'waste management: systems for handling waste',
      'air quality: how clean the air is',
      'conservation: protection of natural resources',
      'sustainability: meeting needs without long-term damage',
    ];
  }

  if (/business|work|employment/.test(t)) {
    return [
      'productivity: useful work completed in a period',
      'workforce: the people available to work',
      'training program: organized instruction for staff',
      'recruitment: the process of hiring staff',
      'workload: the amount of work assigned',
      'promotion: movement to a higher position',
    ];
  }

  if (/health|medical/.test(t)) {
    return [
      'preventive care: treatment that stops problems early',
      'screening: testing for possible illness',
      'treatment access: the ability to receive care',
      'public health campaign: organized health messaging',
      'symptom management: reducing or controlling symptoms',
      'health outcome: the result of treatment or prevention',
    ];
  }

  if (/technology|digital|online/.test(t)) {
    return [
      'automation: using technology to complete tasks',
      'data privacy: protection of personal information',
      'digital literacy: the ability to use digital tools well',
      'remote collaboration: working together online',
      'platform: a digital service or system',
      'user interface: the part of a system people interact with',
    ];
  }

  if (/travel|tourism|airport|hotel/.test(t)) {
    return [
      'itinerary: a travel plan or route',
      'accommodation: a place to stay',
      'departure: the act of leaving',
      'destination: the place you are going to',
      'delayed flight: a flight leaving later than planned',
      'guided tour: a visit led by an expert',
    ];
  }

  if (/food|shopping|restaurant|market|store/.test(t)) {
    return [
      'fresh produce: fruit and vegetables',
      'discount: a lower price than usual',
      'receipt: proof of payment',
      'budget-friendly: affordable in price',
      'ingredient: one item used in cooking',
      'out of stock: unavailable to buy now',
    ];
  }

  if (/weather|season|forecast/.test(t)) {
    return [
      'forecast: a prediction about weather',
      'heatwave: a period of very hot weather',
      'heavy rainfall: a lot of rain in a short time',
      'icy roads: roads covered with ice',
      'mild climate: weather that is not extreme',
      'seasonal change: the shift from one season to another',
    ];
  }

  if (/social|society|policy|politic|community/.test(t)) {
    return [
      'social support: help for people in difficulty',
      'public funding: money from the government',
      'community program: a service for local residents',
      'housing shortage: not enough homes for demand',
      'income gap: a difference in earnings',
      'public awareness: how much people know about an issue',
    ];
  }

  if (/communication/.test(t)) {
    return [
      'clarify: make a point easier to understand',
      'misunderstanding: failure to understand correctly',
      'feedback: comments used for improvement',
      'tone of voice: the manner of speaking',
      'body language: non-verbal communication',
      'active listening: listening carefully and responding thoughtfully',
    ];
  }

  if (/personality/.test(t)) {
    return [
      'reliable: someone others can trust',
      'outgoing: comfortable meeting and talking to people',
      'thoughtful: careful and considerate',
      'stubborn: unwilling to change your mind',
      'self-disciplined: able to control your behavior well',
      'adaptable: able to adjust to change easily',
    ];
  }

  return [
    'key term: an important topic word',
    'common phrase: a word pair used together naturally',
    'precise meaning: exact meaning without vagueness',
    'natural usage: wording that sounds normal in English',
    'example sentence: a model that shows the word in context',
    'register: how formal or informal the language sounds',
  ];
}

function detectGrammarLessonKind(topic) {
  const t = topic.toLowerCase();

  if (/(article|a,\s*an,\s*(and\s*)?the|a an the)/.test(t)) return 'articles';
  if (/adjective order/.test(t)) return 'adjective-order';
  if (/(advanced ways to compare|compare|comparison|comparative|superlative)/.test(t)) return 'comparison';
  if (/(what clauses|noun clauses)/.test(t)) return 'noun-clauses';
  if (/(gerunds and infinitives|gerunds after prepositions|verb \+ gerund|verb \+ to infinitive|verb-to-infinitive|verb-gerund)/.test(t)) return 'verb-patterns';
  if (/(prefix|negative prefix)/.test(t)) return 'word-formation-prefixes';
  if (/suffix/.test(t)) return 'word-formation-suffixes';
  if (/(noun formation|turning verbs into nouns|nominali[sz]ation)/.test(t)) return 'noun-formation';
  if (/(word formation|affix|derivation)/.test(t)) return 'word-formation';
  if (/phrasal verbs?/.test(t)) return 'phrasal-verbs';
  if (/(noun phrase|abstract noun|building longer noun groups)/.test(t)) return 'noun-phrases';
  if (/(agreement of subject and verb|subject[- ]verb agreement|collective nouns)/.test(t)) return 'agreement';
  if (/adverbs?/.test(t)) return 'adverbs';
  if (/(both|either|neither)/.test(t)) return 'correlatives';
  if (/like and as|like vs as/.test(t)) return 'like-as';
  if (/too and enough|too, enough|so\.\.\.that/.test(t)) return 'result-structures';
  if (/imperative/.test(t)) return 'imperatives';
  if (/(conjunctions?|connectors?|linking words|connective words|connecting words)/.test(t)) return 'connectors';
  if (/(cleft|emphasis|fronting|parallelism|moving words)/.test(t)) return 'emphasis';
  if (/(subordinate clauses|subordination|time clauses|participle clauses|combining clauses|complex sentences|clear sentences|academic sentence patterns|clause architecture|connecting ideas with grammar|clear long sentences|complex writing that works|matching patterns in sentences|advanced sentence structure)/.test(t)) return 'clause-building';
  if (/(formal|tone|argument|reformulation|rephrasing|persuad|critical evaluation|opinion clearly|softening claims|accuracy under pressure|advanced mistakes|advanced grammar essential|register shifts|precision|cohesion)/.test(t)) return 'register-precision';
  if (/(conditional|if\b)/.test(t)) return 'conditionals';
  if (/(passive|active voice)/.test(t)) return 'passive';
  if (/(preposition|for and since|for-since|in on at)/.test(t)) return 'prepositions';
  if (/(relative clause|who vs whom|relative pronouns)/.test(t)) return 'relative-clauses';
  if (/(question|word order|tag questions|question tags|question formation|inversion)/.test(t)) return 'questions-word-order';
  if (/(pronoun|demonstrative|possessive|reflexive|subject pronouns|object pronouns|this, that|these, and those|avoiding repetition)/.test(t)) return 'pronouns';
  if (/(quantifier|few|little|much|many|some and any|countable|uncountable|plural forms)/.test(t)) return 'quantifiers';
  if (/(punctuation|comma|semicolon|colon|capitalization|apostrophe)/.test(t)) return 'punctuation';
  if (/(reported speech|direct and indirect speech|reporting what others|reporting verbs|evaluating others' ideas)/.test(t)) return 'reporting';
  if (/(modal|must|have to|should|ought|may|might|can and cannot|can, could|shall and will|used to|would\b)/.test(t)) return 'modals';
  if (/(be:\s*main verb and auxiliary|do:\s*auxiliary verb|have:\s*main verb and auxiliary|be-verb|be verb|have got|there is|there are)/.test(t)) return 'auxiliaries';
  if (/(twelve\s+tenses|12\s+tenses|tense review|tense|future forms?|future with going to|will for quick decisions|will vs going to|perfect vs simple tenses|present perfect|present continuous|present simple|past continuous|past perfect|past simple|future perfect|future perfect continuous|was and were)/.test(t)) return 'tenses';
  return 'grammar-general';
}

function grammarTopicExplanation(topic) {
  const t = topic.toLowerCase();
  const kind = detectGrammarLessonKind(topic);

  if (/(twelve\s+tenses|12\s+tenses|tense\s+review)/.test(t)) {
    return {
      definition: 'English has 12 main tense-aspect combinations: simple, continuous, perfect, and perfect continuous across present, past, and future time. The real skill is not memorizing a chart. The real skill is choosing the form that matches the timeline and the relationship between actions.',
      use: 'Start by asking when the action happens. Then ask what kind of meaning you need: a fact, an action in progress, a finished action connected to another time, or a duration. In exam writing and speaking, tense choice helps the reader follow your timeline without guessing.',
      conditions: [
        'Use time markers such as yesterday, now, since, and by next year to anchor the timeline first.',
        'Use perfect forms when you need to show an earlier action connected to another time point.',
        'Keep tense shifts deliberate. If the timeline has not changed, the verb form usually should not change either.',
      ],
      examples: [
        'Since January, attendance has improved every week.',
        'By next month, the team will have finished the pilot.',
      ],
    };
  }

  switch (kind) {
    case 'articles':
      return {
        definition: 'Articles tell the reader whether a noun is new, known, specific, or general. The main choices are a, an, the, or no article.',
        use: 'Use a/an for one non-specific countable noun. Use the when both writer and reader can identify the noun. Use no article for many general plural and uncountable meanings.',
        conditions: [
          'Choose a or an from the sound, not the spelling.',
          'Use the for shared or already mentioned nouns.',
          'Leave the article out when you are making a general statement about plural or uncountable nouns.',
        ],
        examples: [
          'A student asked a question, and the teacher answered it clearly.',
          'Public transport reduces traffic when the system is reliable.',
        ],
      };
    case 'adjective-order':
      return {
        definition: 'When several adjectives come before one noun, English usually follows a natural order. The most common order is opinion, size, age, shape, color, origin, material, and purpose.',
        use: 'Use adjective order to make descriptions sound natural. Even if every adjective is correct alone, the sentence sounds awkward when the order is random.',
        conditions: [
          'Place opinion adjectives before factual ones when both are present.',
          'Keep color, origin, and material closer to the noun.',
          'Use only the adjectives you really need; too many modifiers make the sentence heavy.',
        ],
        examples: [
          'They rented a beautiful old stone house near the river.',
          'She carried a small black leather bag to the interview.',
        ],
      };
    case 'comparison':
      return {
        definition: 'Comparison forms show difference, equality, or the highest degree. English uses comparative, superlative, and equality patterns such as more, -er, most, -est, and as ... as.',
        use: 'Use comparison when you need to measure change, rank options, or show which idea is stronger, cheaper, faster, or more useful.',
        conditions: [
          'Use than after a comparative form.',
          'Use only one comparison marker at a time: cheaper or more expensive, not more cheaper.',
          'Use as ... as when you want to show equality.',
        ],
        examples: [
          'This route is cheaper than the old one.',
          'The online option is as flexible as the in-person course.',
        ],
      };
    case 'noun-clauses':
      if (/what clauses/.test(t)) {
        return {
          definition: 'A what-clause begins with what and contains its own subject and verb. The whole clause acts like a noun, so it can be the subject, object, or complement of a sentence.',
          use: 'Use a what-clause when you want to name a thing, idea, need, or result without repeating a longer noun phrase. In other words, what often means the thing that or the information that.',
          conditions: [
            'Keep statement order inside the clause: what the chart shows, not what does the chart show.',
            'Treat the whole what-clause as one unit in the sentence.',
            'Use what when the clause itself names the thing or idea; use that or whether for other noun-clause jobs.',
          ],
          examples: [
            'What students need most is clearer feedback.',
            'The report explained what caused the delay.',
          ],
        };
      }

      return {
        definition: 'A noun clause is a clause that works like a noun. It can report information, questions, uncertainty, or beliefs, often with words such as that, whether, and what.',
        use: 'Use noun clauses after verbs like know, think, explain, decide, and wonder when you want to report an idea rather than ask a direct question.',
        conditions: [
          'Keep normal statement order inside the noun clause.',
          'Use that to report information and whether to report a yes/no idea.',
          'Choose one noun-clause pattern that matches the exact meaning you want.',
        ],
        examples: [
          'I believe that the policy needs more funding.',
          'The committee has not decided whether the centre should stay open.',
        ],
      };
    case 'verb-patterns':
      return {
        definition: 'Some verbs are followed by a gerund (-ing), some by an infinitive (to + base verb), and some patterns change after prepositions. These are fixed grammar patterns, not free choices.',
        use: 'Use the right verb pattern after the first word. If the first verb is wrong, the whole sentence will sound off even if the meaning is clear.',
        conditions: [
          'After a preposition, use the -ing form.',
          'Learn common verb partners as full chunks: decide to, avoid doing, interested in doing.',
          'Check whether changing from -ing to infinitive changes the meaning of the sentence.',
        ],
        examples: [
          'She avoided answering the question directly.',
          'They decided to expand the program next term.',
        ],
      };
    case 'word-formation-prefixes':
      return {
        definition: 'A prefix is added to the beginning of a base word. Prefixes usually change meaning, not part of speech. Common jobs are negative meaning (un-, in-, dis-), wrong meaning (mis-), and repetition (re-).',
        use: 'Use prefixes when the sentence needs a specific meaning shift such as opposite, wrong action, or do again. Start from meaning first, then choose the prefix. Do not add a prefix only to make the sentence look advanced.',
        conditions: [
          'Decide the meaning change first: negative, opposite, wrong action, repetition, or degree.',
          'Check that the prefixed form is a real word used in natural English.',
          'Re-read the sentence to confirm that the new prefixed word still fits the message.',
        ],
        examples: [
          'Several passengers misunderstood the platform announcement during the storm.',
          'Please rewrite the summary after you review the supervisor comments.',
        ],
      };
    case 'word-formation-suffixes':
      return {
        definition: 'A suffix is added to the end of a base word. Suffixes often change word class, for example verb to noun (inform -> information), noun to adjective (help -> helpful), or adjective to adverb (quick -> quickly).',
        use: 'Use suffixes when the sentence slot needs a different word class. First identify whether you need a noun, adjective, adverb, or verb. Then choose a suffix pattern that is common and natural.',
        conditions: [
          'Identify the sentence slot before changing the word (noun, adjective, adverb, or verb).',
          'Use high-frequency suffix patterns such as -tion, -ment, -ness, -able, -ive, and -ly.',
          'Check spelling changes after suffixes, for example happy -> happiness and decide -> decision.',
        ],
        examples: [
          'Regular speaking practice improved pronunciation and confidence.',
          'The revised instructions made the registration process manageable.',
        ],
      };
    case 'noun-formation':
      return {
        definition: 'Noun formation means building nouns from verbs or adjectives, often with suffixes like -tion, -ment, -ness, and -ity. This helps you name actions, results, and abstract ideas clearly.',
        use: 'Use noun formation when the sentence position requires a noun, such as after articles, possessives, and many prepositions. In exam writing, strong noun control helps you describe trends, causes, and outcomes with precision.',
        conditions: [
          'Check whether the slot needs a noun after the determiner or preposition.',
          'Choose a natural noun form from the same word family (decide -> decision, improve -> improvement).',
          'Keep noun phrases readable; avoid heavy chains of abstract nouns.',
        ],
        examples: [
          'Their decision to extend library hours increased attendance.',
          'The rapid expansion of bus routes reduced commute times.',
        ],
      };
    case 'word-formation':
      return {
        definition: 'Word formation uses prefixes and suffixes to build a new word from a base form. The new form must match both grammar and meaning in the full sentence.',
        use: 'Use word formation when the base idea is correct but the sentence needs a different form or a meaning shift. In exam tasks, this helps you stay precise instead of repeating one simple word pattern.',
        conditions: [
          'Identify whether the sentence needs a meaning change (prefix) or a word-class change (suffix).',
          'Choose only patterns that are common and natural for that word family.',
          'Check final spelling and full-sentence meaning before you keep the formed word.',
        ],
        examples: [
          'The board disagreed with the proposal after the second review.',
          'The improvement in route planning reduced average delays.',
        ],
      };
    case 'phrasal-verbs':
      return {
        definition: 'A phrasal verb combines a verb with a particle such as up, off, out, or on. The meaning often changes from the base verb, so the full phrase must be learned together.',
        use: 'Use phrasal verbs when they are natural for the context. In speaking they are very common; in formal writing you may need to choose between the phrasal verb and a more formal one-word verb.',
        conditions: [
          'Learn the verb and particle together as one item.',
          'Check whether the object can go between the verb and particle.',
          'Choose a phrasal verb only when the register still fits the task.',
        ],
        examples: [
          'The meeting was put off until Friday.',
          'Students need to find out what the question is really asking.',
        ],
      };
    case 'noun-phrases':
      return {
        definition: 'A noun phrase is the noun plus the words that describe or limit it. Good noun phrases carry detail efficiently, but overloaded ones become hard to read.',
        use: 'Use noun phrases to pack meaning into a short space, especially in summaries and formal writing. The key is to keep the head noun clear while adding only useful detail.',
        conditions: [
          'Keep the main noun easy to identify.',
          'Place modifiers close to the noun they describe.',
          'If the noun phrase becomes too heavy, turn part of it into a full clause.',
        ],
        examples: [
          'The city introduced a long-term public transport plan.',
          'Affordable housing options remain a major local issue.',
        ],
      };
    case 'agreement':
      return {
        definition: 'Subject-verb agreement means the verb matches the real subject in number. The main challenge is not the rule itself; it is finding the true subject when extra words come between the subject and the verb.',
        use: 'Use agreement checks when the sentence contains a long noun phrase, a phrase after of, or words between the subject and the verb.',
        conditions: [
          'Find the true subject before you choose the verb form.',
          'Ignore extra phrases that do not change the subject number.',
          'Check special patterns such as a list of, the number of, and neither ... nor.',
        ],
        examples: [
          'A list of solutions is on the board.',
          'The number of applicants has increased this year.',
        ],
      };
    case 'adverbs':
      return {
        definition: 'Adverbs answer questions such as how, when, how often, and to what degree. They often describe verbs, adjectives, or whole sentences.',
        use: 'Use adverbs to add timing, frequency, degree, or manner without rewriting the whole sentence. Good adverb choice makes the sentence more precise, but misplaced adverbs can sound unnatural or confusing.',
        conditions: [
          'Choose the adverb that matches the job: frequency, manner, time, or degree.',
          'Check position carefully because adverb placement changes emphasis.',
          'Use the adjective form after linking verbs such as be, seem, and become.',
        ],
        examples: [
          'She speaks clearly during presentations.',
          'The buses usually arrive on time in the morning.',
        ],
      };
    case 'correlatives':
      return {
        definition: 'Correlative pairs such as both ... and, either ... or, and neither ... nor connect two matching choices. The structure works best when both parts of the pair are parallel.',
        use: 'Use these pairs when you want to add, limit, or balance options clearly. The reader should be able to predict the second half once the first half begins.',
        conditions: [
          'Keep the grammar parallel on both sides of the pair.',
          'Make sure the verb agrees with the real subject in either/or and neither/nor patterns.',
          'Use the pair only when you are linking two similar sentence parts.',
        ],
        examples: [
          'Both the teacher and the students were ready on time.',
          'Either the library or the classrooms are open this evening.',
        ],
      };
    case 'like-as':
      return {
        definition: 'Like and as can look similar, but they do different jobs. Like is usually followed by a noun phrase, while as is often followed by a clause or used to show a role.',
        use: 'Use like for similarity and as for function, role, or full clause patterns. This distinction matters because the wrong choice changes the grammar shape of the sentence.',
        conditions: [
          'Use like before a noun phrase.',
          'Use as before a clause or to describe a role.',
          'Check whether the next word group is a noun phrase or a full clause.',
        ],
        examples: [
          'She works as a teacher at the college.',
          'As the schedule shows, the break starts at noon.',
        ],
      };
    case 'result-structures':
      return {
        definition: 'Result structures such as too, enough, and so ... that show whether a quality reaches a limit or produces a result. They are useful when you want to show capacity, failure, or consequence clearly.',
        use: 'Use too when something passes a negative limit, enough when it reaches a needed level, and so ... that when you want to show a full result clause.',
        conditions: [
          'Use too + adjective/adverb + to + verb for negative limits.',
          'Use adjective/adverb + enough + to + verb for sufficient level.',
          'Use so + adjective/adverb + that + clause when you need a full result clause.',
        ],
        examples: [
          'The room was so noisy that we left early.',
          'She was confident enough to answer without notes.',
        ],
      };
    case 'imperatives':
      return {
        definition: 'An imperative uses the base verb to give an instruction, command, direction, or strong suggestion. The subject is usually understood rather than written.',
        use: 'Use imperatives for instructions, task steps, and direct advice. They are short and clear, but they sound too strong in situations that need more polite wording.',
        conditions: [
          'Use the base verb, not a full subject + verb sentence.',
          'Use do not or don\'t for negative instructions.',
          'Choose a softer form when the context is formal or very polite.',
        ],
        examples: [
          'Open the booklet and read question one.',
          'Do not leave the answer sheet blank.',
        ],
      };
    case 'connectors':
      return {
        definition: 'Connectors show the relationship between ideas. They tell the reader whether you are adding information, contrasting, giving a reason, or showing a result.',
        use: 'Use connectors to guide the reader through your logic. The best connector is the one that matches the real relationship between the ideas, not the one that sounds most formal.',
        conditions: [
          'Choose the connector after you decide the relationship: addition, contrast, reason, or result.',
          'Do not force a formal connector if a simple one like but or so is clearer.',
          'Check punctuation because some connectors join full clauses and some do not.',
        ],
        examples: [
          'The route is cheaper, but it takes longer during rush hour.',
          'The pilot improved reliability; therefore, fewer passengers complained.',
        ],
      };
    case 'emphasis':
      return {
        definition: 'English can shift word order or use patterns such as cleft sentences and inversion to put one idea in the spotlight. The grammar changes because the writer wants the reader to notice one detail more strongly.',
        use: 'Use emphasis only when you have a clear reason to highlight one detail. If the sentence becomes harder to follow, the emphasis is not helping.',
        conditions: [
          'Decide what deserves the spotlight before you change the sentence shape.',
          'Keep the grammar accurate when you move or split sentence parts for emphasis.',
          'Use emphatic structures sparingly so the effect still feels natural.',
        ],
        examples: [
          'What students need most is clearer feedback.',
          'Only after the final practice did she feel ready.',
        ],
      };
    case 'clause-building':
      return {
        definition: 'Clause-building means combining one clear main idea with supporting clauses without losing control of the sentence. A strong complex sentence still feels easy to follow on the first read.',
        use: 'Use extra clauses to show time, reason, condition, contrast, or added detail. If the link between the clauses is weak, split the sentence and rebuild it.',
        conditions: [
          'Start with a complete main clause before you add support.',
          'Make the link between clauses visible with punctuation or a clear linker.',
          'Cut extra material if the sentence becomes harder to scan than the meaning is worth.',
        ],
        examples: [
          'Because the buses were delayed, many workers arrived late to the meeting.',
          'The report was clear, although the conclusion needed more evidence.',
        ],
      };
    case 'register-precision':
      return {
        definition: 'Register and precision come from grammar choices that sound measured, clear, and appropriate for the task. In formal exam English, you usually need controlled claims rather than dramatic or casual ones.',
        use: 'Use more careful grammar when you need to sound balanced, persuasive, or objective. Small changes such as hedging, reformulation, and sentence framing can make an answer sound much more credible.',
        conditions: [
          'Choose language that matches the task: cautious for academic claims, direct for clear instruction, balanced for argument.',
          'Prefer precise claims you can support instead of dramatic statements you cannot prove.',
          'Revise casual or spoken grammar if the task expects a more formal tone.',
        ],
        examples: [
          'This suggests that the policy may be effective in the short term.',
          'A more practical approach would be to improve route frequency before expansion.',
        ],
      };
    case 'conditionals':
      return {
        definition: 'Conditionals connect a situation with its result. The verb forms show whether the situation is real, likely, imagined, or impossible in the past.',
        use: 'Use conditionals to explain consequences clearly. Strong conditional writing depends on matching the condition and result to the same timeline and logic.',
        conditions: [
          'Decide first whether the meaning is real, likely, unreal, or impossible in the past.',
          'Match the verb forms in both halves of the sentence.',
          'Do not put will in a normal if-clause unless the structure has a special meaning.',
        ],
        examples: [
          'If residents use the new route, commute times will fall.',
          'If the council had acted earlier, the repairs would have cost less.',
        ],
      };
    case 'passive':
      return {
        definition: 'The passive changes the focus of the sentence from the doer to the action or result. It is formed with be plus a past participle.',
        use: 'Use the passive when the action matters more than the doer, when the doer is unknown, or when naming the doer adds nothing useful.',
        conditions: [
          'Build the passive with the correct form of be and the past participle.',
          'Name the agent with by only when the reader needs that detail.',
          'Switch back to active voice if the passive hides responsibility or makes the sentence weaker.',
        ],
        examples: [
          'More buses were added to the route last winter.',
          'The final timetable will be announced on Friday.',
        ],
      };
    case 'prepositions':
      return {
        definition: 'Prepositions show relationships such as time, place, direction, cause, and pattern. Many preposition choices are fixed, so they need to be learned in chunks.',
        use: 'Use prepositions by asking what relationship you need first, then checking whether the verb, adjective, or noun has a fixed partner.',
        conditions: [
          'Choose the preposition from the relationship, not from direct translation.',
          'Learn common chunks such as interested in, responsible for, and depend on.',
          'Remove extra prepositions after verbs that do not take them.',
        ],
        examples: [
          'She is interested in urban planning.',
          'The lecture starts on Monday at nine.',
        ],
      };
    case 'relative-clauses':
      return {
        definition: 'A relative clause adds information about a noun. It lets you connect two ideas without repeating the noun in a second full sentence.',
        use: 'Use relative clauses to describe or identify people, things, and places more efficiently. The key decision is whether the clause is essential or extra information.',
        conditions: [
          'Attach the clause directly to the noun it describes.',
          'Choose who, which, or that from the noun and the style you need.',
          'Do not repeat the subject inside the relative clause.',
        ],
        examples: [
          'Students who revise consistently usually feel calmer in the exam.',
          'The route that connects the station to campus is often overcrowded.',
        ],
      };
    case 'questions-word-order':
      return {
        definition: 'English questions often require auxiliary movement or inversion. The main task is to control word order without turning statement order into a direct question by mistake.',
        use: 'Use question word order in direct questions, tag questions, and inversion patterns. In reported questions, switch back to normal statement order.',
        conditions: [
          'Find the auxiliary first; if there is none, use do, does, or did where needed.',
          'Put the auxiliary before the subject in direct questions.',
          'Keep normal statement order inside reported questions and noun clauses.',
        ],
        examples: [
          'Why did the service change last month?',
          'She asked why the service had changed last month.',
        ],
      };
    case 'pronouns':
      return {
        definition: 'Pronouns replace nouns so you do not have to repeat the same word again and again. They help sentences flow, but they create problems when the reference is unclear.',
        use: 'Use pronouns only when the reader can identify exactly who or what the pronoun refers to. If two possible meanings are competing, repeat the noun.',
        conditions: [
          'Check whether the pronoun has one clear reference.',
          'Match the pronoun type to the job: subject, object, possessive, reflexive, or demonstrative.',
          'Repeat the noun when the sentence would otherwise be ambiguous.',
        ],
        examples: [
          'Maria called the manager because she needed an update.',
          'This option is cheaper, but that one is more reliable.',
        ],
      };
    case 'quantifiers':
      return {
        definition: 'Quantifiers show how much or how many. The main choice depends on whether the noun is countable, uncountable, singular, or plural.',
        use: 'Use quantifiers to make amounts accurate. A small form change, such as many instead of much, can turn an unnatural sentence into a natural one immediately.',
        conditions: [
          'Use countable quantifiers with plural count nouns and uncountable quantifiers with mass nouns.',
          'Notice the difference between little and a little, or few and a few.',
          'Check agreement after quantifier phrases when the noun changes form.',
        ],
        examples: [
          'There are many reasons to improve public transport.',
          'We have little time left before the test begins.',
        ],
      };
    case 'punctuation':
      return {
        definition: 'Punctuation controls how ideas are separated, linked, and highlighted on the page. It is not decoration; it tells the reader how the sentence should be read.',
        use: 'Use punctuation to show complete clauses, lists, possession, pauses, and emphasis more clearly. The correct mark depends on the grammar around it, not on where you want to pause when speaking.',
        conditions: [
          'Check clause completeness before you choose marks such as semicolons or colons.',
          'Use commas only when the grammar calls for them, not just because the sentence feels long.',
          'Treat apostrophes and capital letters as meaning signals, not style choices.',
        ],
        examples: [
          'The route was improved; however, late-evening service still needs work.',
          'The council approved one priority: safer crossings near schools.',
        ],
      };
    case 'reporting':
      return {
        definition: 'Reporting structures let you repeat what someone said, thought, asked, or concluded. The challenge is choosing the right reporting verb and keeping the grammar after it accurate.',
        use: 'Use reporting grammar when you summarize other people\'s words or ideas. This is common in speaking, writing, and source-based tasks.',
        conditions: [
          'Choose the reporting verb from the meaning: say, tell, explain, ask, suggest, or report.',
          'Check whether the structure after the reporting verb needs that, whether, or a wh-clause.',
          'Shift tense only when the timeline and context require it.',
        ],
        examples: [
          'The witness said that the road had been closed for two hours.',
          'She explained why the original plan had failed.',
        ],
      };
    case 'modals':
      return {
        definition: 'Modal verbs show ability, advice, obligation, permission, possibility, and deduction. The important choice is the meaning strength, not the word alone.',
        use: 'Use modals to show how certain, necessary, polite, or strong your message should sound. Different modals can change the tone even when the basic idea stays similar.',
        conditions: [
          'Pick the meaning first: ability, advice, obligation, possibility, or deduction.',
          'Use the base verb after the modal in the normal pattern.',
          'Choose a modal strength that matches the real level of certainty or force.',
        ],
        examples: [
          'Students should review the task before they start writing.',
          'The delays may continue if repairs are postponed again.',
        ],
      };
    case 'auxiliaries':
      return {
        definition: 'Auxiliaries such as be, do, and have help build questions, negatives, emphasis, and tense forms. They look small, but they control the grammar of the whole clause.',
        use: 'Use auxiliaries carefully because one missing helper verb can make the whole sentence ungrammatical. In basic English, accurate be, do, and have choices matter more than adding complexity.',
        conditions: [
          'Check whether the sentence needs a helper verb for a question, negative, or tense form.',
          'Match the auxiliary to the subject and time reference.',
          'Do not mix main-verb patterns and auxiliary patterns in the same clause.',
        ],
        examples: [
          'She does not need extra time for this section.',
          'There are two reasons why the plan failed.',
        ],
      };
    case 'tenses':
      return {
        definition: 'Tense choices place actions on a timeline and show whether they are finished, ongoing, repeated, or connected to another time point.',
        use: 'Use tense accurately by deciding the time first and the meaning second. Readers should be able to follow your timeline without stopping to reinterpret the verb forms.',
        conditions: [
          'Find the time signal or implied timeline before you choose the verb.',
          'Keep the tense stable until the timeline genuinely changes.',
          'Use perfect forms when you need to connect an earlier action to another time point.',
        ],
        examples: [
          'Since January, attendance has improved every week.',
          'By the end of the year, the team will have completed the trial.',
        ],
      };
    default:
      return {
        definition: `${topic} changes how information is built inside the sentence. The practical goal is to make the form reliable enough that you can use it without hesitation under time pressure.`,
        use: 'Start with a short, correct sentence. Then add the target structure only if it makes the meaning clearer, more accurate, or easier for the reader to follow.',
        conditions: [
          'Build the core meaning first before you add extra grammar.',
          'Check one control point at a time: word order, agreement, reference, or punctuation.',
          'If the sentence becomes harder to understand, simplify it and rebuild the pattern.',
        ],
        examples: [
          'The revised policy reduced delays because the instructions were clearer.',
          'A shorter stable sentence is stronger than a longer confusing one.',
        ],
      };
  }
}

function pickGrammarPackEnhanced(topic) {
  const t = topic.toLowerCase();
  const kind = detectGrammarLessonKind(topic);

  if (/what clauses/.test(t)) {
    return {
      ex1Weak: 'I do not understand what does the chart show.',
      ex1Better: 'I do not understand what the chart shows.',
      ex2Weak: 'What students need are more quiet study space.',
      ex2Better: 'What students need is more quiet study space.',
      err1: 'using question order inside a what-clause',
      fix1: 'keep statement order after verbs like know, explain, and show',
      practice1: [
        'She explained what did the graph mean in the final section.',
        'What the school need is a clearer homework system.',
        'I cannot see what is the main change in this chart.',
      ],
      answerHints: [
        'She explained what the graph meant in the final section.',
        'What the school needs is a clearer homework system.',
        'I cannot see what the main change in this chart is.',
      ],
    };
  }

  if (/noun clauses/.test(t)) {
    return {
      ex1Weak: 'I believe whether the program needs more funding.',
      ex1Better: 'I believe that the program needs more funding.',
      ex2Weak: 'The committee has not decided if the centre should stay open.',
      ex2Better: 'The committee has not decided whether the centre should stay open.',
      err1: 'choosing the wrong noun-clause opener',
      fix1: 'use that for reported information and whether for a yes/no idea',
      practice1: [
        'The teacher explained if the deadline had changed.',
        'We know whether the pilot reduced delays in the first month.',
        'I wonder that the extra buses will stay after summer.',
      ],
      answerHints: [
        'The teacher explained that the deadline had changed.',
        'We know that the pilot reduced delays in the first month.',
        'I wonder whether the extra buses will stay after summer.',
      ],
    };
  }

  if (kind === 'verb-patterns') {
    return {
      ex1Weak: 'She avoided to answer the question directly.',
      ex1Better: 'She avoided answering the question directly.',
      ex2Weak: 'They decided expanding the program next term.',
      ex2Better: 'They decided to expand the program next term.',
      err1: 'using the wrong form after the first verb or preposition',
      fix1: 'learn each verb pattern as a chunk and keep the next form consistent',
      practice1: [
        'He is interested to joining the evening class.',
        'We discussed to move the workshop to Friday.',
        'The manager admitted to make a planning mistake.',
      ],
      answerHints: [
        'He is interested in joining the evening class.',
        'We discussed moving the workshop to Friday.',
        'The manager admitted making a planning mistake.',
      ],
    };
  }

  if (kind === 'word-formation-prefixes') {
    return {
      ex1Weak: 'Several passengers understood the platform announcement because of the background noise.',
      ex1Better: 'Several passengers misunderstood the platform announcement because of the background noise.',
      ex2Weak: 'Please write the summary after the supervisor gives feedback.',
      ex2Better: 'Please rewrite the summary after the supervisor gives feedback.',
      err1: 'using the base word where the sentence needs a prefix meaning',
      fix1: 'choose the prefix from meaning first: negative (un-/in-/im-), wrong (mis-), opposite (dis-), or repetition (re-)',
      practice1: [
        'The manager asked us to check the data again, so we had to view the file before submission.',
        'Some residents agreed with the new parking rule because the fee was too high.',
        'Because of the noisy speaker, many students understood the safety instructions.',
      ],
      answerHints: [
        'The manager asked us to check the data again, so we had to review the file before submission.',
        'Some residents disagreed with the new parking rule because the fee was too high.',
        'Because of the noisy speaker, many students misunderstood the safety instructions.',
      ],
    };
  }

  if (kind === 'word-formation-suffixes') {
    return {
      ex1Weak: 'The city needs a more effect response to late buses.',
      ex1Better: 'The city needs a more effective response to late buses.',
      ex2Weak: 'Regular speaking practice improved pronounce and confident.',
      ex2Better: 'Regular speaking practice improved pronunciation and confidence.',
      err1: 'using a suffix that does not match the sentence slot',
      fix1: 'identify the slot first, then choose the suffix for noun, adjective, adverb, or verb form',
      practice1: [
        'The new policy brought stable to the bus schedule.',
        'The instructions were help for first-time users.',
        'The team responded quick to passenger complaints.',
      ],
      answerHints: [
        'The new policy brought stability to the bus schedule.',
        'The instructions were helpful for first-time users.',
        'The team responded quickly to passenger complaints.',
      ],
    };
  }

  if (kind === 'noun-formation') {
    return {
      ex1Weak: 'The committee will decide next week, and this decide may affect funding.',
      ex1Better: 'The committee will decide next week, and this decision may affect funding.',
      ex2Weak: 'The company wants to expand, but the expand will take two years.',
      ex2Better: 'The company wants to expand, but the expansion will take two years.',
      err1: 'keeping a verb form where a noun is required',
      fix1: 'check noun positions after determiners, possessives, and prepositions',
      practice1: [
        'Their investigate into the accident took three months.',
        'The city announced an improve in weekend bus service.',
        'After a long discuss, the board approved the budget.',
      ],
      answerHints: [
        'Their investigation into the accident took three months.',
        'The city announced an improvement in weekend bus service.',
        'After a long discussion, the board approved the budget.',
      ],
    };
  }

  if (kind === 'word-formation') {
    return {
      ex1Weak: 'The new schedule improved productive across the team.',
      ex1Better: 'The new schedule improved productivity across the team.',
      ex2Weak: 'The app is use for new learners in this course.',
      ex2Better: 'The app is useful for new learners in this course.',
      err1: 'choosing the wrong part of speech for the sentence slot',
      fix1: 'decide whether the sentence needs a noun, adjective, verb, or adverb before you form the word',
      practice1: [
        'Reliable transport increases worker productive during the week.',
        'The city needs a more effect response to late buses.',
        'Her explanation was clear, but the final sentence ended too sudden.',
      ],
      answerHints: [
        'Reliable transport increases worker productivity during the week.',
        'The city needs a more effective response to late buses.',
        'Her explanation was clear, but the final sentence ended too suddenly.',
      ],
    };
  }

  if (kind === 'phrasal-verbs') {
    return {
      ex1Weak: 'The meeting was putted off until Friday.',
      ex1Better: 'The meeting was put off until Friday.',
      ex2Weak: 'Students need to find why the answer is wrong out.',
      ex2Better: 'Students need to find out why the answer is wrong.',
      err1: 'breaking the phrasal verb form or word order',
      fix1: 'learn the verb and particle together and check object position carefully',
      practice1: [
        'Please look the word up in your notes before class.',
        'The team carried outed the safety check this morning.',
        'We need to work this issue out before the deadline.',
      ],
      answerHints: [
        'Please look up the word in your notes before class.',
        'The team carried out the safety check this morning.',
        'We need to work out this issue before the deadline.',
      ],
    };
  }

  if (kind === 'noun-phrases') {
    return {
      ex1Weak: 'The city launched a policy transport new plan.',
      ex1Better: 'The city launched a new public transport plan.',
      ex2Weak: 'The report discussed housing affordable long-term options.',
      ex2Better: 'The report discussed long-term affordable housing options.',
      err1: 'stacking modifiers in an order that makes the noun phrase hard to read',
      fix1: 'keep the head noun clear and move modifiers into a natural order',
      practice1: [
        'The school announced a support reading after-class program.',
        'Residents want a parking neighbourhood fair system.',
        'The article described policy education recent reforms.',
      ],
      answerHints: [
        'The school announced an after-class reading support program.',
        'Residents want a fair neighbourhood parking system.',
        'The article described recent education policy reforms.',
      ],
    };
  }

  if (kind === 'agreement') {
    return {
      ex1Weak: 'A list of solutions are on the board.',
      ex1Better: 'A list of solutions is on the board.',
      ex2Weak: 'The number of students have increased this year.',
      ex2Better: 'The number of students has increased this year.',
      err1: 'matching the verb to the nearest noun instead of the true subject',
      fix1: 'find the real subject first, then choose the verb form',
      practice1: [
        'A series of workshops were added this term.',
        'The number of late buses have fallen since March.',
        'Neither the manager nor the assistants was ready for the visit.',
      ],
      answerHints: [
        'A series of workshops was added this term.',
        'The number of late buses has fallen since March.',
        'Neither the manager nor the assistants were ready for the visit.',
      ],
    };
  }

  if (kind === 'adverbs') {
    return {
      ex1Weak: 'She speaks English fluent during presentations.',
      ex1Better: 'She speaks English fluently during presentations.',
      ex2Weak: 'I every day revise vocabulary on the bus.',
      ex2Better: 'I revise vocabulary every day on the bus.',
      err1: 'using the wrong form or placing the adverb in an awkward position',
      fix1: 'choose the correct adverb form and place it where the sentence sounds natural',
      practice1: [
        'The train arrived lately, so many workers were delayed.',
        'He explained the chart clear and short.',
        'Students often in the evening study after dinner.',
      ],
      answerHints: [
        'The train arrived late, so many workers were delayed.',
        'He explained the chart clearly and briefly.',
        'Students often study after dinner in the evening.',
      ],
    };
  }

  if (kind === 'correlatives') {
    return {
      ex1Weak: 'Both the teacher and the students was ready on time.',
      ex1Better: 'Both the teacher and the students were ready on time.',
      ex2Weak: 'Either the library or the classrooms is open this evening.',
      ex2Better: 'Either the library or the classrooms are open this evening.',
      err1: 'breaking parallel structure or agreement in a correlative pair',
      fix1: 'keep the pair parallel and match the verb to the real subject near it when needed',
      practice1: [
        'Neither the buses nor the train service were reliable today.',
        'Both the manager and approved the plan the staff.',
        'Either the tutor or the students is presenting first.',
      ],
      answerHints: [
        'Neither the buses nor the train service was reliable today.',
        'Both the manager and the staff approved the plan.',
        'Either the tutor or the students are presenting first.',
      ],
    };
  }

  if (kind === 'like-as') {
    return {
      ex1Weak: 'She works like a teacher at the college.',
      ex1Better: 'She works as a teacher at the college.',
      ex2Weak: 'Like the report shows, delays fell in May.',
      ex2Better: 'As the report shows, delays fell in May.',
      err1: 'using like where English needs as',
      fix1: 'use like before a noun phrase and as before a clause or role',
      practice1: [
        'He spoke as a local resident, not like an expert witness.',
        'Like the graph shows, bus use increased sharply.',
        'Students should use the room as a quiet space after class.',
      ],
      answerHints: [
        'He spoke as a local resident, not as an expert witness.',
        'As the graph shows, bus use increased sharply.',
        'Students should use the room as a quiet space after class.',
      ],
    };
  }

  if (kind === 'result-structures') {
    return {
      ex1Weak: 'The room was too noisy that we left early.',
      ex1Better: 'The room was so noisy that we left early.',
      ex2Weak: 'There was not enough chairs for everyone.',
      ex2Better: 'There were not enough chairs for everyone.',
      err1: 'mixing too, enough, and so ... that patterns',
      fix1: 'choose the structure from the exact meaning: excess, sufficiency, or full result clause',
      practice1: [
        'She was enough confident to lead the discussion.',
        'The bus was too full that nobody else could get on.',
        'We had time enough to finish the notes before class.',
      ],
      answerHints: [
        'She was confident enough to lead the discussion.',
        'The bus was so full that nobody else could get on.',
        'We had enough time to finish the notes before class.',
      ],
    };
  }

  if (kind === 'imperatives') {
    return {
      ex1Weak: 'You open the booklet and read question one.',
      ex1Better: 'Open the booklet and read question one.',
      ex2Weak: 'Do not to forget your ID on test day.',
      ex2Better: 'Do not forget your ID on test day.',
      err1: 'adding an unnecessary subject or infinitive marker to an imperative',
      fix1: 'use the base verb directly for the instruction',
      practice1: [
        'Please to check the heading before you write.',
        'Don\'t be late and bring not your phone inside.',
        'Read the prompt carefully and underline the key verb.',
      ],
      answerHints: [
        'Please check the heading before you write.',
        'Don\'t be late, and do not bring your phone inside.',
        'Read the prompt carefully and underline the key verb.',
      ],
    };
  }

  if (kind === 'connectors') {
    return {
      ex1Weak: 'The route is cheaper however it takes longer in the morning.',
      ex1Better: 'The route is cheaper; however, it takes longer in the morning.',
      ex2Weak: 'The buses were delayed because therefore many students were late.',
      ex2Better: 'The buses were delayed; therefore, many students were late.',
      err1: 'choosing a connector or punctuation pattern that does not match the relationship',
      fix1: 'decide the relationship first, then use a connector and punctuation pattern that fits it',
      practice1: [
        'The library opens earlier however the study rooms still fill quickly.',
        'The policy was expensive because it reduced congestion.',
        'Students revised carefully as a result they felt calmer in the test.',
      ],
      answerHints: [
        'The library opens earlier; however, the study rooms still fill quickly.',
        'The policy was expensive, but it reduced congestion.',
        'Students revised carefully; as a result, they felt calmer in the test.',
      ],
    };
  }

  if (kind === 'emphasis') {
    return {
      ex1Weak: 'Never I have seen such a confusing timetable.',
      ex1Better: 'Never have I seen such a confusing timetable.',
      ex2Weak: 'Only after the final practice she felt ready.',
      ex2Better: 'Only after the final practice did she feel ready.',
      err1: 'changing word order for emphasis without keeping the grammar accurate',
      fix1: 'when emphasis triggers inversion or a cleft pattern, rebuild the whole structure correctly',
      practice1: [
        'Rarely we find such clear instructions in practice books.',
        'What students need most are clearer feedback from teachers.',
        'Only then the team understood the scale of the problem.',
      ],
      answerHints: [
        'Rarely do we find such clear instructions in practice books.',
        'What students need most is clearer feedback from teachers.',
        'Only then did the team understand the scale of the problem.',
      ],
    };
  }

  if (kind === 'clause-building') {
    return {
      ex1Weak: 'Because the buses were delayed. Many workers missed the meeting.',
      ex1Better: 'Because the buses were delayed, many workers missed the meeting.',
      ex2Weak: 'The report was clear although the final paragraph was weak it still helped the reader.',
      ex2Better: 'Although the final paragraph was weak, the report still helped the reader.',
      err1: 'adding extra clauses without controlling how they connect to the main clause',
      fix1: 'build one complete main clause first, then attach support clauses with a clear link',
      practice1: [
        'When the route changed many residents complained because they had not been warned.',
        'The article explained the problem. Which made the solution easier to understand.',
        'Although the school added tutors the timetable still remained confusing for new students.',
      ],
      answerHints: [
        'When the route changed, many residents complained because they had not been warned.',
        'The article explained the problem, which made the solution easier to understand.',
        'Although the school added tutors, the timetable still remained confusing for new students.',
      ],
    };
  }

  if (kind === 'register-precision') {
    return {
      ex1Weak: 'I think this plan is kind of bad for cities.',
      ex1Better: 'This plan is unlikely to benefit cities in the long term.',
      ex2Weak: 'People absolutely hate the change, and it is a total disaster.',
      ex2Better: 'Many residents appear dissatisfied with the change.',
      err1: 'using casual or dramatic grammar in a task that needs measured formal English',
      fix1: 'replace spoken-style wording with precise, supportable claims and more controlled sentence framing',
      practice1: [
        'This idea is super good because everybody will love it.',
        'I totally think the council messed this up badly.',
        'This proves the project is perfect for every community.',
      ],
      answerHints: [
        'This idea could be effective because it addresses a common local need.',
        'The council seems to have handled this issue poorly.',
        'This suggests the project could benefit many communities.',
      ],
    };
  }

  if (kind === 'reporting') {
    return {
      ex1Weak: 'The witness said me that the road was closed.',
      ex1Better: 'The witness told me that the road was closed.',
      ex2Weak: 'She explained that why the original plan had failed.',
      ex2Better: 'She explained why the original plan had failed.',
      err1: 'choosing the wrong reporting verb or clause pattern after it',
      fix1: 'match the reporting verb to the message, then use the clause pattern it actually needs',
      practice1: [
        'The teacher said us that the deadline had changed.',
        'He asked where was the nearest station.',
        'The article reported that the route had reduce delays.',
      ],
      answerHints: [
        'The teacher told us that the deadline had changed.',
        'He asked where the nearest station was.',
        'The article reported that the route had reduced delays.',
      ],
    };
  }

  if (kind === 'punctuation') {
    return {
      ex1Weak: 'The pilot reduced delays, however the old route still needs repairs.',
      ex1Better: 'The pilot reduced delays; however, the old route still needs repairs.',
      ex2Weak: 'The council approved three changes, more buses, better lighting and longer hours.',
      ex2Better: 'The council approved three changes: more buses, better lighting, and longer hours.',
      err1: 'using punctuation marks without checking the grammar on each side',
      fix1: 'check clause completeness or list structure first, then choose the punctuation mark',
      practice1: [
        'The report was useful however it needed clearer headings.',
        'She has one goal improve route safety near schools.',
        'The students books were left on the back table.',
      ],
      answerHints: [
        'The report was useful; however, it needed clearer headings.',
        'She has one goal: improve route safety near schools.',
        'The students\' books were left on the back table.',
      ],
    };
  }

  if (kind === 'modals') {
    return {
      ex1Weak: 'Students should to check the final paragraph.',
      ex1Better: 'Students should check the final paragraph.',
      ex2Weak: 'The delays can to continue if repairs are postponed.',
      ex2Better: 'The delays may continue if repairs are postponed.',
      err1: 'using the wrong form or strength after a modal verb',
      fix1: 'use the base verb after the modal and choose the modal that matches the real meaning',
      practice1: [
        'You must to submit the form before Friday.',
        'Residents should stay home tonight because the storm may be severe.',
        'She might finishes early if the meeting is short.',
      ],
      answerHints: [
        'You must submit the form before Friday.',
        'Residents should stay home tonight because the storm may be severe.',
        'She might finish early if the meeting is short.',
      ],
    };
  }

  if (kind === 'auxiliaries') {
    return {
      ex1Weak: 'She do not need extra time for this section.',
      ex1Better: 'She does not need extra time for this section.',
      ex2Weak: 'There is many reasons to revise the final paragraph.',
      ex2Better: 'There are many reasons to revise the final paragraph.',
      err1: 'choosing the wrong helper verb or subject agreement in the clause',
      fix1: 'match the auxiliary to the subject and sentence job before you build the rest of the clause',
      practice1: [
        'He do not understand the final instruction.',
        'There was too many errors in the first draft.',
        'Do she need to bring her passport tomorrow?',
      ],
      answerHints: [
        'He does not understand the final instruction.',
        'There were too many errors in the first draft.',
        'Does she need to bring her passport tomorrow?',
      ],
    };
  }

  return pickGrammarPack(topic);
}

function grammarKeySteps(kind, topic) {
  if (/what clauses/.test(topic.toLowerCase())) {
    return [
      'Build the clause as what + subject + verb.',
      'Keep statement order inside the clause, not question order.',
      'Use the whole what-clause as one noun unit in the sentence.',
      'Check the main verb agreement after the clause is in place.',
      'Read the sentence once and ask whether what means the thing that here.',
    ];
  }

  const extra = {
    'noun-clauses': [
      'Choose the clause opener from the meaning: what, that, or whether.',
      'Keep normal statement order inside the clause.',
      'Treat the whole clause as one noun unit in the sentence.',
      'Check verb agreement in the main sentence after the clause is in place.',
      'Use the clause only when it makes the message shorter or clearer.',
    ],
    'verb-patterns': [
      'Learn the first word and the next verb form together as one chunk.',
      'Use the -ing form after prepositions.',
      'Check whether the first verb takes -ing, to + verb, or both with a meaning change.',
      'Test the sentence slot again after you change the verb form.',
      'Keep the pattern simple enough that the meaning stays clear.',
    ],
    'word-formation-prefixes': [
      'Decide the meaning change first: negative, opposite, wrong action, repetition, or degree.',
      'Choose a common prefix that matches that meaning (un-, in-/im-, dis-, mis-, re-, over-, under-).',
      'Check that the prefixed form is a real, natural English word.',
      'Read the full sentence to confirm the prefixed word keeps the intended meaning.',
      'Avoid creating new forms by guessing; use reliable word families you have seen before.',
    ],
    'word-formation-suffixes': [
      'Find the sentence slot first: noun, adjective, adverb, or verb.',
      'Choose a frequent suffix pattern that fits the slot (-tion, -ment, -ness, -able, -ive, -ly).',
      'Apply spelling changes correctly when needed (happy -> happiness, decide -> decision).',
      'Check the full clause to make sure the new form is grammatically correct and natural.',
      'Keep the sentence concise; do not add extra formed words that do not improve meaning.',
    ],
    'noun-formation': [
      'Locate positions where English expects a noun: after determiners, possessives, and many prepositions.',
      'Convert the base word to a natural noun form (decide -> decision, improve -> improvement).',
      'Check agreement and article use around the new noun phrase.',
      'Keep noun groups readable; split heavy noun chains when needed.',
      'Re-read for clarity and replace abstract nouns with verbs if the sentence becomes too dense.',
    ],
    'word-formation': [
      'Identify the sentence slot first: noun, adjective, verb, or adverb.',
      'Choose the correct base word before you add a prefix or suffix.',
      'Check spelling changes after you add the affix.',
      'Read the full sentence to make sure the new form still matches the meaning.',
      'Use the formed word only when it sounds natural in context.',
    ],
    'phrasal-verbs': [
      'Learn the verb and particle together, not as separate words.',
      'Check whether the object can go between the verb and the particle.',
      'Keep the base form and tense accurate when the phrasal verb changes.',
      'Choose the phrasal verb only when the register still fits the task.',
      'Read the full sentence once to make sure the phrase still sounds natural.',
    ],
    'noun-phrases': [
      'Find the head noun first.',
      'Add only the modifiers that help the reader understand the noun.',
      'Place modifiers in a natural order before the noun.',
      'Move part of the phrase into a clause if the stack becomes hard to read.',
      'Check that the noun phrase still points to one clear idea.',
    ],
    agreement: [
      'Find the true subject before you look at the verb.',
      'Ignore extra phrases that sit between the subject and verb.',
      'Check special patterns such as the number of and neither ... nor.',
      'Match the verb to the real subject, not the nearest noun.',
      'Read the finished sentence once and ask what is actually doing the action.',
    ],
    adverbs: [
      'Choose the adverb job first: manner, frequency, time, or degree.',
      'Check whether English needs an adjective or an adverb in that sentence slot.',
      'Place the adverb where the sentence sounds natural.',
      'Move the adverb if the focus becomes confusing.',
      'Keep only the adverbs that add real meaning.',
    ],
    correlatives: [
      'Choose the correct pair: both ... and, either ... or, or neither ... nor.',
      'Keep the grammar parallel on both sides of the pair.',
      'Check the verb agreement after either/or or neither/nor.',
      'Make sure the pair links two similar sentence parts.',
      'Read the whole sentence to confirm that the balance feels natural.',
    ],
    'like-as': [
      'Look at what comes after the word: a noun phrase or a full clause.',
      'Use like before a noun phrase.',
      'Use as before a clause or to show a role.',
      'Check the whole sentence again because like and as change the grammar shape.',
      'Choose the form that matches the meaning, not just the sound you prefer.',
    ],
    'result-structures': [
      'Decide whether you mean excess, sufficiency, or a full result clause.',
      'Use too for excess and enough for sufficient level.',
      'Use so ... that when you need a full result clause after the adjective or adverb.',
      'Check the noun or verb pattern after enough carefully.',
      'Keep the whole sentence focused on one result only.',
    ],
    imperatives: [
      'Start with the base verb.',
      'Remove the subject unless you need extra emphasis.',
      'Use do not or don\'t for negative instructions.',
      'Choose a softer expression if the context requires politeness.',
      'Keep each instruction short enough to follow easily.',
    ],
    connectors: [
      'Decide the relationship first: addition, contrast, reason, or result.',
      'Choose a connector that matches that relationship exactly.',
      'Check whether the connector joins words, phrases, or full clauses.',
      'Fix punctuation after the connector pattern is chosen.',
      'Read the whole sentence to make sure the logic is easy to follow.',
    ],
    emphasis: [
      'Choose the word or idea you want to highlight.',
      'Select one structure that creates emphasis naturally, such as inversion or a cleft sentence.',
      'Rebuild the sentence carefully because emphasis often changes word order.',
      'Check agreement and auxiliary use after the sentence moves.',
      'Keep the sentence only if the emphasis makes the meaning clearer or stronger.',
    ],
    'clause-building': [
      'Write one complete main clause first.',
      'Add the support clause only after the main clause is stable.',
      'Show the relationship between clauses clearly with punctuation or a linker.',
      'Check that each clause is attached to the correct part of the sentence.',
      'Split the sentence if the reader has to work too hard to follow it.',
    ],
    'register-precision': [
      'Decide what tone the task needs before you choose the sentence pattern.',
      'Replace casual or dramatic claims with language you can support.',
      'Use grammar that sounds measured when the task is formal or academic.',
      'Cut vague intensifiers such as really, totally, or super if they weaken precision.',
      'Read the sentence once and ask whether it sounds credible, not just strong.',
    ],
    reporting: [
      'Choose the reporting verb from the meaning you want.',
      'Check the clause pattern the reporting verb needs after it.',
      'Keep normal statement order inside reported clauses and reported questions.',
      'Shift tense only when the timeline really calls for it.',
      'Make sure the reported version still matches the original idea accurately.',
    ],
    punctuation: [
      'Find the clause or list structure first.',
      'Choose the punctuation mark from the grammar, not from the pause in your voice.',
      'Use semicolons and colons only after you confirm clause completeness.',
      'Check apostrophes and capitals as meaning signals, not decoration.',
      'Read the sentence again to see whether the punctuation guides the reader clearly.',
    ],
    pronouns: [
      'Find the noun each pronoun refers to.',
      'Check whether the reference is still clear after the noun is replaced.',
      'Match the pronoun type to the sentence job.',
      'Repeat the noun if two possible references compete.',
      'Keep pronouns only when they genuinely make the sentence smoother.',
    ],
    quantifiers: [
      'Decide whether the noun is countable or uncountable.',
      'Choose the quantifier that matches that noun type.',
      'Check whether the phrase shows a small amount, enough, too much, or a general number.',
      'Watch for meaning differences such as few vs a few and little vs a little.',
      'Read the full noun phrase once to confirm it sounds natural.',
    ],
    auxiliaries: [
      'Decide whether the sentence needs a helper verb for a question, negative, or tense form.',
      'Match the auxiliary to the subject.',
      'Choose the right helper: be, do, or have.',
      'Check the main verb form after the auxiliary is in place.',
      'Read the finished clause once because one small auxiliary error can damage the whole sentence.',
    ],
  };

  return extra[kind];
}

function grammarExtraErrors(kind, topic) {
  const t = topic.toLowerCase();

  if (/what clauses/.test(t)) {
    return [
      {
        error: 'treating the what-clause like a direct question',
        weak: 'I cannot see what does the final column mean.',
        strong: 'I cannot see what the final column means.',
        fix: 'keep statement order inside the clause',
      },
      {
        error: 'using the wrong verb agreement after a what-clause',
        weak: 'What the school need are better reading materials.',
        strong: 'What the school needs is better reading material.',
        fix: 'treat the whole clause as one subject and choose the verb from the real complement',
      },
    ];
  }

  const extra = {
    'noun-clauses': [
      {
        error: 'using if where formal English needs whether',
        weak: 'The board discussed if the branch should stay open.',
        strong: 'The board discussed whether the branch should stay open.',
        fix: 'use whether for reported yes/no choices in more formal writing',
      },
      {
        error: 'adding question order after a reporting verb',
        weak: 'She asked what did the manager decide.',
        strong: 'She asked what the manager decided.',
        fix: 'keep statement order inside the noun clause',
      },
    ],
    'verb-patterns': [
      {
        error: 'using the infinitive after a preposition',
        weak: 'She is interested in to join the course.',
        strong: 'She is interested in joining the course.',
        fix: 'use the -ing form after prepositions',
      },
      {
        error: 'changing meaning by choosing the wrong verb pattern',
        weak: 'He stopped to smoke in the office.',
        strong: 'He stopped smoking in the office.',
        fix: 'check whether the verb pattern changes the meaning',
      },
    ],
    'word-formation-prefixes': [
      {
        error: 'using a positive base form when the context needs a negative prefix',
        weak: 'The online form is possible to complete without an ID.',
        strong: 'The online form is impossible to complete without an ID.',
        fix: 'choose a negative prefix that matches the word family and spelling',
      },
      {
        error: 'forgetting re- when the action is repeated',
        weak: 'Please write your answer after checking the teacher comments.',
        strong: 'Please rewrite your answer after checking the teacher comments.',
        fix: 'use re- when the action clearly means do again',
      },
    ],
    'word-formation-suffixes': [
      {
        error: 'using a base adjective where the sentence needs a noun',
        weak: 'The campaign increased aware of road safety.',
        strong: 'The campaign increased awareness of road safety.',
        fix: 'use a noun-forming suffix when the slot requires a noun',
      },
      {
        error: 'using an adjective where a verb modifier needs an adverb suffix',
        weak: 'The driver reacted quick when the signal changed.',
        strong: 'The driver reacted quickly when the signal changed.',
        fix: 'add -ly when the word modifies a verb and adverb form is needed',
      },
    ],
    'noun-formation': [
      {
        error: 'leaving adjective form where the sentence requires a noun',
        weak: 'The policy produced stable in small towns.',
        strong: 'The policy produced stability in small towns.',
        fix: 'convert the base adjective to a noun before the sentence is finalized',
      },
      {
        error: 'building an unreadable noun chain',
        weak: 'The council discussed transport improve plan funding.',
        strong: 'The council discussed funding for a transport improvement plan.',
        fix: 'keep noun phrases readable by moving part of the chain into a prepositional phrase',
      },
    ],
    'word-formation': [
      {
        error: 'keeping the base word where the sentence needs a noun',
        weak: 'The project improved efficient across the department.',
        strong: 'The project improved efficiency across the department.',
        fix: 'change the base word to the part of speech the sentence needs',
      },
      {
        error: 'spelling the formed word incorrectly',
        weak: 'The new system is more reliabel than the old one.',
        strong: 'The new system is more reliable than the old one.',
        fix: 'check spelling changes after adding prefixes or suffixes',
      },
    ],
    articles: [
      {
        error: 'using the with a general plural noun',
        weak: 'The bicycles are healthier than driving in cities.',
        strong: 'Bicycles are healthier than driving in cities.',
        fix: 'remove the when you mean things in general',
      },
      {
        error: 'choosing a/an from spelling instead of sound',
        weak: 'He waited for a hour before boarding.',
        strong: 'He waited for an hour before boarding.',
        fix: 'choose a/an from sound, not the first letter',
      },
    ],
    'adjective-order': [
      {
        error: 'putting color and material in unnatural order',
        weak: 'She bought a leather black jacket for winter.',
        strong: 'She bought a black leather jacket for winter.',
        fix: 'keep a natural adjective order so the noun phrase reads smoothly',
      },
      {
        error: 'stacking too many adjectives in random order',
        weak: 'They rented a stone old beautiful house near downtown.',
        strong: 'They rented a beautiful old stone house near downtown.',
        fix: 'arrange adjectives in a consistent order: opinion, age, color/material, then noun',
      },
    ],
    comparison: [
      {
        error: 'using double comparatives',
        weak: 'This route is more faster during rush hour.',
        strong: 'This route is faster during rush hour.',
        fix: 'use one comparative marker only (-er or more)',
      },
      {
        error: 'using than after a superlative',
        weak: 'It is the cheapest than the old model.',
        strong: 'It is cheaper than the old model.',
        fix: 'use than with comparatives and use in/of with superlatives',
      },
    ],
    'phrasal-verbs': [
      {
        error: 'putting the object in the wrong place',
        weak: 'Please look the number up before class.',
        strong: 'Please look up the number before class.',
        fix: 'check whether the object belongs after the full phrase or inside it',
      },
      {
        error: 'treating the phrasal verb like an ordinary past tense form',
        weak: 'The event was calleded off because of snow.',
        strong: 'The event was called off because of snow.',
        fix: 'conjugate the verb, not the particle',
      },
    ],
    'noun-phrases': [
      {
        error: 'hiding the head noun under too many modifiers',
        weak: 'The report recommended a community support transport emergency plan.',
        strong: 'The report recommended an emergency community transport support plan.',
        fix: 'keep the head noun clear and arrange the modifiers in a natural order',
      },
      {
        error: 'using a noun phrase where a full clause would be clearer',
        weak: 'The rapid district late-bus reduction target created confusion.',
        strong: 'The district target to reduce late buses quickly created confusion.',
        fix: 'turn part of the noun phrase into a clause when the stack becomes hard to read',
      },
    ],
    agreement: [
      {
        error: 'matching the verb to the noun after of',
        weak: 'A range of options are available to applicants.',
        strong: 'A range of options is available to applicants.',
        fix: 'match the verb to the head noun before of',
      },
      {
        error: 'ignoring the nearer subject in either/or patterns',
        weak: 'Either the students or the tutor are presenting first.',
        strong: 'Either the students or the tutor is presenting first.',
        fix: 'in either/or, the verb usually agrees with the nearer subject',
      },
    ],
    adverbs: [
      {
        error: 'using an adjective after an action verb',
        weak: 'He answered quick during the interview.',
        strong: 'He answered quickly during the interview.',
        fix: 'use the adverb form to describe how the action happened',
      },
      {
        error: 'placing the frequency adverb where it sounds unnatural',
        weak: 'I go always by train to the city centre.',
        strong: 'I always go by train to the city centre.',
        fix: 'move the frequency adverb closer to the main verb',
      },
    ],
    correlatives: [
      {
        error: 'breaking the pair with unmatched grammar',
        weak: 'Both to revise grammar and vocabulary practice are useful.',
        strong: 'Both revising grammar and practising vocabulary are useful.',
        fix: 'keep both sides of the pair in the same grammar shape',
      },
      {
        error: 'using a singular verb with a plural nearer subject',
        weak: 'Neither the principal nor the teachers was happy with the change.',
        strong: 'Neither the principal nor the teachers were happy with the change.',
        fix: 'check the nearer subject in neither/nor patterns',
      },
    ],
    'like-as': [
      {
        error: 'using like before a clause',
        weak: 'Like the data shows, evening traffic has fallen.',
        strong: 'As the data shows, evening traffic has fallen.',
        fix: 'use as before a full clause',
      },
      {
        error: 'using like for a role or function',
        weak: 'She works like a teaching assistant on Fridays.',
        strong: 'She works as a teaching assistant on Fridays.',
        fix: 'use as to describe a role',
      },
    ],
    'result-structures': [
      {
        error: 'placing enough in the wrong position',
        weak: 'The room was enough quiet to record the interview.',
        strong: 'The room was quiet enough to record the interview.',
        fix: 'place enough after the adjective or adverb it describes',
      },
      {
        error: 'using too when the sentence means sufficient level',
        weak: 'We were too prepared to finish the task on time.',
        strong: 'We were prepared enough to finish the task on time.',
        fix: 'use enough for a positive sufficient level',
      },
    ],
    imperatives: [
      {
        error: 'making the instruction longer than necessary',
        weak: 'You should now carefully read the first paragraph.',
        strong: 'Read the first paragraph carefully.',
        fix: 'use the base verb directly for a clear instruction',
      },
      {
        error: 'building a negative instruction incorrectly',
        weak: 'Not use your phone during the practice test.',
        strong: 'Do not use your phone during the practice test.',
        fix: 'use do not or don\'t for negative imperatives',
      },
    ],
    connectors: [
      {
        error: 'using a connector that shows the wrong relationship',
        weak: 'The route became cheaper; however, more people started using it.',
        strong: 'The route became cheaper, so more people started using it.',
        fix: 'choose the connector from the real logic between the ideas',
      },
      {
        error: 'joining full clauses with connector punctuation that does not work',
        weak: 'The buses improved however the station remained crowded.',
        strong: 'The buses improved; however, the station remained crowded.',
        fix: 'when however joins full clauses, use punctuation that marks the clause boundary',
      },
    ],
    emphasis: [
      {
        error: 'forgetting inversion after a negative fronted phrase',
        weak: 'Rarely we see such a clear chart in class.',
        strong: 'Rarely do we see such a clear chart in class.',
        fix: 'fronted negative expressions often trigger auxiliary inversion',
      },
      {
        error: 'breaking agreement inside a cleft-like structure',
        weak: 'What students need most are clearer homework instructions.',
        strong: 'What students need most is clearer homework instruction.',
        fix: 'treat the whole fronted clause as one subject and check the complement carefully',
      },
    ],
    'clause-building': [
      {
        error: 'creating a sentence fragment with a subordinate clause',
        weak: 'Because the new route was cheaper.',
        strong: 'Because the new route was cheaper, more commuters started using it.',
        fix: 'a subordinate clause needs a main clause to complete the sentence',
      },
      {
        error: 'overloading one sentence with too many weakly linked clauses',
        weak: 'The school added tutors and students felt calmer and scores improved and parents were happier.',
        strong: 'The school added tutors, so students felt calmer and scores improved.',
        fix: 'keep only the clauses that carry the core logic, then split anything extra',
      },
    ],
    'register-precision': [
      {
        error: 'using spoken intensifiers in a formal academic sentence',
        weak: 'This is a really big problem that totally affects everyone.',
        strong: 'This is a serious problem that affects many residents.',
        fix: 'replace emotional intensifiers with precise, supportable wording',
      },
      {
        error: 'making an absolute claim that the evidence cannot support',
        weak: 'This proves public transport is always the best solution.',
        strong: 'This suggests public transport can be the more effective solution in many cities.',
        fix: 'use measured grammar when the evidence supports a tendency, not an absolute fact',
      },
    ],
    reporting: [
      {
        error: 'using say with an indirect object',
        weak: 'The officer said us that the road was closed.',
        strong: 'The officer told us that the road was closed.',
        fix: 'use tell when the listener is named directly',
      },
      {
        error: 'keeping direct-question word order inside a reported question',
        weak: 'She asked where was the nearest station.',
        strong: 'She asked where the nearest station was.',
        fix: 'reported questions use statement order, not direct-question order',
      },
    ],
    punctuation: [
      {
        error: 'using a comma where a semicolon is needed between full clauses',
        weak: 'The route is faster, however it is less reliable at night.',
        strong: 'The route is faster; however, it is less reliable at night.',
        fix: 'use a semicolon before however when both sides are full clauses',
      },
      {
        error: 'using a colon after an incomplete clause',
        weak: 'The committee discussed: new buses, cleaner stations, and safer crossings.',
        strong: 'The committee discussed three priorities: new buses, cleaner stations, and safer crossings.',
        fix: 'use a colon only after a complete clause',
      },
    ],
    pronouns: [
      {
        error: 'using a pronoun with more than one possible reference',
        weak: 'When Sara met Lina, she looked worried.',
        strong: 'When Sara met Lina, Lina looked worried.',
        fix: 'repeat the noun if the pronoun could point to two different people',
      },
      {
        error: 'choosing the wrong pronoun form after a preposition or verb',
        weak: 'The teacher spoke to he after class.',
        strong: 'The teacher spoke to him after class.',
        fix: 'check whether the sentence needs a subject, object, or possessive pronoun',
      },
    ],
    quantifiers: [
      {
        error: 'using a countable quantifier with an uncountable noun',
        weak: 'We do not have many equipment for the science room.',
        strong: 'We do not have much equipment for the science room.',
        fix: 'match many/few with countable nouns and much/little with uncountable nouns',
      },
      {
        error: 'using few or little when the meaning is actually positive',
        weak: 'A little students asked for extra practice after class.',
        strong: 'A few students asked for extra practice after class.',
        fix: 'use a few with countable plural nouns and a little with uncountable nouns',
      },
    ],
    auxiliaries: [
      {
        error: 'using do with the wrong subject form',
        weak: 'She do not agree with the final decision.',
        strong: 'She does not agree with the final decision.',
        fix: 'match do and does to the subject before you build the negative',
      },
      {
        error: 'using there is with a plural complement',
        weak: 'There is many reasons to expand the service.',
        strong: 'There are many reasons to expand the service.',
        fix: 'match the form of be to the real noun after there',
      },
    ],
  };

  return extra[kind];
}

function grammarLevelGuidance(kind, level) {
  const upper = String(level || '').toUpperCase();

  if (kind === 'word-formation-prefixes') {
    if (/^(A1|A2|B1)$/.test(upper)) {
      return `At ${level} level, focus on the most common prefixes first: un-, dis-, mis-, and re-. Accuracy is more important than variety.`;
    }
    if (upper === 'B2') {
      return `At ${level} level, expand beyond basic negative prefixes and control contrast pairs like re-/mis-/dis-. Your target is accurate meaning, not decorative complexity.`;
    }
    if (/^(C1|C2)$/.test(upper)) {
      return `At ${level} level, use prefixes to control nuance and register. Avoid over-prefixing, and keep the final word natural for the context.`;
    }
  }

  if (kind === 'word-formation-suffixes') {
    if (/^(A1|A2|B1)$/.test(upper)) {
      return `At ${level} level, master high-frequency suffixes for noun, adjective, and adverb forms before attempting lower-frequency patterns.`;
    }
    if (upper === 'B2') {
      return `At ${level} level, keep suffix control accurate under pressure: sentence slot, spelling change, and natural collocation must all match.`;
    }
    if (/^(C1|C2)$/.test(upper)) {
      return `At ${level} level, choose suffix forms strategically for precision and concision, and remove unnecessary abstraction when clarity drops.`;
    }
  }

  if (kind === 'noun-formation') {
    if (/^(A1|A2|B1)$/.test(upper)) {
      return `At ${level} level, prioritize common noun families you can use confidently in short sentences.`;
    }
    if (upper === 'B2') {
      return `At ${level} level, noun formation should help you report causes, changes, and outcomes clearly in exam-style responses.`;
    }
    if (/^(C1|C2)$/.test(upper)) {
      return `At ${level} level, balance nominal style and verbal style. Use noun formation for precision, but keep sentences readable and direct.`;
    }
  }

  if (/^(A1|A2)$/i.test(upper)) {
    return `At ${level} level, keep sentences short and clear first. Add extra words only when they help meaning.`;
  }
  if (/^(B1|B2)$/i.test(upper)) {
    return `At ${level} level, build one correct base sentence first, then add detail without breaking grammar control.`;
  }
  return `At ${level} level, use this structure for precision and logic, not for decorative complexity.`;
}

function grammarBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const family = detectGrammarLessonKind(topic);
  const focusTerm = grammarFocusTerm(topic);
  const expl = grammarTopicExplanation(topic);
  const pack = pickGrammarPackEnhanced(topic);
  const ex1Weak = pack.ex1Weak.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const ex1Better = pack.ex1Better.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const ex2Weak = pack.ex2Weak.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const ex2Better = pack.ex2Better.replace(/target form/gi, focusTerm).replace(/pattern/gi, focusTerm);
  const levelGuidance = grammarLevelGuidance(family, level);
  const steps = grammarKeySteps(family, topic) || {
    articles: [
      'Check the noun first: singular countable, plural, or uncountable.',
      'Ask whether the noun is new information or already known to the reader.',
      'Use a/an for one non-specific countable noun and choose by sound, not spelling.',
      'Use the for a shared, specific, or previously mentioned noun.',
      'Leave the article out when you are speaking generally about plural or uncountable nouns.',
    ],
    'questions-word-order': [
      'Decide whether you need a yes/no question, wh-question, or tag question.',
      'Find the auxiliary verb; if none exists, add do, does, or did.',
      'Put the auxiliary before the subject in direct questions.',
      'Keep question order after the question word unless the question word is the subject.',
      'Read the whole question aloud once to catch word-order mistakes quickly.',
    ],
    'relative-clauses': [
      'Choose the noun you want to describe before you add the clause.',
      'Use who for people, which for things, and that where natural.',
      'Do not repeat the subject inside the relative clause.',
      'Use commas only when the clause adds extra information rather than identifying the noun.',
      'Cut the clause if it does not help the reader understand the noun more clearly.',
    ],
    prepositions: [
      'Find the relationship first: time, place, direction, cause, or fixed pattern.',
      'Check whether the verb or adjective needs a specific preposition.',
      'Use at/on/in by precision and scale, not by guesswork.',
      'Remove extra prepositions after verbs like discuss or enter.',
      'Study the full phrase, not the single preposition on its own.',
    ],
    conditionals: [
      'Decide whether the situation is real, likely, unreal, or impossible in the past.',
      'Match the if-clause tense to the correct result-clause form.',
      'Use would, could, or might only when the logic is unreal or hypothetical.',
      'Do not add will inside a standard if-clause.',
      'Read both halves together to make sure timeline and probability match.',
    ],
    tenses: [
      'Mark the timeline first with a time word or situation clue.',
      'Choose simple, continuous, perfect, or perfect continuous from the meaning.',
      'Keep the reference point stable inside the sentence.',
      'Use tense shifts only when the timeline really changes.',
      'Check that the final verb form agrees with the time marker.',
    ],
    modals: [
      'Choose the meaning first: ability, advice, obligation, possibility, or deduction.',
      'Use the base verb after the modal in normal patterns.',
      'Match the modal strength to the meaning you actually want.',
      'Use past modal forms only when the time reference requires them.',
      'Keep the sentence simple enough that the modal meaning stays obvious.',
    ],
    passive: [
      'Ask what should receive the focus: the doer or the action/result.',
      'Build the passive with be + past participle and keep the tense accurate.',
      'Add the agent with by only when it gives useful information.',
      'Switch back to active voice if responsibility becomes unclear.',
      'Read the finished sentence once to make sure it still sounds natural.',
    ],
  }[family] || [
    'Decide the exact meaning before choosing the grammar form.',
    'Write the shortest correct version first.',
    'Add detail only after the grammar is stable.',
    'Check one risk at a time: form, order, agreement, or reference.',
    'Keep the sentence only if it stays clear in one reading.',
  ];

  const extraErrors = grammarExtraErrors(family, topic) || {
    articles: [
      {
        error: 'using the before a general plural noun',
        weak: 'The cars are expensive to maintain in big cities.',
        strong: 'Cars are expensive to maintain in big cities.',
        fix: 'drop the article when you are speaking about things in general',
      },
      {
        error: 'choosing a or an from spelling instead of sound',
        weak: 'She waited for a hour before the interview.',
        strong: 'She waited for an hour before the interview.',
        fix: 'choose a or an from the sound you hear, not the first letter you see',
      },
    ],
    'questions-word-order': [
      {
        error: 'keeping statement order inside a direct question',
        weak: 'Why you missed the bus this morning?',
        strong: 'Why did you miss the bus this morning?',
        fix: 'move the auxiliary before the subject in direct questions',
      },
      {
        error: 'building a tag question with the wrong auxiliary',
        weak: "She is ready for the exam, doesn't she?",
        strong: "She is ready for the exam, isn't she?",
        fix: 'match the auxiliary in the tag to the main clause',
      },
    ],
    'relative-clauses': [
      {
        error: 'repeating the subject inside the relative clause',
        weak: 'The student who she won the prize thanked her teacher.',
        strong: 'The student who won the prize thanked her teacher.',
        fix: 'use the relative pronoun or the subject noun once, not twice',
      },
      {
        error: 'using commas in a clause that identifies the noun',
        weak: 'Students, who arrive early, usually get the front seats.',
        strong: 'Students who arrive early usually get the front seats.',
        fix: 'remove commas when the clause is necessary to identify the noun',
      },
    ],
    prepositions: [
      {
        error: 'using a preposition after a verb that does not need one',
        weak: 'We discussed about the proposal for thirty minutes.',
        strong: 'We discussed the proposal for thirty minutes.',
        fix: 'learn verbs that take no preposition after them',
      },
      {
        error: 'choosing the wrong time preposition',
        weak: 'The lecture starts in Monday at 9 a.m.',
        strong: 'The lecture starts on Monday at 9 a.m.',
        fix: 'use on for days and at for exact times',
      },
    ],
    conditionals: [
      {
        error: 'putting will inside a standard if-clause',
        weak: 'If students will revise regularly, they will improve faster.',
        strong: 'If students revise regularly, they will improve faster.',
        fix: 'use the present form in the if-clause for likely future results',
      },
      {
        error: 'mixing unreal and real patterns without intention',
        weak: 'If I studied harder, I will pass the exam.',
        strong: 'If I studied harder, I would pass the exam.',
        fix: 'keep the whole condition-result pair in the same logic pattern',
      },
    ],
    tenses: [
      {
        error: 'using present perfect with a finished time marker',
        weak: 'She has finished the report yesterday.',
        strong: 'She finished the report yesterday.',
        fix: 'use a past form with finished time markers like yesterday or last week',
      },
      {
        error: 'switching tense without a time reason',
        weak: 'The study started in May and shows strong results in June.',
        strong: 'The study started in May and showed strong results in June.',
        fix: 'keep the tense stable unless the timeline genuinely changes',
      },
    ],
    modals: [
      {
        error: 'adding to after a modal verb',
        weak: 'Students should to check the final paragraph.',
        strong: 'Students should check the final paragraph.',
        fix: 'use the base verb directly after the modal',
      },
      {
        error: 'choosing a modal with the wrong strength',
        weak: 'You must bring an umbrella because it might rain later.',
        strong: 'You should bring an umbrella because it might rain later.',
        fix: 'match the modal strength to the certainty or advice level you mean',
      },
    ],
    passive: [
      {
        error: 'forgetting the auxiliary verb in a passive sentence',
        weak: 'The final decision announced yesterday.',
        strong: 'The final decision was announced yesterday.',
        fix: 'passive forms need a form of be plus the past participle',
      },
      {
        error: 'using passive voice when the active sentence is clearer',
        weak: 'Mistakes were made by the planning team during the launch.',
        strong: 'The planning team made mistakes during the launch.',
        fix: 'switch back to active voice when responsibility matters',
      },
    ],
  }[family] || [
    {
      error: `using ${focusTerm} in a way that changes the intended meaning`,
      weak: pack.practice1[0],
      strong: pack.answerHints[0],
      fix: `start from the meaning first, then choose the ${focusTerm} form that fits naturally`,
    },
    {
      error: `using ${focusTerm} without checking natural sentence flow`,
      weak: pack.practice1[1],
      strong: pack.answerHints[1],
      fix: `read the full sentence after editing and keep the version that sounds clear and natural`,
    },
  ];
  return `${renderTeachingSection({
    lead: grammarLessonLead(topic, family, focusTerm),
    definition: expl.definition,
    use: expl.use,
    levelNote: levelGuidance,
    useBullets: expl.conditions,
    modelPatterns: expl.examples,
    rememberBullets: steps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: ex1Weak,
      strong: ex1Better,
      why: `This correction matches the intended meaning and keeps ${focusTerm} natural.`,
    },
    {
      weak: ex2Weak,
      strong: ex2Better,
      why: `This version sounds more natural because ${focusTerm} fits the sentence clearly.`,
    },
  ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, [
    { error: pack.err1, weak: ex1Weak, strong: ex1Better, fix: pack.fix1 },
    extraErrors[0],
    extraErrors[1],
  ])}

${buildGrammarPracticeLab({ topic, focusTerm, pack })}

${renderLessonSupportSection('Best when you need precise correction on grammar control, task response quality, and exam-style scoring.')}`;
}

function vocabularyBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const expl = topicExplanation(topic, 'vocabulary');
  const family = detectTopicFamily('vocabulary', topic);
  const wordBank = buildWordBank(topic);
  const support = {
    academic: ['analyze data', 'highlight a trend', 'demonstrate a result', 'justify a claim'],
    'formal-register': ['address an issue', 'provide support', 'request clarification', 'reach a conclusion'],
    opinion: ['from my perspective', 'a major benefit', 'a serious drawback', 'I would argue that'],
    collocations: ['make progress', 'make a decision', 'do research', 'take responsibility'],
    linking: ['however', 'in addition', 'for example', 'as a result'],
    'confusing-words': ['affect/effect', 'economic/economical', 'sensible/sensitive', 'advice/advise'],
    'phrasal-verbs': ['bring up a topic', 'look up a word', 'carry out a task', 'point out a problem'],
    prepositions: ['interested in', 'responsible for', 'on time', 'in advance'],
    quantifiers: ['many reasons', 'much time', 'a few students', 'a little money'],
  }[family] || ['use precise language', 'learn a natural phrase', 'match the register', 'give a real example'];

  const frames = {
    academic: ['The data indicate that...', 'This pattern suggests that...', 'One explanation is that...'],
    'formal-register': ['I would like to clarify...', 'A more effective approach would be...', 'This measure could improve...'],
    opinion: ['I would argue that...', 'The main reason is that...', 'Overall, this is more practical because...'],
    collocations: ['The team made progress after...', 'Students should take responsibility for...', 'Researchers often do...'],
    linking: ['However, this approach...', 'For example, one district...', 'As a result, ...'],
    'confusing-words': ['The policy affected...', 'The main effect was...', 'This is economical, not economic.'],
    'phrasal-verbs': ['The speaker brought up...', 'Please look up...', 'The team carried out...'],
    prepositions: ['She is interested in...', 'We arrived on time because...', 'Please submit the form in advance.'],
    quantifiers: ['There are many...', 'We have very little...', 'Only a few people...'],
  }[family] || ['One useful term is...', 'A stronger way to say this is...', 'This word works when...'];

  const pack = (() => {
    const t = topic.toLowerCase();

    if (family === 'academic') {
      return {
        ex1Weak: 'The chart says bus use went up in May.',
        ex1Better: 'The chart indicates that bus use rose in May.',
        ex2Weak: 'The writer says there is a reason for the change.',
        ex2Better: 'The writer explains one reason for the change.',
        errors: [
          { error: 'using a broad everyday verb where an academic verb is more exact', weak: 'The chart says the route helped workers.', strong: 'The chart indicates that the route improved commuting times for workers.', fix: 'choose a verb that names the job clearly' },
          { error: 'using an academic verb without evidence after it', weak: 'The writer evaluates the issue.', strong: 'The writer evaluates the issue by comparing cost with long-term benefit.', fix: 'follow the verb with the idea or evidence it acts on' },
          { error: 'repeating the same academic verb in every sentence', weak: 'The chart shows one trend, and the writer shows one cause.', strong: 'The chart indicates one trend, and the writer explains one cause.', fix: 'vary the verb only when the meaning changes' },
        ],
        choiceItems: [
          { prompt: 'The graph ___ that bus use increased after the route change.', options: ['says', 'indicates', 'does'], answer: 'indicates' },
          { prompt: 'Writers should ___ their main claim with evidence.', options: ['justify', 'get', 'put'], answer: 'justify' },
          { prompt: 'Before drawing a conclusion, we should ___ the results carefully.', options: ['evaluate', 'tell', 'carry'], answer: 'evaluate' },
        ],
        guidedPrompt: `Use two academic verbs from the word bank to write 3 sentences about ${ctx.domain}. Write one sentence about evidence, one about a cause, and one about a result.`,
        rewriteItems: ['The report says the policy worked.', 'The speaker says why attendance improved.', 'The article says the plan has some weaknesses.'],
        answerGuide: 'For Exercise 2 and Exercise 3, strong answers use the academic verb with a clear object or evidence phrase. Precision matters more than trying to sound difficult.',
      };
    }

    if (family === 'formal-register') {
      return {
        ex1Weak: 'I want you to fix this problem fast.',
        ex1Better: 'I would appreciate a prompt response to this issue.',
        ex2Weak: 'I am writing about the bad service yesterday.',
        ex2Better: 'I am writing regarding the poor service I received yesterday.',
        errors: [
          { error: 'using direct spoken commands in a formal message', weak: 'Send me the details today.', strong: 'Could you please send me the details today?', fix: 'replace direct commands with polite request frames' },
          { error: 'using casual negative words when a neutral formal one is better', weak: 'I am unhappy about the bad service.', strong: 'I am dissatisfied with the poor service I received.', fix: 'choose controlled formal wording' },
          { error: 'starting without a clear purpose phrase', weak: 'I have a problem with my booking.', strong: 'I am writing regarding a problem with my booking.', fix: 'open with a phrase that signals your purpose' },
        ],
        choiceItems: [
          { prompt: 'Which phrase is best for a formal request?', options: ['I want you to reply', 'I would appreciate a reply', 'Reply now'], answer: 'I would appreciate a reply' },
          { prompt: 'Which word fits a formal complaint best?', options: ['bad', 'poor', 'awful'], answer: 'poor' },
          { prompt: 'A clear formal opening is: ___', options: ['I am writing regarding...', 'Listen, I need...', 'I want to say...'], answer: 'I am writing regarding...' },
        ],
        guidedPrompt: `Use one formal opening, one polite request, and one closing phrase to write a 3-sentence message about ${ctx.domain}.`,
        rewriteItems: ['You need to answer this email quickly.', 'I am mad about the service.', 'Tell me what happened.'],
        answerGuide: 'Strong answers sound polite and clear without becoming wordy. The goal is professional control, not exaggerated formality.',
      };
    }

    if (family === 'opinion') {
      return {
        ex1Weak: 'I think this is good.',
        ex1Better: 'From my perspective, the main benefit is lower commuting time.',
        ex2Weak: 'This has bad points too.',
        ex2Better: 'A major drawback is the initial cost of expansion.',
        errors: [
          { error: 'repeating I think without adding a reason', weak: 'I think this is better. I think it helps people.', strong: 'From my perspective, this is better because it improves access for workers and students.', fix: 'state the opinion once, then give the reason' },
          { error: 'using vague praise or criticism instead of a real point', weak: 'This policy is bad for many reasons.', strong: 'This policy has one serious drawback: it increases costs for low-income families.', fix: 'name the exact benefit or drawback' },
          { error: 'using extreme opinion words when the evidence is moderate', weak: 'This is the worst idea ever.', strong: 'This seems less practical than the alternative.', fix: 'match the wording to the strength of the evidence' },
        ],
        choiceItems: [
          { prompt: 'A clear opinion opener is: ___', options: ['From my perspective', 'Maybe stuff', 'In some random way'], answer: 'From my perspective' },
          { prompt: 'Which phrase introduces a negative point clearly?', options: ['a major benefit', 'a serious drawback', 'a nice thing'], answer: 'a serious drawback' },
          { prompt: 'Which phrase compares two sides best?', options: ['outweigh the cost', 'is good', 'matters somehow'], answer: 'outweigh the cost' },
        ],
        guidedPrompt: `Write 3 short opinion sentences about ${ctx.domain}. Include one opinion opener, one reason phrase, and one advantage-or-drawback phrase.`,
        rewriteItems: ['I think buses are good.', 'There are bad sides to this plan.', 'This choice is better.'],
        answerGuide: 'Strong answers link the opinion phrase to a reason or comparison. Do not stop at the opinion alone.',
      };
    }

    if (family === 'collocations') {
      return {
        ex1Weak: 'Students should do progress every week.',
        ex1Better: 'Students should make progress every week.',
        ex2Weak: 'The team did a decision after the meeting.',
        ex2Better: 'The team made a decision after the meeting.',
        errors: [
          { error: 'pairing a common noun with the wrong verb', weak: 'We did research and then did a conclusion.', strong: 'We did research and then reached a conclusion.', fix: 'learn the full collocation instead of translating word by word' },
          { error: 'changing a familiar collocation because another verb feels similar', weak: 'She took progress after practice.', strong: 'She made progress after practice.', fix: 'keep the partner verb English normally uses' },
          { error: 'memorizing the phrase but not using it in a sentence', weak: 'Take responsibility.', strong: 'Students should take responsibility for checking their final answer.', fix: 'activate the collocation in a complete sentence' },
        ],
        choiceItems: [
          { prompt: 'Which collocation is correct?', options: ['do a decision', 'make a decision', 'get a decision'], answer: 'make a decision' },
          { prompt: 'Which phrase sounds natural?', options: ['do progress', 'make progress', 'take progress'], answer: 'make progress' },
          { prompt: 'Which collocation fits best?', options: ['take responsibility', 'make responsibility', 'do responsibility'], answer: 'take responsibility' },
        ],
        guidedPrompt: `Use two collocations from the lesson to write 3 short sentences about ${ctx.domain}. One sentence should describe a task, one a result, and one a responsibility.`,
        rewriteItems: ['The group did a decision quickly.', 'She took progress after extra practice.', 'The class made research on the topic.'],
        answerGuide: 'Correct answers keep the natural word partnership intact. If one word changes, the phrase often stops sounding English.',
      };
    }

    if (family === 'linking') {
      return {
        ex1Weak: 'The route was cheaper. Also, it took longer.',
        ex1Better: 'The route was cheaper; however, it took longer.',
        ex2Weak: 'The school added tutors. Because of this students improved.',
        ex2Better: 'The school added tutors. As a result, students improved.',
        errors: [
          { error: 'using a linker that shows the wrong relationship', weak: 'The route became faster; for example, more workers used it.', strong: 'The route became faster; as a result, more workers used it.', fix: 'choose the linker from the real logic between the ideas' },
          { error: 'repeating the same linker in every sentence', weak: 'However, the buses were late. However, the station was crowded.', strong: 'However, the buses were late. In addition, the station was crowded.', fix: 'vary linkers when the relationship changes' },
          { error: 'adding a linker where the connection is already obvious', weak: 'First, students arrived. Next, they sat down. Then, they opened the test.', strong: 'Students arrived, sat down, and opened the test.', fix: 'use a linker only when it genuinely helps the reader follow the logic' },
        ],
        choiceItems: [
          { prompt: 'Which linker best shows contrast?', options: ['however', 'as a result', 'for example'], answer: 'however' },
          { prompt: 'Which linker introduces an example?', options: ['in addition', 'for example', 'therefore'], answer: 'for example' },
          { prompt: 'Which linker shows result?', options: ['as a result', 'however', 'for instance'], answer: 'as a result' },
        ],
        guidedPrompt: `Write 3 linked sentences about ${ctx.domain}. Use one contrast linker, one example linker, and one result linker.`,
        rewriteItems: ['The buses were cheaper. The journey took longer.', 'The school added tutors. Students improved.', 'One town extended service. It is a useful example.'],
        answerGuide: 'Each linker should match a real relationship. Do not insert a transition just to sound advanced.',
      };
    }

    if (family === 'confusing-words') {
      return {
        ex1Weak: 'The new rule had a positive affect on attendance.',
        ex1Better: 'The new rule had a positive effect on attendance.',
        ex2Weak: 'The policy will advice students about safety.',
        ex2Better: 'The policy will advise students about safety.',
        errors: [
          { error: 'choosing the pair member with the wrong part of speech', weak: 'The teacher gave good advise before the exam.', strong: 'The teacher gave good advice before the exam.', fix: 'check whether the sentence needs a noun or a verb' },
          { error: 'choosing the similar-looking word with the wrong meaning', weak: 'This bus pass is economic for students.', strong: 'This bus pass is economical for students.', fix: 'separate meaning first, then choose the correct word' },
          { error: 'studying the pair without contrasting sentences', weak: 'Affect/effect.', strong: 'Fuel prices affect commuters, and one effect is lower car use.', fix: 'write one sentence for each word so the difference becomes visible' },
        ],
        choiceItems: [
          { prompt: 'Which word is correct? "The storm had a major ___ on tourism."', options: ['affect', 'effect', 'advise'], answer: 'effect' },
          { prompt: 'Which verb is correct? "Teachers should ___ students clearly."', options: ['advice', 'advise', 'effect'], answer: 'advise' },
          { prompt: 'Which adjective means cost-saving?', options: ['economic', 'economical', 'economy'], answer: 'economical' },
        ],
        guidedPrompt: `Choose two confusing word pairs from the lesson and write one clear contrast sentence for each pair about ${ctx.domain}.`,
        rewriteItems: ['The change had a strong affect on staff morale.', 'My tutor gave me useful advise.', 'This option is economic for daily commuters.'],
        answerGuide: 'Strong answers show the difference in meaning and job. If you cannot explain why one word fits better, the pair is not learned yet.',
      };
    }

    if (family === 'phrasal-verbs') {
      return {
        ex1Weak: 'The speaker brought the cost issue in the meeting.',
        ex1Better: 'The speaker brought up the cost issue in the meeting.',
        ex2Weak: 'Please look the station name up before you leave.',
        ex2Better: 'Please look up the station name before you leave.',
        errors: [
          { error: 'choosing the wrong particle with a familiar verb', weak: 'The manager pointed the delay out about at the meeting.', strong: 'The manager pointed out the delay at the meeting.', fix: 'learn the full phrasal verb as one item' },
          { error: 'placing the object in an unnatural position', weak: 'Please look the timetable up before class.', strong: 'Please look up the timetable before class.', fix: 'check where the object belongs in the phrase' },
          { error: 'using a phrasal verb without understanding its meaning', weak: 'The team carried out late because of traffic.', strong: 'The team carried out the safety check despite the traffic delay.', fix: 'use the phrasal verb only when you know what action it describes' },
        ],
        choiceItems: [
          { prompt: 'Which phrasal verb means "introduce a topic"?', options: ['bring up', 'look up', 'carry out'], answer: 'bring up' },
          { prompt: 'Which phrasal verb means "search for information"?', options: ['sort out', 'look up', 'point out'], answer: 'look up' },
          { prompt: 'Which phrasal verb means "complete a task"?', options: ['carry out', 'bring up', 'head back'], answer: 'carry out' },
        ],
        guidedPrompt: `Use two phrasal verbs from the lesson to write 3 short sentences about ${ctx.domain}. Make sure the object position is natural in each one.`,
        rewriteItems: ['The manager brought the problem in the meeting.', 'Please look the new word up.', 'The team carried the survey out last week.'],
        answerGuide: 'Strong answers use the full phrasal verb naturally in context and keep the object position correct.',
      };
    }

    if (family === 'prepositions') {
      return {
        ex1Weak: 'She is interested on environmental policy.',
        ex1Better: 'She is interested in environmental policy.',
        ex2Weak: 'We arrived to the station on time.',
        ex2Better: 'We arrived at the station on time.',
        errors: [
          { error: 'translating a preposition directly from another language', weak: 'He depends of his parents for advice.', strong: 'He depends on his parents for advice.', fix: 'learn the full English chunk instead of translating one word at a time' },
          { error: 'adding a preposition after a verb that does not need one', weak: 'We discussed about the timetable after class.', strong: 'We discussed the timetable after class.', fix: 'check whether the verb takes a preposition at all' },
          { error: 'mixing time and place prepositions', weak: 'The interview starts in Monday at the office.', strong: 'The interview starts on Monday at the office.', fix: 'separate time patterns such as on Monday and at nine o\'clock' },
        ],
        choiceItems: [
          { prompt: 'Which phrase is correct?', options: ['interested on', 'interested in', 'interested at'], answer: 'interested in' },
          { prompt: 'Which phrase is correct?', options: ['responsible for', 'responsible on', 'responsible at'], answer: 'responsible for' },
          { prompt: 'Which time phrase is correct?', options: ['in Monday', 'on Monday', 'at Monday'], answer: 'on Monday' },
        ],
        guidedPrompt: `Write 3 sentences about ${ctx.domain} using three preposition chunks from the lesson. Use one adjective + preposition chunk, one verb + preposition chunk, and one time or place phrase.`,
        rewriteItems: ['She is responsible of the final report.', 'We discussed about the new route.', 'The meeting starts in Friday morning.'],
        answerGuide: 'Strong answers keep the whole phrase together. If you only memorize the preposition, you will keep guessing.',
      };
    }

    if (family === 'quantifiers') {
      return {
        ex1Weak: 'There are much reasons to book early in summer.',
        ex1Better: 'There are many reasons to book early in summer.',
        ex2Weak: 'We have a few time before the shop closes.',
        ex2Better: 'We have a little time before the shop closes.',
        errors: [
          { error: 'using a countable quantifier with an uncountable noun', weak: 'We do not have many information about the delay.', strong: 'We do not have much information about the delay.', fix: 'match many/few with countable nouns and much/little with uncountable nouns' },
          { error: 'using few or little when the intended meaning is positive', weak: 'Few minutes remain, so we can still finish comfortably.', strong: 'A few minutes remain, so we can still finish comfortably.', fix: 'use a few or a little when you mean some, not almost none' },
          { error: 'memorizing the quantifier without the noun type', weak: 'There was many traffic near the station.', strong: 'There was heavy traffic near the station.', fix: 'learn the noun type with the quantifier so the phrase stays natural' },
        ],
        choiceItems: [
          { prompt: 'Which sentence is correct?', options: ['many information', 'much information', 'a few information'], answer: 'much information' },
          { prompt: 'Which phrase shows a small positive number?', options: ['few students', 'a few students', 'little students'], answer: 'a few students' },
          { prompt: 'Which phrase is correct?', options: ['a little money', 'many money', 'few money'], answer: 'a little money' },
        ],
        guidedPrompt: `Write 3 quantity sentences about ${ctx.domain}. Use one countable quantifier, one uncountable quantifier, and one positive small-amount phrase.`,
        rewriteItems: ['There are much tourists in July.', 'We have a few luggage for this trip.', 'Little students asked for help, so the class was easy.'],
        answerGuide: 'Strong answers match the quantifier to the noun type and meaning. Countable vs uncountable is the first check every time.',
      };
    }

    if (/education|school|student|study/.test(t)) {
      return {
        ex1Weak: 'The school helped students do better things.',
        ex1Better: 'The school improved learning outcomes through targeted instructional support.',
        ex2Weak: 'Teachers checked students with many tests.',
        ex2Better: 'Teachers used regular assessment to monitor student progress.',
        errors: [
          { error: 'using broad school words instead of the exact education term', weak: 'The school helped weak students.', strong: 'The school provided instructional support for students who were behind.', fix: 'replace broad verbs like help with the exact school action' },
          { error: 'listing school vocabulary without a real context', weak: 'Curriculum, assessment, attendance, support.', strong: 'Regular assessment improved attendance because students received earlier support.', fix: 'place each new word in a sentence about a real school situation' },
          { error: 'using a topic word with the wrong partner phrase', weak: 'The school increased attendance lessons.', strong: 'The school introduced support lessons that improved attendance.', fix: 'learn the topic word with a natural partner phrase' },
        ],
        choiceItems: [
          { prompt: 'Which term means "a method of checking learning"?', options: ['curriculum', 'assessment', 'attendance'], answer: 'assessment' },
          { prompt: 'Which phrase is strongest?', options: ['help students', 'provide instructional support', 'do better school'], answer: 'provide instructional support' },
          { prompt: 'Which term means "a measurable study result"?', options: ['learning outcome', 'class thing', 'study way'], answer: 'learning outcome' },
        ],
        guidedPrompt: `Use two words from the word bank and one collocation to write 3 short sentences about ${ctx.domain}. Include one school action and one result.`,
        rewriteItems: ['The school did better things for students.', 'Teachers checked learning with many tests.', 'Students came more after the new help program.'],
        answerGuide: 'Strong answers connect the word to a real school action or result. Topic vocabulary is only useful when it is anchored in context.',
      };
    }

    if (/health|medical/.test(t)) {
      return {
        ex1Weak: 'The city helped people stay healthy with early checks.',
        ex1Better: 'The city expanded preventive care and screening services.',
        ex2Weak: 'More people could get treatment, and that was good.',
        ex2Better: 'Better treatment access improved health outcomes.',
        errors: [
          { error: 'using general health language instead of the exact service term', weak: 'The clinic helped people before they got sick.', strong: 'The clinic invested in preventive care.', fix: 'choose the exact health term for the service or action' },
          { error: 'using a technical term without showing what it does', weak: 'Screening is important.', strong: 'Regular screening helps doctors identify illness earlier.', fix: 'add the real purpose or result after the term' },
          { error: 'using health words in a sentence with no clear result', weak: 'Treatment access and health outcome are needed.', strong: 'Better treatment access can improve health outcomes in small towns.', fix: 'build the sentence around a clear action or effect' },
        ],
        choiceItems: [
          { prompt: 'Which term means early healthcare that prevents bigger problems?', options: ['preventive care', 'late treatment', 'health thing'], answer: 'preventive care' },
          { prompt: 'Which term means the result of care or prevention?', options: ['symptom', 'health outcome', 'screening'], answer: 'health outcome' },
          { prompt: 'Which term means testing for possible illness?', options: ['screening', 'therapy', 'diet'], answer: 'screening' },
        ],
        guidedPrompt: `Write 3 short health sentences about ${ctx.domain} using two words from the bank and one collocation. Include one prevention sentence and one result sentence.`,
        rewriteItems: ['The clinic helped people before disease got worse.', 'More people could get care and that was good.', 'The city checked people for illness earlier.'],
        answerGuide: 'Strong answers connect each health word to a service, action, or outcome. Avoid leaving the term as a label without a real sentence job.',
      };
    }

    if (/environment|ecology|climate/.test(t)) {
      return {
        ex1Weak: 'The city made dirty air lower with new rules.',
        ex1Better: 'The city cut emissions and improved air quality with new rules.',
        ex2Weak: 'The country used cleaner power and that was better for nature.',
        ex2Better: 'The country invested in renewable energy to support sustainability.',
        errors: [
          { error: 'using broad environmental words instead of the exact issue', weak: 'The city solved the pollution problem.', strong: 'The city reduced vehicle emissions in the centre.', fix: 'name the exact environmental issue directly' },
          { error: 'using a topic word without cause, effect, or solution', weak: 'Air quality is important.', strong: 'Air quality improved after diesel buses were replaced.', fix: 'attach the term to a real cause or result' },
          { error: 'mixing environmental terms loosely', weak: 'Renewable energy made conservation in the traffic system.', strong: 'Renewable energy reduced the city\'s reliance on fossil fuels.', fix: 'use the topic word in a sentence that matches its real meaning' },
        ],
        choiceItems: [
          { prompt: 'Which term means gases released into the air?', options: ['emissions', 'conservation', 'sustainability'], answer: 'emissions' },
          { prompt: 'Which term fits clean energy from naturally replaced sources?', options: ['air quality', 'renewable energy', 'waste'], answer: 'renewable energy' },
          { prompt: 'Which term means meeting needs without long-term damage?', options: ['sustainability', 'pollution', 'traffic'], answer: 'sustainability' },
        ],
        guidedPrompt: `Use two environmental terms and one collocation to write 3 short sentences about ${ctx.domain}. Include one cause, one effect, and one solution.`,
        rewriteItems: ['The city made the air cleaner with rules.', 'The government used cleaner power.', 'The policy helped nature in the long term.'],
        answerGuide: 'Strong answers name the environmental issue directly and connect it to a cause, effect, or solution.',
      };
    }

    if (/technology|digital|online/.test(t)) {
      return {
        ex1Weak: 'The company used more computer systems to work together.',
        ex1Better: 'The company improved remote collaboration through a shared digital platform.',
        ex2Weak: 'Workers needed to know technology better.',
        ex2Better: 'Workers needed stronger digital literacy.',
        errors: [
          { error: 'using vague tech words instead of a specific system or skill', weak: 'The office used better technology.', strong: 'The office introduced a shared platform for remote collaboration.', fix: 'replace broad tech labels with the exact tool or skill' },
          { error: 'using a technology term without showing its user impact', weak: 'Data privacy is important.', strong: 'Strong data privacy rules protect users from unauthorized access.', fix: 'show what the tech term changes for the user or system' },
          { error: 'mixing digital terms without a real context', weak: 'Automation, platform, interface, online.', strong: 'Automation reduced repetitive tasks, while the user interface stayed easy to learn.', fix: 'turn the topic words into a real work or study scenario' },
        ],
        choiceItems: [
          { prompt: 'Which term means the ability to use digital tools well?', options: ['automation', 'digital literacy', 'platform'], answer: 'digital literacy' },
          { prompt: 'Which term means protection of personal information?', options: ['data privacy', 'interface', 'network'], answer: 'data privacy' },
          { prompt: 'Which term means a digital service or system?', options: ['platform', 'device', 'typing'], answer: 'platform' },
        ],
        guidedPrompt: `Write 3 short technology sentences about ${ctx.domain} using two topic words and one collocation. Include one tool, one user benefit, and one risk or challenge.`,
        rewriteItems: ['The office used better computer things.', 'Workers needed to know technology better.', 'The system protected private information.'],
        answerGuide: 'Strong answers connect each technology term to a real task, user need, or system effect. Avoid empty buzzwords.',
      };
    }

    if (/business|employment|career|work/.test(t)) {
      return {
        ex1Weak: 'The company helped workers do more work.',
        ex1Better: 'The company improved productivity through a targeted training program.',
        ex2Weak: 'They hired more people after many workers left.',
        ex2Better: 'They expanded recruitment after turnover increased.',
        errors: [
          { error: 'using broad workplace words instead of the exact business term', weak: 'The office did things to help staff.', strong: 'The office launched a staff training program.', fix: 'name the exact business action or process' },
          { error: 'using a work term without the result attached', weak: 'Productivity changed after the workshops.', strong: 'Productivity improved after the workshops.', fix: 'add the real workplace result to the topic word' },
          { error: 'treating work vocabulary like isolated labels', weak: 'Recruitment, promotion, workload.', strong: 'A lighter workload and clearer promotion paths improved retention.', fix: 'connect the workplace words inside one real sentence' },
        ],
        choiceItems: [
          { prompt: 'Which term means the people available to work?', options: ['workforce', 'promotion', 'recruitment'], answer: 'workforce' },
          { prompt: 'Which term means the process of hiring staff?', options: ['recruitment', 'training', 'salary'], answer: 'recruitment' },
          { prompt: 'Which term means useful work completed in a period?', options: ['promotion', 'productivity', 'attendance'], answer: 'productivity' },
        ],
        guidedPrompt: `Use two workplace terms and one collocation to write 3 short sentences about ${ctx.domain}. Include one company action and one performance result.`,
        rewriteItems: ['The company helped staff work better.', 'They hired new people after workers left.', 'The office gave workers lessons for the job.'],
        answerGuide: 'Strong answers tie the workplace term to a concrete company action or business result.',
      };
    }

    if (/travel|tourism/.test(t)) {
      return {
        ex1Weak: 'We had a travel plan with city visits and places to stay.',
        ex1Better: 'Our itinerary included two guided tours and pre-booked accommodation.',
        ex2Weak: 'The flight was late and people missed things.',
        ex2Better: 'The delayed flight disrupted the rest of the journey.',
        errors: [
          { error: 'using general travel words instead of the exact service term', weak: 'We had a place to stay near the station.', strong: 'We booked accommodation near the station.', fix: 'replace general phrases with the standard travel term' },
          { error: 'using a topic word without the trip context', weak: 'Itinerary is important.', strong: 'A clear itinerary helped us avoid missing the last train.', fix: 'put the travel term into a real journey situation' },
          { error: 'using tourism vocabulary as a list instead of as description', weak: 'Destination, airport, hotel, delay.', strong: 'The destination was attractive, but the airport transfer was poorly organized.', fix: 'link the travel words inside one real account' },
        ],
        choiceItems: [
          { prompt: 'Which term means a travel plan or route?', options: ['destination', 'itinerary', 'departure'], answer: 'itinerary' },
          { prompt: 'Which term means a place to stay?', options: ['accommodation', 'journey', 'arrival'], answer: 'accommodation' },
          { prompt: 'Which term means the place you are going to?', options: ['destination', 'platform', 'schedule'], answer: 'destination' },
        ],
        guidedPrompt: `Use two travel words and one collocation to write 3 short sentences about ${ctx.domain}. Include one planning sentence and one problem-or-solution sentence.`,
        rewriteItems: ['We made a travel plan with many city visits.', 'The plane was late and the trip got messed up.', 'We found a place to stay near the centre.'],
        answerGuide: 'Strong answers use the travel term in a real trip scenario. The reader should be able to picture the journey clearly.',
      };
    }

    if (/food|shopping|restaurant|market|store/.test(t)) {
      return {
        ex1Weak: 'The market sold good food at cheap prices.',
        ex1Better: 'The market sold fresh produce at budget-friendly prices.',
        ex2Weak: 'The shop did not have the item, so we bought something else.',
        ex2Better: 'The item was out of stock, so we chose an alternative ingredient.',
        errors: [
          { error: 'using broad daily-life words instead of the exact shopping term', weak: 'The store gave us paper after payment.', strong: 'The store gave us a receipt after payment.', fix: 'choose the standard term for the shopping situation' },
          { error: 'using a food word without a real buying or cooking context', weak: 'Fresh produce is nice.', strong: 'Fresh produce is cheaper at the weekend market.', fix: 'show where, why, or how the food term matters' },
          { error: 'using a topic word in the wrong meaning', weak: 'The ingredient was budget-friendly and tasty.', strong: 'The meal was budget-friendly because the ingredients were cheap and local.', fix: 'match the word to the part of the situation it actually describes' },
        ],
        choiceItems: [
          { prompt: 'Which term means proof of payment?', options: ['discount', 'receipt', 'ingredient'], answer: 'receipt' },
          { prompt: 'Which term means unavailable to buy now?', options: ['out of stock', 'fresh produce', 'budget-friendly'], answer: 'out of stock' },
          { prompt: 'Which phrase means affordable in price?', options: ['budget-friendly', 'out of date', 'fresh produce'], answer: 'budget-friendly' },
        ],
        guidedPrompt: `Write 3 short food-or-shopping sentences about ${ctx.domain} using two topic words and one collocation. Include one price sentence and one availability sentence.`,
        rewriteItems: ['The market sold good food cheap.', 'The store did not have the item.', 'We needed one thing for cooking.'],
        answerGuide: 'Strong answers connect the word to a real shopping decision, product, or cooking situation. Avoid vague praise like good or nice.',
      };
    }

    if (/weather|season|forecast/.test(t)) {
      return {
        ex1Weak: 'The weather report said very hot weather was coming.',
        ex1Better: 'The forecast warned of a heatwave.',
        ex2Weak: 'The road was dangerous because it had ice on it.',
        ex2Better: 'Icy roads made the route dangerous.',
        errors: [
          { error: 'using a long explanation instead of the exact weather term', weak: 'There was a lot of rain in a short time.', strong: 'There was heavy rainfall in the afternoon.', fix: 'replace the explanation with the exact weather phrase' },
          { error: 'using a weather term without its real-life effect', weak: 'The forecast predicted snow.', strong: 'The forecast predicted snow, so the school buses left early.', fix: 'attach the weather term to a realistic effect' },
          { error: 'mixing season and weather vocabulary loosely', weak: 'The season was forecast and the roads were climate.', strong: 'Seasonal change brought milder weather but wetter roads.', fix: 'keep each word in its real meaning' },
        ],
        choiceItems: [
          { prompt: 'Which term means a prediction about weather?', options: ['forecast', 'heatwave', 'season'], answer: 'forecast' },
          { prompt: 'Which term means a period of very hot weather?', options: ['rainfall', 'heatwave', 'climate'], answer: 'heatwave' },
          { prompt: 'Which phrase means roads covered with ice?', options: ['mild roads', 'icy roads', 'seasonal roads'], answer: 'icy roads' },
        ],
        guidedPrompt: `Use two weather terms and one collocation to write 3 short sentences about ${ctx.domain}. Include one condition sentence and one effect sentence.`,
        rewriteItems: ['The report said very hot weather was coming.', 'The road had ice and it was dangerous.', 'The season changed and the weather became easier.'],
        answerGuide: 'Strong answers choose the exact weather term and show its effect on daily life, transport, or safety.',
      };
    }

    if (/social|society|policy|politic|community/.test(t)) {
      return {
        ex1Weak: 'The city spent money on help for local people.',
        ex1Better: 'The city increased public funding for a community program.',
        ex2Weak: 'Not enough houses made life hard for many families.',
        ex2Better: 'A housing shortage placed pressure on many families.',
        errors: [
          { error: 'using broad policy words instead of the exact social issue', weak: 'The city tried to fix community problems.', strong: 'The city launched a youth support program to reduce dropout rates.', fix: 'name the exact service or issue directly' },
          { error: 'using a social term with no visible effect', weak: 'Public awareness increased.', strong: 'Public awareness increased after the campaign used local radio and school events.', fix: 'show what changed and why' },
          { error: 'treating social vocabulary like abstract labels', weak: 'Funding, support, housing, awareness.', strong: 'More public funding improved housing support for low-income families.', fix: 'build a real policy sentence with the topic words' },
        ],
        choiceItems: [
          { prompt: 'Which term means money from the government?', options: ['public funding', 'income gap', 'community pressure'], answer: 'public funding' },
          { prompt: 'Which term means not enough homes for demand?', options: ['housing shortage', 'awareness', 'support'], answer: 'housing shortage' },
          { prompt: 'Which term means how much people know about an issue?', options: ['public awareness', 'income gap', 'district plan'], answer: 'public awareness' },
        ],
        guidedPrompt: `Use two social-policy terms and one collocation to write 3 short sentences about ${ctx.domain}. Include one issue sentence and one response sentence.`,
        rewriteItems: ['The city spent money helping local people.', 'There were not enough homes for many families.', 'More people knew about the problem after the campaign.'],
        answerGuide: 'Strong answers identify the social issue clearly and connect the term to a policy action or community effect.',
      };
    }

    if (/communication|personality/.test(t)) {
      return {
        ex1Weak: 'Her speaking style caused people to not understand her.',
        ex1Better: 'Her unclear tone of voice caused a misunderstanding.',
        ex2Weak: 'He is good in group work because people can trust him.',
        ex2Better: 'He is reliable in group work and gives clear feedback.',
        errors: [
          { error: 'using abstract praise instead of a visible behavior or trait', weak: 'She is nice in groups.', strong: 'She is thoughtful and gives useful feedback in group discussions.', fix: 'choose the word that names the actual behavior' },
          { error: 'using communication words without the real situation', weak: 'Feedback is important.', strong: 'Clear feedback helped the team correct the final slide before the meeting.', fix: 'attach the term to a real interaction' },
          { error: 'mixing personality and communication vocabulary loosely', weak: 'He is adaptable in feedback and active listening personality.', strong: 'He is adaptable, and his active listening helps the team solve problems quickly.', fix: 'keep each term in a sentence where its role is clear' },
        ],
        choiceItems: [
          { prompt: 'Which term means comments used for improvement?', options: ['feedback', 'tone', 'result'], answer: 'feedback' },
          { prompt: 'Which phrase means listening carefully and responding thoughtfully?', options: ['active listening', 'body language', 'fast speaking'], answer: 'active listening' },
          { prompt: 'Which adjective means people can trust you?', options: ['adaptable', 'reliable', 'sensitive'], answer: 'reliable' },
        ],
        guidedPrompt: `Write 3 short sentences about ${ctx.domain} using two topic words and one collocation. Include one communication behavior and one personal quality.`,
        rewriteItems: ['She talked in a way people did not understand.', 'He is good in group work.', 'The team fixed the problem after comments from others.'],
        answerGuide: 'Strong answers match the word to a visible action or personal trait. The reader should be able to picture the behavior clearly.',
      };
    }

    return {
      ex1Weak: 'This point is good for people in many ways.',
      ex1Better: `This point is useful in ${ctx.domain} because it makes the message more precise and easier to follow.`,
      ex2Weak: 'Leaders should do something about this problem.',
      ex2Better: 'Writers should choose a more exact term and use it in a clear sentence.',
      errors: [
        { error: 'using a vague word where a topic term is needed', weak: 'This thing is good for people.', strong: 'This measure improves access for local residents.', fix: 'replace vague language with one exact topic word' },
        { error: 'memorizing topic words without a sentence', weak: 'Important word list only.', strong: 'A strong learner writes one clear sentence with each new word.', fix: 'turn the word into a natural sentence as soon as you learn it' },
        { error: 'choosing a difficult word that does not match the meaning', weak: 'The advanced term makes the sentence look impressive.', strong: 'The exact term makes the sentence easier to understand and trust.', fix: 'choose precision over difficulty' },
      ],
      choiceItems: [
        { prompt: 'Which choice is usually strongest?', options: ['a precise natural word', 'the longest word possible', 'a vague general word'], answer: 'a precise natural word' },
        { prompt: 'What should you learn with a new word?', options: ['a collocation and a sentence', 'nothing else', 'only the spelling'], answer: 'a collocation and a sentence' },
        { prompt: 'What makes topic vocabulary useful?', options: ['using it in context', 'reading it once', 'guessing from another language'], answer: 'using it in context' },
      ],
      guidedPrompt: `Use two words from the word bank and one collocation to write 3 short sentences about ${ctx.domain}.`,
      rewriteItems: ['This topic is good for people.', 'Writers should use better words.', 'The idea matters in many ways.'],
      answerGuide: 'Strong answers use the topic word in a clear sentence and keep the meaning accurate. Precision matters more than difficulty.',
    };
  })();
  const rememberSteps = [
    'Choose the meaning first before you choose the word.',
    'Learn the word with a natural collocation or partner phrase.',
    'Use the new word in one short sentence right away.',
    'Replace vague words only when the new word stays accurate.',
    'Keep the register stable so the language fits the task.',
  ];

  return `${renderTeachingSection({
    lead: `This lesson helps you say the same idea with sharper, more natural vocabulary.`,
    definition: expl.definition,
    use: expl.use,
    levelNote: `At ${level} level, learn fewer words but learn them well: meaning, collocation, and one model sentence.`,
    useBullets: expl.conditions,
    modelPatterns: expl.examples,
    rememberBullets: rememberSteps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: pack.ex1Weak,
      strong: pack.ex1Better,
      why: 'The stronger version names the real meaning instead of staying vague.',
    },
    {
      weak: pack.ex2Weak,
      strong: pack.ex2Better,
      why: 'The better sentence sounds more natural for a real task and a real reader.',
    },
  ])}

## Word Bank and Useful Chunks
<div class="lesson-resource-grid">
  <article class="lesson-resource-card">
    <p class="lesson-card-label">Word bank</p>
    ${renderHtmlList(wordBank)}
  </article>
  <article class="lesson-resource-card">
    <p class="lesson-card-label">Useful chunks</p>
    ${renderHtmlList(support)}
  </article>
  <article class="lesson-resource-card">
    <p class="lesson-card-label">Sentence frames</p>
    ${renderHtmlList(frames)}
  </article>
</div>

${renderVisibleErrorSection(`Common Errors with ${topic}`, pack.errors)}

${buildVocabularyPracticeLab({ topic, wordBank, support, frames, pack })}

${renderLessonSupportSection('Best when you need precise correction on word choice, collocations, and band-level lexical control.')}`;
}

function writingBody(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const expl = topicExplanation(topic, 'writing');

  if (/(semicolon|semicolons|colon|colons)/i.test(topic)) {
    const steps = [
      'Check clause completeness first.',
      'Use a semicolon only when both sides are full clauses.',
      'Use a colon only after a complete lead-in clause.',
      'Choose punctuation from logic, not decoration.',
      'If the sentence is weak, rewrite it before you punctuate it.',
    ];
    const errors = [
      {
        error: 'using a semicolon between a full clause and a fragment',
        weak: 'The council changed the schedule; because delays were increasing.',
        strong: 'The council changed the schedule because delays were increasing.',
        fix: 'Use semicolons only when both sides are complete clauses.',
      },
      {
        error: 'using a colon after an incomplete lead-in',
        weak: 'The committee recommended: increasing peak-hour services.',
        strong: 'The committee made one recommendation: increase peak-hour services.',
        fix: 'Make sure the words before the colon can stand as a complete clause.',
      },
      {
        error: 'using a comma where a semicolon is needed',
        weak: 'The trial lowered costs, service quality improved in three districts.',
        strong: 'The trial lowered costs; service quality improved in three districts.',
        fix: 'Replace comma splices with semicolons or split the sentence.',
      },
    ];

    return `${renderTeachingSection({
      lead: 'This lesson helps you use semicolons and colons only when they make the logic clearer.',
      definition:
        'A semicolon joins two closely related full clauses. A colon introduces an explanation, list, or clear result after a full clause.',
      use:
        'Good punctuation should help the reader move through the sentence quickly. If the mark does not clarify the logic, it should not be there.',
      levelNote: `In ${examText} writing, punctuation should make the sentence easier to trust on first reading.`,
      useBullets: [
        'Use a semicolon between two related full clauses.',
        'Use a semicolon before however, therefore, or moreover when both sides are full clauses.',
        'Use a colon after a full clause to introduce a list, explanation, or conclusion.',
      ],
      modelPatterns: [
        'The pilot reduced delays; commuter satisfaction increased in the next survey cycle.',
        'The committee reached one conclusion: route reliability must improve before expansion.',
      ],
      rememberBullets: steps,
    })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
      {
        weak: 'The bus reform reduced delays, residents reported better reliability.',
        strong: 'The bus reform reduced delays; residents reported better reliability.',
        why: 'The semicolon joins two full clauses that belong closely together.',
      },
      {
        weak: 'The city prioritized one objective, to improve route reliability.',
        strong: 'The city prioritized one objective: improving route reliability.',
        why: 'The colon introduces a clear explanation after a complete lead-in.',
      },
    ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, errors)}

${buildSkillPracticeLab({
      topic,
      intro: 'Start by noticing the stronger sentence. Then move to structure and editing.',
      coach: 'Check whether each side of the punctuation mark is a full clause before you choose the mark.',
      strongSentence: 'The route improved; however, evening delays remained a problem.',
      comparisonSentence: 'The council agreed on one point: service reliability comes first.',
      weakSentence: 'Add a punctuation mark because it looks advanced.',
      weakComparison: 'The council had a point, and there were some ideas.',
      steps,
      negatives: [
        'Drop punctuation into the sentence before you check the clause shape.',
        'Use a semicolon after any short phrase that feels formal.',
      ],
    })}

${renderLessonSupportSection('Best when you need expert correction on punctuation accuracy, cohesion, and higher-band writing control.')}`;
  }

  const writingSteps = [
    'Turn the prompt into one clear claim.',
    'Add one reason that truly supports the claim.',
    'Use one concrete detail to prove the point.',
    'Keep each sentence doing one clear job.',
    'Cut filler before you add more language.',
  ];
  const writingErrors = [
    {
      error: 'repeating the same idea with different words',
      weak: 'This policy is important, very important, and important in many ways.',
      strong: 'This policy matters because it improves access, reduces delays, and supports daily routines.',
      fix: 'State one idea once, then add evidence instead of repetition.',
    },
    {
      error: 'using examples with no detail',
      weak: 'Many places improved after changes were made.',
      strong: 'One district reduced response times by 18% after introducing coordinated service planning.',
      fix: 'Add a place, group, time, or measured result.',
    },
    {
      error: 'writing long sentences with weak logic',
      weak: 'The policy changed and many people were affected and it was good and bad for many reasons.',
      strong: 'The policy improved reliability for commuters; however, implementation costs were higher in the first quarter.',
      fix: 'Split the idea and use one clear logic link.',
    },
  ];

  return `${renderTeachingSection({
    lead: `This lesson helps you make your writing clearer, tighter, and easier to follow.`,
    definition: expl.definition,
    use: expl.use,
    levelNote: `In ${examText} writing, strong control means a clear claim, clear support, and no wasted sentences.`,
    useBullets: expl.conditions,
    modelPatterns: expl.examples,
    rememberBullets: writingSteps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: 'This topic is important and has many effects.',
      strong: ctx.claim,
      why: 'The better sentence gives the reader a direct, testable point.',
    },
    {
      weak: 'I think this is good and bad in many ways.',
      strong: ctx.detail,
      why: 'The stronger version adds a real detail instead of a vague opinion.',
    },
  ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, writingErrors)}

${buildSkillPracticeLab({
    topic,
    intro: 'Move from clear purpose to clear structure. Each step should help the reader immediately.',
    coach: 'Ask one question after each sentence: does this move the paragraph forward?',
    strongSentence: ctx.claim,
    comparisonSentence: ctx.detail,
    weakSentence: 'Write a broad sentence first and hope the detail appears later.',
    weakComparison: 'This point matters and there are many things to say about it.',
    steps: writingSteps,
    negatives: [
      'Keep adding ideas even when the main point is still vague.',
      'Use general examples because they sound safer than specific ones.',
    ],
  })}

${renderLessonSupportSection('Best when you need detailed scoring guidance on clarity, cohesion, evidence use, and task achievement.')}`;
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

${renderLessonSupportSection('Best when you need speaking-specific feedback on fluency, coherence, grammar range, and lexical resource.')}`;
}

function writingBodyEnhanced(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const family = detectTopicFamily('writing', topic);

  const guide = {
    explanation:
      'This writing skill matters because exam readers reward control: clear task response, focused support, and readable structure. A strong response tells the reader exactly what it is doing and develops that message with specific support instead of vague general statements.',
    use:
      'Use this lesson when you want a more reliable writing process under time pressure. Plan the function of the response first, then build paragraphs that each do one job. That makes editing easier because you can test not only language but also structure.',
    steps: [
      'Turn the task into one clear response purpose.',
      'Plan the main points before drafting sentences.',
      'Develop each point with explanation and a concrete example or consequence.',
      'Use transitions only when they reflect real logic.',
      'Edit for clarity, support, and sentence control in that order.',
    ],
    exampleA: ctx.claim,
    exampleB: ctx.detail,
    prompt: ctx.prompt,
    answers: [
      'Make the task purpose clear early.',
      'Support major points with explanation and concrete detail.',
      'Keep each paragraph focused on one job.',
    ],
    checks: [
      'Did I make the task purpose clear quickly?',
      'Does each paragraph do one main job?',
      'Did I add concrete support, not only opinion words?',
      'Did I edit for clarity before style?',
    ],
  };

  if (family === 'opinion-essay') {
    guide.explanation =
      'Opinion essays reward commitment and clarity. The examiner should know your position by the end of the introduction and should never have to guess whether you agree, disagree, or partly agree. Strong responses keep the same position from introduction to conclusion, then support that position with one main reason per body paragraph.';
    guide.use =
      'Use this structure when the task asks whether you agree or disagree, or when it asks for your opinion on an issue. Plan your thesis first, then generate two body points that clearly support that thesis. A smaller number of well-developed reasons scores better than a long list of weak ideas.';
    guide.steps = [
      'Underline the instruction words so you know exactly what opinion the task asks for.',
      'Write one thesis sentence that states your position directly.',
      'Plan two body reasons and one concrete example or explanation for each.',
      'Keep each body paragraph on one reason only.',
      'Restate your position in the conclusion without adding a new idea.',
    ];
    guide.exampleA =
      'I completely agree that city budgets should prioritize public transport because it improves access for workers and reduces long-term congestion costs.';
    guide.exampleB =
      'One practical reason is reliability: after one district added bus-only lanes, average commute delays fell by 18% during peak hours.';
    guide.prompt =
      'Some people think governments should spend more on public transport than on new roads. To what extent do you agree or disagree?';
    guide.answers = [
      'A strong introduction makes the position visible immediately.',
      'Each body paragraph should carry one reason and then prove it.',
      'The conclusion should repeat the same position, not change it.',
    ];
    guide.checks = [
      'Can the examiner see my exact opinion by the end of the introduction?',
      'Does each body paragraph support only one main reason?',
      'Did I include at least one specific example or explanation?',
      'Does the conclusion repeat the position without introducing a new point?',
    ];
  } else if (family === 'discussion-essay') {
    guide.explanation =
      'Discussion essays require balance, but balance does not mean vagueness. You need to explain both views clearly, then show where you stand and why. Strong responses show fair coverage of the two sides plus a controlled personal position.';
    guide.use =
      'Use this approach when the task asks you to discuss both views and give your opinion. The safest structure is introduction, one paragraph for view A, one paragraph for view B plus your position, and a conclusion. Do not hide your view until the final line.';
    guide.steps = [
      'Separate the two views before you start drafting.',
      'Give each view its own paragraph or paragraph section.',
      'Signal your own position clearly in the introduction and conclusion.',
      'Use comparison language to show how the views differ.',
      'Keep your examples attached to the correct side of the argument.',
    ];
    guide.exampleA =
      'Some people argue that private cars give families flexibility, while others believe public transport should receive more funding.';
    guide.exampleB =
      'Although both views have logic, I believe public transport investment is the better long-term choice because it improves access for more people.';
    guide.prompt =
      'Some people believe students should study only their main subjects, while others think they should learn a wide range of subjects. Discuss both views and give your opinion.';
    guide.answers = [
      'Show both views accurately before pushing your own preference.',
      'Use clear comparison words such as while, whereas, and however.',
      'Make your own position visible, not implied.',
    ];
    guide.checks = [
      'Did I cover both views fairly?',
      'Can the reader identify my own position easily?',
      'Are my examples attached to the right side of the discussion?',
      'Does the conclusion repeat my view clearly?',
    ];
  } else if (family === 'advantages-disadvantages') {
    guide.explanation =
      'Advantage/disadvantage tasks need more than a list. Strong answers identify the major positive and negative effects, then make an overall judgment about which side matters more or in what conditions one side outweighs the other.';
    guide.use =
      'Use this approach when the task asks about benefits and drawbacks or positive and negative sides. Group related points together, then state an overall evaluation. If your conclusion does not weigh the two sides, the essay usually feels incomplete.';
    guide.steps = [
      'List the advantages and disadvantages separately before writing.',
      'Choose one or two major points on each side instead of many small ones.',
      'Explain the real effect of each point on people, systems, or outcomes.',
      'Use comparison language to weigh the two sides in the conclusion.',
      'Make your overall judgment explicit.',
    ];
    guide.exampleA = 'A major advantage of online learning is schedule flexibility for working students.';
    guide.exampleB =
      'However, one serious disadvantage is the weaker sense of accountability when learners study without regular supervision.';
    guide.prompt = 'What are the advantages and disadvantages of working from home?';
    guide.answers = [
      'Group similar ideas instead of alternating one short pro and one short con.',
      'Explain impact, not just topic words.',
      'End with a clear judgment about which side matters more and why.',
    ];
    guide.checks = [
      'Did I explain at least one major advantage and one major disadvantage?',
      'Did I show the effect of each point clearly?',
      'Does my conclusion weigh the two sides instead of repeating them?',
      'Are my examples specific enough to support the comparison?',
    ];
  } else if (family === 'task1-maps') {
    guide.explanation =
      'Task 1 map reports are about change over time or between layouts. Strong responses group changes, highlight the biggest transformations, and use location language carefully. The overview should summarize the major pattern of change, not retell every detail.';
    guide.use =
      'Use this strategy for IELTS map comparison tasks. Start with an introduction that paraphrases the prompt, then write an overview that identifies the largest changes, such as expansion, replacement, or movement of features. Body paragraphs should group related changes by area or by type.';
    guide.steps = [
      'Scan the map and identify the two or three biggest overall changes.',
      'Write the overview before the detail paragraphs.',
      'Group details by area or transformation type instead of following the map randomly.',
      'Use comparison language such as was replaced by, expanded, converted into, and relocated.',
      'Check every location phrase so the reader can visualize the map accurately.',
    ];
    guide.exampleA =
      'Overall, the area became more residential, while several industrial features were removed or relocated.';
    guide.exampleB =
      'In the northern section, the old factory was replaced by a housing complex and a small parking area.';
    guide.prompt = 'Write an introduction and overview for a map that shows a town center in 2000 and 2025.';
    guide.answers = [
      'Your overview should mention the biggest layout changes, not minor details.',
      'Group details by area to avoid a random tour of the map.',
      'Use clear location phrases such as in the northern area, to the east of, and along the river.',
    ];
    guide.checks = [
      'Did I identify the biggest changes in the overview?',
      'Are the detail paragraphs grouped logically?',
      'Did I use accurate location language?',
      'Did I avoid opinion words and stay descriptive?',
    ];
  } else if (family === 'task1-process') {
    guide.explanation =
      'Process reports explain how something is produced, transformed, or completed in stages. The overview usually states how many stages there are, where the process starts, and what the end product is. Strong descriptions use sequencing language and often rely on passive voice because the action matters more than the agent.';
    guide.use =
      'Use this strategy for IELTS process diagrams. After the introduction, summarize the start and end of the process in the overview. In body paragraphs, describe the steps in sequence and group them if the process is long. Avoid adding opinions or reasons that the diagram does not show.';
    guide.steps = [
      'Identify the first stage, final stage, and overall number of stages.',
      'Write an overview with start-to-finish summary.',
      'Use sequencing words such as initially, next, after that, and finally.',
      'Prefer passive verbs when the actor is not important or not shown.',
      'Check that each stage appears once and in the correct order.',
    ];
    guide.exampleA =
      'Overall, the process begins with raw materials and ends with a packaged consumer product after six stages.';
    guide.exampleB =
      'Next, the mixture is heated, filtered, and transferred to a storage tank before packaging.';
    guide.prompt =
      'Write an overview and two sequencing sentences for a process that turns raw cocoa beans into chocolate.';
    guide.answers = [
      'Count stages and mention the start and end in the overview.',
      'Keep the order exact; do not jump forward and backward.',
      'Use process verbs such as is heated, is stored, and is delivered when the agent is unknown.',
    ];
    guide.checks = [
      'Did I mention the start and end of the process?',
      'Is the stage order accurate?',
      'Did I use sequencing language clearly?',
      'Did I avoid opinion or explanation not shown in the diagram?',
    ];
  } else if (family === 'email') {
    guide.explanation =
      'CELPIP email tasks reward completeness and tone control. The reader should understand why you are writing in the opening line, and every bullet point in the prompt should appear clearly in the body. Strong responses sound purposeful and polite without becoming stiff or repetitive.';
    guide.use =
      'Use this structure for CELPIP Writing Task 1 emails. Begin with greeting and purpose, then cover the prompt points in a logical order, and finish with an appropriate closing line. If one prompt bullet is missing, the email usually feels incomplete even if the language is accurate.';
    guide.steps = [
      'Underline the purpose and audience in the prompt.',
      'Write an opening line that states why you are writing.',
      'Turn each bullet point into one clear message block.',
      'Match the tone to the situation: polite, neutral, or warm but controlled.',
      'Check the closing line so it fits the relationship and request.',
    ];
    guide.exampleA =
      'I am writing to ask whether it would be possible to reschedule my appointment for next week.';
    guide.exampleB =
      'Thank you for considering my request. I would appreciate any available afternoon slot.';
    guide.prompt =
      'You missed a workshop because of illness. Write an email to the organizer asking for the materials and information about the next session.';
    guide.answers = [
      'Open with purpose, not with a long background story.',
      'Cover every prompt bullet clearly and directly.',
      'Keep requests polite and easy to understand.',
    ];
    guide.checks = [
      'Did I state my purpose in the first line?',
      'Did I answer every bullet in the prompt?',
      'Does the tone match the audience?',
      'Is the closing line suitable for the situation?',
    ];
  } else if (family === 'survey') {
    guide.explanation =
      'CELPIP survey responses are short argument tasks. The safest structure is a clear choice, two supporting reasons, and a brief acknowledgment of the other option if useful. Strong responses sound practical and specific rather than philosophical or abstract.';
    guide.use =
      'Use this approach for CELPIP survey prompts. State your choice in the opening sentence, then support it with real-life reasons or consequences. Avoid spending too much space summarizing both options equally because the task rewards a clear selection.';
    guide.steps = [
      'Choose one option and state it in the first sentence.',
      'Give two distinct reasons that support the choice.',
      'Add one concrete example or realistic consequence.',
      'Mention the weaker option only if it helps contrast your main point.',
      'Close with a short final sentence that confirms your preference.',
    ];
    guide.exampleA =
      'I would choose the public transport plan because it helps more residents on a daily basis.';
    guide.exampleB =
      'In addition, the benefits are long-term: lower congestion can improve punctuality for workers and students.';
    guide.prompt =
      'Your city can either build a new sports center or improve the public library system. Which option should it choose?';
    guide.answers = [
      'State the choice immediately.',
      'Make sure the two reasons are clearly different.',
      'Use one concrete example to show the real effect of your choice.',
    ];
    guide.checks = [
      'Did I choose one option in the first sentence?',
      'Are my two reasons clearly different?',
      'Did I include a concrete example or consequence?',
      'Does the final sentence confirm my choice clearly?',
    ];
  } else if (family === 'introduction') {
    guide.explanation =
      'Essay introductions should orient the reader quickly. A strong introduction paraphrases the topic safely, then gives a thesis or clear purpose line that predicts the essay. Students often lose marks by writing introductions that are too long, too general, or disconnected from the body paragraphs that follow.';
    guide.use =
      'Use this lesson when you want more control over essay openings. Keep the introduction short and functional. If the thesis does not predict the body, the whole essay will feel less organized.';
    guide.steps = [
      'Paraphrase the topic without changing the task meaning.',
      'Avoid dictionary-style definitions and broad background sentences.',
      'Write a thesis that shows your answer or essay direction clearly.',
      'Match the thesis to the number of body ideas you can actually develop.',
      'Read the introduction against the body plan before you continue.',
    ];
    guide.exampleA =
      'Many cities are debating whether public transport should receive more funding than private road expansion.';
    guide.exampleB =
      'This essay argues that transport budgets should prioritize buses and rail because they serve more residents and reduce congestion more effectively.';
    guide.prompt =
      'Write a two-sentence introduction for an essay about whether schools should replace printed textbooks with tablets.';
    guide.answers = [
      'Your paraphrase should stay accurate to the prompt.',
      'The thesis should show direction, not only the topic area.',
      'Keep the introduction compact enough to leave time for body development.',
    ];
    guide.checks = [
      'Did I paraphrase the topic safely?',
      'Does my thesis show the essay direction clearly?',
      'Can the body paragraphs naturally grow from this introduction?',
      'Is the introduction short enough for a timed task?',
    ];
  } else if (family === 'body-paragraphs') {
    guide.explanation =
      'Body paragraphs are where scores are won. Each paragraph should do one clear job: state a main point, explain it, and support it. When paragraphs combine too many reasons or move away from the thesis, the essay loses coherence even if the grammar is accurate.';
    guide.use =
      'Use this structure in IELTS and CELPIP essays whenever you need to develop a reason or viewpoint. Topic sentences should carry the main point, and supporting sentences should stay attached to that same idea.';
    guide.steps = [
      'Write a topic sentence that states one main reason.',
      'Explain why that reason matters in one or two sentences.',
      'Add a concrete example or realistic consequence.',
      'Close the paragraph by linking the evidence back to the main point.',
      'Cut any sentence that introduces a new reason.',
    ];
    guide.exampleA =
      'A major reason to improve public transport is that it increases access for workers who cannot afford private cars.';
    guide.exampleB =
      'For example, when one district expanded bus frequency, commute delays fell and attendance improved among shift workers.';
    guide.prompt =
      'Write one body paragraph that explains why school libraries still matter in the digital age.';
    guide.answers = [
      'Your first sentence should carry one main reason.',
      'The example should prove that reason, not introduce a new one.',
      'The paragraph should finish with the same idea it started with.',
    ];
    guide.checks = [
      'Does the paragraph have one main reason only?',
      'Did I explain why the reason matters?',
      'Did I add a concrete example or consequence?',
      'Could I remove any sentence without losing the main idea?',
    ];
  } else if (family === 'conclusion') {
    guide.explanation =
      'Strong conclusions restate the main position or judgment in a fresh but controlled way. They remind the reader of the central message and close the task efficiently. Weak conclusions either repeat the introduction word for word, add a new major point, or become too general.';
    guide.use =
      'Use this lesson when you want better closure in essays and survey responses. A conclusion usually needs only one or two sentences. The key is to restate the thesis and summarize the strongest supporting message without reopening the argument.';
    guide.steps = [
      'Restate the main position using different wording.',
      'Summarize the central reason or judgment briefly.',
      'Do not introduce a new argument or example.',
      'Keep the tone firm and final.',
      'Check that the conclusion still matches the exact opinion in the introduction.',
    ];
    guide.exampleA =
      'In conclusion, transport budgets should focus more on public systems because they improve access for more residents and reduce long-term congestion.';
    guide.exampleB =
      'Overall, although road expansion may help in the short term, stronger public transport offers broader and more sustainable benefits.';
    guide.prompt =
      'Write a one- or two-sentence conclusion for an essay arguing that online learning should complement, not replace, classroom teaching.';
    guide.answers = [
      'Restate the position; do not reopen the debate.',
      'Keep the wording fresh but the meaning stable.',
      'A short, controlled conclusion is stronger than a long repetitive one.',
    ];
    guide.checks = [
      'Did I restate the exact essay position?',
      'Did I avoid new examples or arguments?',
      'Does the conclusion sound final and controlled?',
      'Is it short enough for a timed essay?',
    ];
  }

  const errors = [
    {
      error: 'starting to write before deciding the task purpose',
      weak: 'This issue is important and has many sides.',
      strong: 'This essay argues that better transit investment improves daily life for workers.',
      fix: 'Write one clear task sentence before the first full paragraph.',
    },
    {
      error: 'using examples that are too general to prove the point',
      weak: 'Many places improved after changes were made.',
      strong: 'One district reduced response times by 18% after introducing coordinated service planning.',
      fix: 'Add a place, group, time, or measured result.',
    },
    {
      error: 'losing paragraph control by adding every idea at once',
      weak: 'The policy is good, bad, expensive, helpful, and important for many people for many reasons.',
      strong: 'The policy is expensive at first; however, it improves reliability for daily commuters.',
      fix: 'Give each paragraph one job and one main idea.',
    },
  ];

  return `${renderTeachingSection({
    lead: 'This lesson focuses on one writing move that changes clarity and score at the same time.',
    definition: guide.explanation,
    use: guide.use,
    levelNote: `At ${level} level, stronger writing comes from better paragraph control, not from simply making the language longer.`,
    useBullets: [
      'Start by identifying the exact job of the task or paragraph.',
      'Keep support specific enough to prove the point rather than decorate it.',
      'Check that every sentence moves the response toward its purpose.',
    ],
    modelPatterns: [guide.exampleA, guide.exampleB],
    rememberBullets: guide.steps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: 'This topic is important and has many effects.',
      strong: guide.exampleA,
      why: 'The stronger sentence gives the paragraph a clear direction.',
    },
    {
      weak: 'I think this is good and bad in many ways.',
      strong: guide.exampleB,
      why: 'The better version develops the idea instead of circling around it.',
    },
  ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, errors)}

${buildSkillPracticeLab({
    topic,
    intro: 'Begin with purpose. Then check the order and cut anything that does not help the paragraph.',
    coach: 'If a sentence has no clear job, it should change or disappear.',
    strongSentence: guide.exampleA,
    comparisonSentence: guide.exampleB,
    steps: guide.steps,
    negatives: [
      'Add a new reason in the middle of the paragraph to sound richer.',
      'Use a broad example even when it does not prove the point clearly.',
    ],
  })}

${renderLessonSupportSection('Best when you need detailed scoring guidance on clarity, cohesion, evidence use, and task achievement.')}`;
}

function speakingBodyEnhanced(topic, level, examText) {
  const ctx = contextFromTopic(topic);
  const family = detectTopicFamily('speaking', topic);
  const guide = {
    explanation:
      'This speaking skill helps you sound organized under time pressure. Clear answers usually follow a simple pattern: direct response, one reason, one example, short conclusion. Even when the topic is unfamiliar, that pattern helps you stay fluent and focused.',
    use:
      'Use this lesson whenever you need a more reliable way to build spoken responses. Focus on structure first, then on vocabulary and style. A controlled simple answer is better than a long answer with weak logic.',
    steps: [
      'Answer directly in the first sentence.',
      'Add one clear reason.',
      'Support it with one example or consequence.',
      'Use one short linker if it helps the flow.',
      'Finish with a short closing message.',
    ],
    exampleA: `I think this approach is useful because ${ctx.claim.charAt(0).toLowerCase()}${ctx.claim.slice(1)}`,
    exampleB: `For example, ${ctx.detail.charAt(0).toLowerCase()}${ctx.detail.slice(1)}`,
    prompt: ctx.prompt,
    answers: [
      'A clear opening answer gives the response direction immediately.',
      'One reason plus one example is a safe baseline.',
      'Short, accurate language often sounds stronger than complex hesitant language.',
    ],
    checks: [
      'Did I answer directly?',
      'Did I add one reason and one example?',
      'Did I stay on topic?',
      'Did I close the answer clearly?',
    ],
  };

  if (family === 'clarification') {
    guide.explanation =
      'Clarification is a recovery skill. In speaking tests, you sometimes need the examiner to repeat or confirm a word, but you must do it briefly and naturally. Strong speakers use one short phrase, recover quickly, and keep their answer moving.';
    guide.use =
      'Use clarification language only when you genuinely need it. Good repair phrases are short, polite, and functional. They help you buy a little time while staying within a natural conversation style.';
    guide.steps = [
      'Use one short clarification phrase instead of a long apology.',
      'Confirm the key word or instruction you missed.',
      'Restart with a direct answer once the meaning is clear.',
      'Keep your voice steady and natural.',
      'Practice recovery so the repair sounds normal, not memorized.',
    ];
    guide.exampleA = 'Sorry, could you repeat the last part of the question?';
    guide.exampleB = 'If you mean public transport, I would say it should receive more funding.';
    guide.prompt = 'What do you usually do if you do not understand part of a speaking question?';
    guide.answers = [
      'A good clarification phrase is short, polite, and specific.',
      'The next sentence should return to the answer quickly.',
      'Do not use clarification as a way to avoid the question.',
    ];
    guide.checks = [
      'Is my clarification phrase short and natural?',
      'Do I return to the answer immediately after the repair?',
      'Does my tone stay calm?',
      'Can I do this without sounding memorized?',
    ];
  } else if (family === 'confidence') {
    guide.explanation =
      'Confidence in speaking is usually a structure problem, not a personality problem. When you know how to start, extend, and finish an answer, you sound more secure even if you still feel nervous. Small planning routines reduce hesitation and help you stay focused.';
    guide.use =
      'Use this lesson when nerves make your answers short or disorganized. Build one repeatable response frame and practice it with easy prompts first. The goal is controlled fluency, not perfect performance.';
    guide.steps = [
      'Start with one direct answer sentence.',
      'Add one reason and one example.',
      'Use a simple breathing pause instead of filler noise.',
      'Finish with a short closing sentence.',
      'Repeat the same frame with different prompts until it feels automatic.',
    ];
    guide.exampleA = 'Yes, I do, mainly because reliable transport saves time during the workweek.';
    guide.exampleB = 'For example, when the bus arrives on time, I can reach my office without extra stress.';
    guide.answers = [
      'Direct answer first, then reason, then example is a safe confidence frame.',
      'Short pauses are better than filler words.',
      'You do not need advanced vocabulary to sound confident; you need control.',
    ];
    guide.checks = [
      'Did I answer directly in the first sentence?',
      'Did I add a reason and an example?',
      'Did I use pauses instead of filler sounds?',
      'Did I end clearly instead of fading out?',
    ];
  } else if (family === 'fluency') {
    guide.explanation =
      'Fluency is not about speaking without stopping; it is about moving from one idea to the next smoothly and clearly. Useful linking phrases help you connect ideas, while empty filler words usually weaken the answer.';
    guide.use =
      'Use linking phrases to buy time while still adding meaning. Phrases like first of all, for example, the main reason is, and overall help you move through the answer without random repetition. Keep them short and purposeful.';
    guide.steps = [
      'Answer the question first before using any linker.',
      'Use one linker to add a reason and one to add an example.',
      'Replace empty filler words with short meaningful phrases.',
      'Keep sentence length manageable so fluency stays stable.',
      'Finish with a short summary line.',
    ];
    guide.exampleA = 'First of all, I support the idea because it improves reliability for daily commuters.';
    guide.exampleB = 'For example, one new bus lane in my area reduced delays during rush hour.';
    guide.answers = [
      'Good linkers connect real ideas; they do not just fill silence.',
      'A direct opening makes the whole answer sound more fluent.',
      'Use one example to extend the answer naturally.',
    ];
    guide.checks = [
      'Did I answer before linking?',
      'Did each linker add a real function?',
      'Did I avoid empty filler repetition?',
      'Did I close the answer clearly?',
    ];
  } else if (family === 'part1') {
    guide.explanation =
      'Speaking Part 1 answers should sound personal, natural, and controlled. The best responses are usually short: direct answer, one supporting detail, and maybe one brief example. Long introductions or memorized general statements make Part 1 sound unnatural quickly.';
    guide.use =
      'Use this lesson for short personal questions about daily life, study, work, hobbies, and routine preferences. Keep the language specific to you. The goal is to sound natural and easy to talk to, not to sound like a formal essay.';
    guide.steps = [
      'Answer the question in the first sentence.',
      'Add one personal reason or example.',
      'Keep the language natural and specific.',
      'Avoid memorized topic blocks.',
      'Stop after the answer feels complete.',
    ];
    guide.exampleA = 'Yes, I do. I usually take the bus because parking near my office is expensive.';
    guide.exampleB = 'Not really. I prefer reading at home because it helps me relax after work.';
    guide.prompt = 'Do you prefer studying alone or with other people?';
    guide.answers = [
      'A clear personal answer is better than a generic speech.',
      'One supporting detail is usually enough for Part 1.',
      'Natural specificity sounds stronger than memorized phrases.',
    ];
    guide.checks = [
      'Did I answer directly in the first sentence?',
      'Did I add one personal detail?',
      'Did I keep the response short enough for Part 1?',
      'Does it sound like a real conversation answer?',
    ];
  } else if (family === 'part2' || family === 'experience') {
    guide.explanation =
      'Long-turn speaking tasks become easier when you treat them like simple stories with clear content points. A speaker who has three clear story points can usually speak for the full time more naturally than someone who tries to memorize a script.';
    guide.use =
      'Use this structure for cue cards and experience tasks. During planning time, write short notes for beginning, middle, and end, or for three clear content points. Then speak in order and add one specific detail to each point.';
    guide.steps = [
      'Use preparation time to choose three content points.',
      'Start with a simple context sentence: when, where, or what.',
      'Move through the points in a clear sequence.',
      'Add one specific detail to each point.',
      'Finish with why the experience or topic mattered.',
    ];
    guide.exampleA = 'I would like to describe a community festival I attended last summer in my neighborhood park.';
    guide.exampleB = 'What made it memorable was not only the music but also the way local families worked together to organize the event.';
    guide.prompt = 'Describe a place in your city that you enjoy visiting.';
    guide.answers = [
      'Three planned content points are usually enough for a full answer.',
      'Specific detail helps you keep speaking without repeating yourself.',
      'A final reflection helps the answer sound finished.',
    ];
    guide.checks = [
      'Did I plan three content points before speaking?',
      'Did I move through them in a clear order?',
      'Did I add specific detail instead of repeating the same idea?',
      'Did I finish with a closing thought?',
    ];
  } else if (family === 'part3' || family === 'speaking-opinion') {
    guide.explanation =
      'Abstract or opinion speaking tasks reward speed of decision and organized support. A strong answer states the opinion early, gives one or two reasons, and adds a concrete example. Long introductions and repeated general statements usually weaken fluency and content at the same time.';
    guide.use =
      'Use this lesson for Part 3 and opinion tasks. The safest frame is answer, reason, example, wider comment or close. This keeps the response focused and makes it easier to fill the time naturally.';
    guide.steps = [
      'State your choice or opinion in the first sentence.',
      'Add one strong reason immediately.',
      'Support it with one example, comparison, or consequence.',
      'If time remains, widen the answer with a broader comment.',
      'Finish with a one-sentence summary of your view.',
    ];
    guide.exampleA = 'I support investing more in public transport because it helps a larger number of people every day.';
    guide.exampleB = 'For example, better bus service can reduce commuting stress for workers who do not own cars.';
    guide.answers = [
      'A clear opening opinion makes the whole response easier to build.',
      'One developed reason is stronger than several vague points.',
      'A short concluding sentence helps the answer sound complete.',
    ];
    guide.checks = [
      'Did I state my opinion immediately?',
      'Did I support it with at least one reason and one example?',
      'Did I stay on one clear line of thought?',
      'Did I close the answer cleanly?',
    ];
  } else if (family === 'pronunciation') {
    guide.explanation =
      'Pronunciation for exams is about intelligibility, not accent imitation. Listeners need to hear word stress, sentence stress, and clear chunk boundaries so they can process your ideas quickly. Problems usually come from flat rhythm, missing endings, or unclear linking between words.';
    guide.use =
      'Use this lesson when people understand your grammar on paper but struggle to follow you in speech. Practice small chunks, stressed keywords, and sentence endings. Recording yourself is one of the fastest ways to hear where your speech becomes unclear.';
    guide.steps = [
      'Mark the key stress in important words and phrases.',
      'Break long answers into short spoken chunks.',
      'Keep final consonants and grammar endings audible.',
      'Use rising and falling intonation to show meaning, not randomness.',
      'Record, listen, and repeat one short answer until it sounds clearer.',
    ];
    guide.exampleA = 'PUBLIC transport should receive MORE funding than new ROADS.';
    guide.exampleB = 'I LIKE it because it SAVES time and MAKES daily life EASier.';
    guide.prompt = 'Record yourself answering a 30-second question and mark the stressed words.';
    guide.answers = [
      'Stressed keywords carry the main meaning of the sentence.',
      'Chunking reduces breath problems and improves clarity.',
      'Pronunciation practice works best with short recordings and repetition.',
    ];
    guide.checks = [
      'Did I stress the key words?',
      'Did I speak in chunks rather than one long rush?',
      'Could a listener hear my sentence endings clearly?',
      'Did I record and listen back at least once?',
    ];
  }

  const errors = [
    {
      error: 'delaying the direct answer',
      weak: 'Well, there are many sides to this question and it is hard to say.',
      strong: guide.exampleA,
      fix: 'Answer first, then extend.',
    },
    {
      error: 'using fillers instead of content',
      weak: 'Like, you know, it is good because it is good for people.',
      strong: guide.exampleB,
      fix: 'Replace filler with one real reason or detail.',
    },
    {
      error: 'finishing without a clear final line',
      weak: 'So yes, maybe, that is my idea.',
      strong: 'Overall, that is why I think this option is more practical.',
      fix: 'Prepare one short closing sentence you can use naturally.',
    },
  ];

  return `${renderTeachingSection({
    lead: 'This lesson helps you sound organized without sounding memorized.',
    definition: guide.explanation,
    use: guide.use,
    levelNote: `At ${level} level, speaking improves when your answer pattern is stable and easy to repeat under time pressure.`,
    useBullets: [
      'Give a direct answer before adding background.',
      'Extend with one reason, detail, or example at a time.',
      'Use short signposts only when they help the listener follow the answer.',
    ],
    modelPatterns: [guide.exampleA, guide.exampleB],
    rememberBullets: guide.steps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: 'Well, there are many perspectives and many factors, and in my opinion this topic is complex.',
      strong: guide.exampleA,
      why: 'The better answer starts doing the real speaking job immediately.',
    },
    {
      weak: 'It is good, and also, like, there are many reasons, and yes, that is all.',
      strong: guide.exampleB,
      why: 'The stronger sentence adds meaning instead of filler.',
    },
  ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, errors)}

${buildSkillPracticeLab({
    topic,
    intro: 'Start with the opening move, then check the answer shape from start to finish.',
    coach: 'If a line does not add meaning, cut it and replace it with one clear reason or example.',
    strongSentence: guide.exampleA,
    comparisonSentence: guide.exampleB,
    weakSentence: 'Talk around the question first and hope the listener finds your point.',
    weakComparison: 'It is good and there are many reasons, and that is all.',
    steps: guide.steps,
    negatives: [
      'Keep talking around the topic until an answer appears.',
      'Use fillers because they sound more natural than silence.',
    ],
  })}

${renderLessonSupportSection('Best when you need speaking-specific feedback on fluency, coherence, grammar range, and lexical resource.')}`;
}

function listeningBody(topic, level, examText) {
  const family = detectTopicFamily('listening', topic);
  const guide = family === 'note-taking'
    ? {
        explanation:
          'Effective listening notes are short, fast, and selective. In listening tasks, full sentences slow you down and make you miss the next idea. A symbol system lets you record key content such as direction changes, numbers, speaker attitudes, and compare/contrast points while your attention stays on the audio.',
        use:
          'Use symbols, arrows, abbreviations, and short nouns rather than complete grammar. The best notes capture information that disappears quickly: dates, prices, opinions, changes, and conditions.',
        steps: [
          'Prepare a small symbol system before practice starts.',
          'Listen for question focus and key categories such as time, price, opinion, or problem.',
          'Write only keywords, initials, numbers, and arrows.',
          'Mark contrast or correction signals such as but, however, actually, and instead.',
          'Use the notes to confirm the answer, not to guess beyond the audio.',
        ],
        exampleA: 'meet 3pm -> 4pm / rm B / prof late',
        exampleB: 'plan A x / instead bus + taxi / cost $18',
        prompt: 'Listen to a short talk and take notes using only keywords and symbols.',
        answers: [
          'Keyword notes are better than full sentences because they protect attention.',
          'Symbol systems work best when they are small and consistent.',
          'Correction signals are high-value because answers often change after them.',
        ],
        checks: [
          'Did I use symbols instead of full sentences?',
          'Did I capture names, numbers, and changes?',
          'Did I mark contrast or correction signals?',
          'Could I still understand my notes after the audio ended?',
        ],
      }
    : family === 'predicting'
      ? {
          explanation:
            'Prediction is a listening preparation skill. Before the audio begins, the question usually tells you what type of information to expect: a reason, a number, a location, a problem, or an opinion. When you predict the information type, your attention becomes more selective.',
          use:
            'Use prediction during the short reading time before the audio. Underline key nouns, identify likely synonyms, and guess the information type. This does not mean choosing the answer early; it means preparing your brain to notice the right part of the audio when it arrives.',
          steps: [
            'Read the question and answer choices before the audio begins.',
            'Underline the key nouns and verbs.',
            'Predict likely synonyms or paraphrases you may hear.',
            'Decide what information type the answer probably is.',
            'Listen for the relevant section instead of trying to memorize everything.',
          ],
          exampleA: 'Question asks about cost -> expect number, money word, or price comparison.',
          exampleB: 'Question asks why someone changed plans -> expect reason language such as because or the problem was.',
          prompt: 'Before listening, predict the likely answer type for three sample questions.',
          answers: [
            'Prediction is about readiness, not guessing the final answer too early.',
            'Synonym prediction helps because the audio rarely repeats the question words exactly.',
            'Information-type prediction narrows your listening focus.',
          ],
          checks: [
            'Did I identify the information type before listening?',
            'Did I predict a few likely paraphrases?',
            'Did I use the question to focus my attention?',
            'Did I stay ready to change my first expectation when the audio gave new evidence?',
          ],
        }
      : {
          explanation:
            'Missing one detail is normal in listening tasks. The danger comes when you keep thinking about the missed word and stop following the next part of the audio. Strong listeners recover by returning to the main idea, tracking signpost words, and using later clarification or repetition to rebuild the missing information.',
          use:
            'Use recovery strategies whenever the audio feels too fast or one item is unclear. Listen for contrast words, repetition, examples, and corrections because speakers often restate the point in a simpler way.',
          steps: [
            'Accept the missed detail quickly and keep listening.',
            'Listen for signposts such as however, actually, because, and for example.',
            'Use later repetition or clarification to rebuild the idea.',
            'Match your notes to the question focus again.',
            'Guess only after you have used all later evidence in the audio.',
          ],
          exampleA: 'missed price -> keep listening -> speaker repeats “so it costs eighteen dollars in total”',
          exampleB: 'missed location -> hear later “that is why we moved it to Room B”',
          prompt: 'Practice listening to a short clip and intentionally let one detail go so you can train recovery.',
          answers: [
            'Recovery works when you stay with the audio instead of replaying the missed word in your head.',
            'Later evidence often repairs what you missed earlier.',
            'Signpost language helps you find the relevant section again.',
          ],
          checks: [
            'Did I stay with the audio after missing a detail?',
            'Did I listen for signposts and repetition?',
            'Did I reconnect the information to the question focus?',
            'Did I delay guessing until after listening for later evidence?',
          ],
        };

  const listeningErrors = [
    {
      error: 'trying to catch every word instead of the answer focus',
      weak: 'I write everything I hear, so I miss the next sentence.',
      strong: 'I track only the key information linked to the question.',
      fix: 'Use the question to decide what matters most.',
    },
    {
      error: 'panicking after one missed detail',
      weak: 'I stop following the audio because of one unknown word.',
      strong: 'I let the missed word go and listen for the next signpost or repetition.',
      fix: 'Stay with the message and recover from later evidence.',
    },
    {
      error: 'using notes that are too long to read back quickly',
      weak: 'I write complete sentences that I cannot process in time.',
      strong: 'I use short keywords, arrows, numbers, and contrast markers.',
      fix: 'Make notes usable, not beautiful.',
    },
  ];

  return `${renderTeachingSection({
    lead: 'This lesson gives you one listening habit you can use before, during, and after the audio.',
    definition: guide.explanation,
    use: guide.use,
    levelNote: `At ${level} level, listening gains usually come from better attention control, not from trying to hear every word.`,
    useBullets: [
      'Read the question quickly before the audio whenever the task allows it.',
      'Decide what information matters most for that item.',
      'Stay with the message instead of fighting for every missed word.',
    ],
    modelPatterns: [guide.exampleA, guide.exampleB],
    rememberBullets: guide.steps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: 'I try to hear every word and write full sentences while the speaker continues.',
      strong: 'I focus on the question type, track the signal words, and capture only the information I need.',
      why: 'The stronger strategy protects attention and improves answer accuracy.',
    },
    {
      weak: 'When I miss one detail, I keep thinking about it and miss the next answer too.',
      strong: 'When I miss one detail, I stay with the audio and wait for the next clear signal or repetition.',
      why: 'Recovery is built into the strategy instead of being treated like failure.',
    },
  ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, listeningErrors)}

${buildSkillPracticeLab({
    topic,
    intro: 'First notice what matters. Then check your sequence and your recovery habits.',
    coach: 'The question should control your attention. If it does not, the audio will feel harder than it really is.',
    strongSentence: 'I focus on the question type, track the signal words, and capture only the information I need.',
    comparisonSentence: 'When I miss one detail, I stay with the audio and wait for the next clear signal or repetition.',
    weakSentence: 'I try to write everything because more notes always means better listening.',
    weakComparison: 'If I miss one word, I stop and think about it until I understand it.',
    steps: guide.steps,
    negatives: [
      'Write every word because more notes always mean better listening.',
      'Replay the missed word in your head even if the speaker has moved on.',
    ],
  })}

${renderLessonSupportSection('Best when you need guided feedback on listening habits, task strategy, and exam accuracy.')}`;
}

function readingBody(topic, level, examText) {
  const family = detectTopicFamily('reading', topic);
  const guide = family === 'time-management'
    ? {
        explanation:
          'Reading time management is a scoring skill, not just a comfort skill. Many candidates can answer the questions, but they lose marks because they stay too long on one difficult item and rush the final section. A better approach is to budget time by question type, skip strategically, and return only when the time plan allows it.',
        use:
          'Use this lesson where question types create different workloads. Easy direct items should be answered quickly, while inference or matching tasks may need a bit more time. The key is to protect the whole section instead of trying to win every item immediately.',
        steps: [
          'Set a rough time budget for each passage or question set before starting.',
          'Answer direct easy questions quickly to secure marks early.',
          'Mark difficult items and move on if they exceed the time limit.',
          'Return only after finishing the easier remaining questions.',
          'Keep the final minutes for review, not for starting the last section in panic.',
        ],
        exampleA: 'Direct factual question: answer in under 40 seconds if the proof is clear.',
        exampleB: 'Matching or inference item: set a limit, then skip and return instead of freezing.',
        prompt: 'Create a time plan for a reading section with easy direct questions and slower inference questions.',
        answers: [
          'The goal is steady marks across the whole section, not perfection on one hard item.',
          'Skipping strategically protects time for easier questions.',
          'Review time is useful only if you have finished the section first.',
        ],
        checks: [
          'Did I set a time budget before starting?',
          'Did I protect time for easier direct questions?',
          'Did I skip and return instead of freezing on one item?',
          'Did I leave time for a final check?',
        ],
      }
    : {
        explanation:
          'Reading traps often appear when a word in the question also appears in the text. That feels safe, but the surrounding sentence may actually give a different meaning. Strong readers look for proof, not just matching vocabulary. Proof usually comes from the whole sentence or nearby lines, not from one repeated word.',
        use:
          'Use this strategy whenever answer options look familiar too quickly. After spotting a possible location, read the sentence around it and ask what the text really says. That extra check prevents many keyword-match mistakes, especially in inference and detail questions.',
        steps: [
          'Use keywords only to locate the likely area of the text.',
          'Read the sentence and nearby lines for the full meaning.',
          'Check whether the text actually proves the answer choice.',
          'Watch for contrast words that reverse or limit the meaning.',
          'Choose the option only after you can explain the proof in your own words.',
        ],
        exampleA: 'Question says “main reason”; text repeats the keyword but actually gives an example, not the reason.',
        exampleB: 'Question says “not recommended”; text contains the keyword recommended but the sentence is a warning, so the answer changes.',
        prompt: 'Practice with three question-text pairs and underline the exact proof, not only the shared keyword.',
        answers: [
          'Keywords help you find the place, but proof comes from full meaning.',
          'Contrast words like however, although, and except often change the answer.',
          'If you cannot paraphrase the proof, you may not have the right answer yet.',
        ],
        checks: [
          'Did I use the keyword only to locate the text?',
          'Did I read enough around the keyword to confirm meaning?',
          'Did I check for contrast or limitation words?',
          'Can I explain the proof in my own words?',
        ],
      };

  const readingErrors = [
    {
      error: 'trusting keyword match without checking meaning',
      weak: 'The same word appears, so this must be the answer.',
      strong: 'The same word helps me find the place, but I still need proof from the sentence.',
      fix: 'Separate locating from proving.',
    },
    {
      error: 'rereading too much without a question focus',
      weak: 'I read the whole passage again because I feel unsure.',
      strong: 'I return to the exact area linked to the question and re-check the evidence there.',
      fix: 'Let the question decide where your attention goes.',
    },
    {
      error: 'letting one hard item control the clock',
      weak: 'I stay until I solve the hardest question first.',
      strong: 'I set a limit, move on, and return after the easier marks are secure.',
      fix: 'Manage time for total score, not for one item.',
    },
  ];

  return `${renderTeachingSection({
    lead: 'This lesson focuses on one reading decision that can save marks right away.',
    definition: guide.explanation,
    use: guide.use,
    levelNote: `At ${level} level, reading gains often come from better proof-checking and time control, not only from vocabulary.`,
    useBullets: [
      'Start from the question, not from a full reread of the passage.',
      'Use the text to prove the answer, not only to locate a keyword.',
      'Protect your time so one hard item does not damage the full section.',
    ],
    modelPatterns: [guide.exampleA, guide.exampleB],
    rememberBullets: guide.steps,
  })}

${renderExampleCardsSection(`Real-World Examples with ${topic}`, [
    {
      weak: 'I saw the same word in the passage, so I chose that option immediately.',
      strong: 'I used the keyword to find the area, then checked the sentence that actually proved the answer.',
      why: 'The answer comes from evidence, not from recognition alone.',
    },
    {
      weak: 'I spent too long on one difficult item and had to rush the last questions.',
      strong: 'I used a time limit, skipped when necessary, and returned after securing easier marks.',
      why: 'The stronger method protects the whole section.',
    },
  ])}

${renderVisibleErrorSection(`Common Errors with ${topic}`, readingErrors)}

${buildSkillPracticeLab({
    topic,
    intro: 'Start by finding proof. Then check your reading sequence and your timing decisions.',
    coach: 'A repeated keyword is only a map. The answer still needs proof.',
    strongSentence: 'I used the keyword to find the area, then checked the sentence that actually proved the answer.',
    comparisonSentence: 'I used a time limit, skipped when necessary, and returned after securing easier marks.',
    weakSentence: 'I saw the same word, so I chose that answer immediately.',
    weakComparison: 'I stayed on one hard question because solving it first felt efficient.',
    steps: guide.steps,
    negatives: [
      'Choose the answer as soon as you spot one familiar word.',
      'Stay on the hardest item first because solving it feels efficient.',
    ],
  })}

${renderLessonSupportSection('Best when you need guided feedback on reading accuracy, proof-finding, and timed section control.')}`;
}

function decorateLessonBody(body) {
  const quizItems = [];
  let next = body
    .replace(/Real-world weak:/g, 'Weak:')
    .replace(/Real-world better:/g, 'Strong:')
    .replace(/-\s+Weaker:/g, '- Weak:')
    .replace(/-\s+Better:/g, '- Strong:');

  const normalizeTopLevelSections = (text) => {
    const headingPattern = /^##\s+([^\r\n]+)\r?\n/gm;
    const matches = [...text.matchAll(headingPattern)];
    if (matches.length === 0) return text;

    const prefix = text.slice(0, matches[0].index).trim();
    const sections = matches.map((m, idx) => {
      const heading = (m[1] || '').trim();
      const from = (m.index ?? 0) + m[0].length;
      const to = idx < matches.length - 1 ? (matches[idx + 1].index ?? text.length) : text.length;
      const content = text.slice(from, to).trim();
      return { heading, content };
    });

    const topicIdx = sections.findIndex((s) => s.heading === 'Topic Explanation and Use');
    const whatIdx = sections.findIndex((s) => /^What\b/i.test(s.heading));
    const keyIdx = sections.findIndex((s) => s.heading === 'Key Rule in Plain Language');

    if (topicIdx !== -1) {
      const merged = [];
      if (whatIdx !== -1 && sections[whatIdx].content) {
        merged.push(sections[whatIdx].content);
      }
      if (sections[topicIdx].content) {
        merged.push(sections[topicIdx].content);
      }
      if (keyIdx !== -1 && sections[keyIdx].content) {
        const steps = sections[keyIdx].content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .map((line) => {
            const m = line.match(/^\d+\.\s+(.+)$/);
            return m ? m[1].trim() : '';
          })
          .filter(Boolean);
        if (steps.length > 0) {
          merged.push(`Keep these rules in mind:\n${steps.map((step) => `- ${step}`).join('\n')}`);
        }
      }
      sections[topicIdx].content = merged.filter(Boolean).join('\n\n').trim();
    }

    const filtered = sections.filter((s) => {
      if (s.heading === 'Goal') return false;
      if (/^What\b/i.test(s.heading)) return false;
      if (s.heading === 'Key Rule in Plain Language') return false;
      return true;
    });

    const rebuilt = filtered
      .map((s) => `## ${s.heading}\n${s.content}`.trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (prefix && rebuilt) return `${prefix}\n\n${rebuilt}`;
    return rebuilt || text;
  };

  next = normalizeTopLevelSections(next);

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

    next = next.replace(/\n## (?:Want Personalized Score Feedback\?|Get Feedback)\b/m, `\n${checkpoint}\n## Get Feedback`);
  }

  next = next.replace(/^## Want Personalized Score Feedback\?$/gm, '## Get Feedback');

  return next;
}

function buildBody(category, topic, level, examText) {
  let body = '';
  if (category === 'grammar') body = grammarBody(topic, level, examText);
  else if (category === 'vocabulary') body = vocabularyBody(topic, level, examText);
  else if (category === 'writing' && /(semicolon|semicolons|colon|colons)/i.test(topic)) {
    body = writingBody(topic, level, examText);
  } else if (category === 'writing') body = writingBodyEnhanced(topic, level, examText);
  else if (category === 'speaking') body = speakingBodyEnhanced(topic, level, examText);
  else if (category === 'listening') body = listeningBody(topic, level, examText);
  else if (category === 'reading') body = readingBody(topic, level, examText);
  else body = writingBodyEnhanced(topic, level, examText);
  return decorateLessonBody(body);
}

function buildLessonMetadata(category, topic, level, examText) {
  const family = detectTopicFamily(category, topic);
  const defaultMeta = {
    excerpt: `${level} lesson on ${topic} with teacher-style explanation, guided practice, and topic-linked review.`,
    heroTip: 'Say the rule or strategy in plain English before you edit your answer.',
    visualAids: ['Pattern map', 'Worked example pair', 'Final self-check list'],
    quiz: [
      {
        prompt: `What is the main goal of this lesson on ${topic}?`,
        options: [
          'To build clear, usable control of the skill',
          'To memorize long difficult sentences only',
          'To avoid practice and rely on guessing',
        ],
        correctIndex: 0,
        explanation: 'The lesson is designed to build usable control, not passive recognition.',
      },
      {
        prompt: 'What should you do right after the explanation?',
        options: [
          'Try one guided task and then check your answer',
          'Leave the lesson immediately',
          'Memorize one sentence only and stop',
        ],
        correctIndex: 0,
        explanation: 'Short practice plus review is what turns explanation into usable skill.',
      },
      {
        prompt: 'What usually makes practice more useful?',
        options: [
          'Specific checking after the first attempt',
          'Random complexity with no plan',
          'Ignoring mistakes after writing',
        ],
        correctIndex: 0,
        explanation: 'Practice becomes useful when you check what changed after the first attempt.',
      },
    ],
  };

  if (category === 'grammar') {
    const pack = pickGrammarPackEnhanced(topic);
    const focusTerm = grammarFocusTerm(topic);
    const metaByFamily = {
      articles: {
        excerpt: `Learn when to use ${focusTerm} for new, specific, and general nouns without guessing.`,
        heroTip: 'Stop before each noun and ask two questions: is it countable, and is it already known?',
        visualAids: ['Article decision flowchart', 'New vs known noun examples', 'A/an sound check'],
      },
      'questions-word-order': {
        excerpt: 'Build correct English questions by controlling auxiliaries, inversion, and tag patterns.',
        heroTip: 'Find the auxiliary first. If you cannot find one, your question probably needs do, does, or did.',
        visualAids: ['Question word-order ladder', 'Auxiliary swap examples', 'Tag question matching chart'],
      },
      'relative-clauses': {
        excerpt: 'Use relative clauses to add detail without repeating the subject or losing clarity.',
        heroTip: 'Underline the noun you are describing before you add the relative clause.',
        visualAids: ['Who/which/that table', 'Restrictive vs non-restrictive pairs', 'Pronoun drop examples'],
      },
      prepositions: {
        excerpt: 'Choose prepositions by relationship and fixed pattern instead of translating word for word.',
        heroTip: 'Study prepositions in chunks, not alone: interested in, responsible for, arrive at.',
        visualAids: ['Time and place preposition grid', 'Verb + preposition pairs', 'Common deletion list'],
      },
      conditionals: {
        excerpt: 'Control if-sentences by matching the condition and result to the same timeline and logic.',
        heroTip: 'Name the situation first: real, likely, unreal, or impossible in the past.',
        visualAids: ['Conditional pattern ladder', 'Timeline arrows', 'If-clause/result-clause map'],
      },
      tenses: {
        excerpt: 'Match tense choice to time meaning so the reader never has to guess your timeline.',
        heroTip: 'Circle the time marker before you choose the verb form.',
        visualAids: ['Timeline with tense labels', 'Finished vs unfinished time markers', 'Simple/perfect contrast pairs'],
      },
      modals: {
        excerpt: 'Use modal verbs to show ability, advice, obligation, possibility, and deduction with the right strength.',
        heroTip: 'Choose the meaning first, then choose the modal. Do not start from the word.',
        visualAids: ['Modal meaning scale', 'Advice vs obligation examples', 'Modal + base verb reminder'],
      },
      passive: {
        excerpt: 'Use passive forms when the action matters more than the doer, and switch back to active when clarity needs it.',
        heroTip: 'Ask what should stay in the spotlight: the action, the result, or the doer.',
        visualAids: ['Active/passive transformation pairs', 'Be + past participle pattern', 'When to keep or drop by-phrases'],
      },
      'word-formation-prefixes': {
        excerpt: 'Learn high-frequency English prefixes so you can control meaning shifts like negative, opposite, and repeat actions.',
        heroTip: 'Before editing, name the meaning you need: not, wrong, opposite, or again. Then choose the prefix.',
        visualAids: ['Prefix meaning map', 'Negative prefix table', 'Re-/mis-/dis- contrast examples'],
      },
      'word-formation-suffixes': {
        excerpt: 'Use common suffixes to build accurate noun, adjective, adverb, and verb forms for natural exam sentences.',
        heroTip: 'Find the sentence slot first, then choose the suffix. Do not choose suffixes by sound alone.',
        visualAids: ['Suffix and word-class chart', 'Spelling change reminders', 'Sentence-slot checklist'],
      },
      'noun-formation': {
        excerpt: 'Build strong noun forms from verbs and adjectives to express results, causes, and trends with clearer control.',
        heroTip: 'After articles, possessives, and many prepositions, check if English needs a noun form.',
        visualAids: ['Verb-to-noun families', 'Noun phrase clarity guide', 'Nominalization do/don\'t list'],
      },
      'word-formation': {
        excerpt: 'Control word formation with practical prefix and suffix choices that improve precision without sounding forced.',
        heroTip: 'Decide first: meaning shift (prefix) or word-class shift (suffix).',
        visualAids: ['Prefix vs suffix decision tree', 'Word-family examples', 'Final spelling check'],
      },
    };
    const selected = metaByFamily[family] || defaultMeta;
    return {
      ...defaultMeta,
      ...selected,
      quiz: [
        {
          prompt: `Which sentence uses ${topic} correctly?`,
          options: [pack.ex1Weak, pack.ex1Better, pack.ex2Weak],
          correctIndex: 1,
          explanation: `Option 2 matches the main rule for ${topic} and keeps the sentence natural.`,
        },
        {
          prompt: `What should you check first when editing ${topic}?`,
          options: [
            'The meaning you want and the sentence pattern you need',
            'Only the number of long words in the sentence',
            'Whether the sentence sounds complicated enough',
          ],
          correctIndex: 0,
          explanation: 'Start from meaning and pattern; complexity is never the first goal.',
        },
        {
          prompt: `Which edit fixes a common ${topic} mistake?`,
          options: [pack.practice1[0], pack.answerHints[0], pack.practice1[1]],
          correctIndex: 1,
          explanation: `Option 2 repairs a typical ${topic} error and matches the target form.`,
        },
      ],
    };
  }

  if (category === 'vocabulary') {
    return {
      excerpt: `${level} vocabulary lesson on ${topic} with a practical word bank, collocations, and retrieval practice.`,
      heroTip: 'Learn words with their partner phrases and one model sentence, not as isolated items.',
      visualAids: ['Topic word bank', 'Useful collocations', 'Sentence frame cards'],
      quiz: [
        {
          prompt: `What is the safest way to learn vocabulary for ${topic}?`,
          options: [
            'Learn words in chunks and sentence frames',
            'Memorize isolated words only',
            'Use the longest word you know everywhere',
          ],
          correctIndex: 0,
          explanation: 'Chunks and frames make vocabulary easier to use accurately.',
        },
        {
          prompt: 'Which kind of word choice is stronger in exam English?',
          options: ['precise and natural', 'vague but short', 'randomly formal'],
          correctIndex: 0,
          explanation: 'Precise natural wording is easier to trust and score positively.',
        },
        {
          prompt: 'What should you do right after learning a new word or chunk?',
          options: ['Use it in one short sentence', 'Leave it unused until exam day', 'Replace every word in the paragraph with it'],
          correctIndex: 0,
          explanation: 'A short model sentence makes the new language active instead of passive.',
        },
      ],
    };
  }

  if (category === 'writing') {
    return {
      excerpt: `${level} writing lesson on ${topic} with clearer structure, stronger support, and exam-focused review.`,
      heroTip: 'Plan the job of the response before you write the sentences.',
      visualAids: ['Planning sequence', 'Model paragraph frame', 'Final editing checklist'],
      quiz: [
        {
          prompt: `What should come before full drafting in ${topic}?`,
          options: ['A quick plan with purpose and supporting points', 'A long conclusion', 'A list of rare words'],
          correctIndex: 0,
          explanation: 'A short plan improves task control and paragraph direction immediately.',
        },
        {
          prompt: 'What makes support stronger in exam writing?',
          options: ['Specific explanation and detail', 'Repeating the same idea', 'Keeping the point abstract'],
          correctIndex: 0,
          explanation: 'Specific support is easier for the examiner to trust.',
        },
        {
          prompt: 'What should you check before you finish the paragraph?',
          options: ['Whether each sentence has a clear job', 'Whether every sentence is very long', 'Whether you used the rarest words possible'],
          correctIndex: 0,
          explanation: 'A paragraph reads better when each sentence does one clear piece of work.',
        },
      ],
    };
  }

  if (category === 'speaking') {
    return {
      excerpt: `${level} speaking lesson on ${topic} with clearer response frames, practice prompts, and self-checks.`,
      heroTip: 'Start with a direct answer. Most speaking problems get smaller once the opening sentence is clear.',
      visualAids: ['Direct-answer frame', 'Reason-example model', 'Recording checklist'],
      quiz: [
        {
          prompt: `What is a safe speaking frame for ${topic}?`,
          options: ['Answer, reason, example, close', 'Long apology, filler, random detail', 'Silence, then topic change'],
          correctIndex: 0,
          explanation: 'A simple structure protects both fluency and clarity.',
        },
        {
          prompt: 'What usually sounds stronger in speaking exams?',
          options: ['Short accurate language', 'Long risky language with weak logic', 'No structure at all'],
          correctIndex: 0,
          explanation: 'Control usually beats forced complexity in speaking.',
        },
        {
          prompt: 'What should you do after giving the direct answer?',
          options: ['Add one reason and one example', 'Apologize for your English', 'Change the topic quickly'],
          correctIndex: 0,
          explanation: 'A simple reason-example extension makes the answer easier to follow.',
        },
      ],
    };
  }

  if (category === 'listening') {
    return {
      excerpt: `${level} listening lesson on ${topic} with task strategy, attention control, and review routines.`,
      heroTip: 'Do not try to catch every word. Track the question focus and the signal words that carry the answer.',
      visualAids: ['Before-listening routine', 'Signal word list', 'Recovery checklist'],
      quiz: [
        {
          prompt: `What matters most in ${topic}?`,
          options: ['Protecting attention and tracking key information', 'Writing full sentences during the audio', 'Memorizing every word'],
          correctIndex: 0,
          explanation: 'The goal is targeted listening, not full transcription.',
        },
        {
          prompt: 'What should you do after missing one detail in the audio?',
          options: ['Stay with the next clear signal', 'Stop listening completely', 'Replay the missed word in your head'],
          correctIndex: 0,
          explanation: 'Recovery starts by returning to the live audio, not by freezing on the missed word.',
        },
        {
          prompt: 'What kind of notes are usually most useful?',
          options: ['Short keywords and symbols', 'Full polished sentences', 'No notes at all'],
          correctIndex: 0,
          explanation: 'Usable notes protect attention better than full-sentence transcription.',
        },
      ],
    };
  }

  if (category === 'reading') {
    return {
      excerpt: `${level} reading lesson on ${topic} with proof-finding, time control, and trap awareness.`,
      heroTip: 'A matching word is not proof. Stay until you find the sentence that actually answers the question.',
      visualAids: ['Proof vs keyword chart', 'Time budget grid', 'Trap word list'],
      quiz: [
        {
          prompt: `What is the safest first job in ${topic}?`,
          options: ['Find proof for the answer', 'Trust the first familiar word', 'Reread the whole text every time'],
          correctIndex: 0,
          explanation: 'Reading accuracy improves when the answer is tied to evidence, not recognition alone.',
        },
        {
          prompt: 'What should you avoid when checking an answer?',
          options: ['Confusing a matching keyword with real proof', 'Reading the exact answer line carefully', 'Checking time after a hard question'],
          correctIndex: 0,
          explanation: 'A familiar word is not enough; the line must actually prove the answer.',
        },
        {
          prompt: 'What is the safer time-management move?',
          options: ['Move on after a limit and return later', 'Stay on one hard item until time is gone', 'Choose at random without any proof'],
          correctIndex: 0,
          explanation: 'Protecting total score matters more than winning one hard item immediately.',
        },
      ],
    };
  }

  return defaultMeta;
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

    const metadata = buildLessonMetadata(category, topic, level, examText);
    const nextFrontmatter = updateLessonFrontmatter(parts.frontmatter, metadata);
    const newBody = buildBody(category, topic, level, examText);
    const next = `${parts.head}${nextFrontmatter}${parts.sep}${newBody}\n`;

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
