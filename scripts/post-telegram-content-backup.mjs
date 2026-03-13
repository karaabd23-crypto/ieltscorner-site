#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const STANDARD_TELEGRAM_SIGNATURE = `✨ Kay's English Corner✨
Your Gateway to English Success in Canada 🇨🇦
🔗 Join us on Telegram
https://t.me/Kaysenglishcorner`;

const TOPIC_BANK = [
  { type: 'vocab', level: 'B1', topic: 'Serendipity - finding good things by chance', lang: 'EN/FA' },
  { type: 'vocab', level: 'B1', topic: 'Ephemeral - lasting for a very short time', lang: 'EN/FA' },
  { type: 'vocab', level: 'B2', topic: 'Perspicacious - having keen judgment', lang: 'EN/FA' },
  { type: 'vocab', level: 'A2', topic: 'Nostalgic - sentimental longing for the past', lang: 'EN/FA' },
  { type: 'grammar', level: 'B1', topic: 'Used to vs Would - past habits and states', lang: 'EN/FA' },
  { type: 'grammar', level: 'A2', topic: 'Present Perfect vs Simple Past', lang: 'EN/FA' },
  { type: 'grammar', level: 'B2', topic: 'Mixed conditionals for nuanced situations', lang: 'EN/FA' },
  { type: 'grammar', level: 'A2', topic: 'Common preposition mistakes in English', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Hit the nail on the head - be exactly right', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Break a leg - good luck or best wishes', lang: 'EN/FA' },
  { type: 'idiom', level: 'A2', topic: 'Piece of cake - something very easy', lang: 'EN/FA' },
  { type: 'idiom', level: 'B2', topic: 'Put all your eggs in one basket - depend on one thing only', lang: 'EN/FA' },
  { type: 'expression', level: 'B1', topic: 'Better late than never - still good even if delayed', lang: 'EN/FA' },
  { type: 'expression', level: 'A2', topic: 'What a coincidence! - expressing surprise at timing', lang: 'EN/FA' },
  { type: 'expression', level: 'B2', topic: 'To be honest with you - introducing sincere opinion', lang: 'EN/FA' },
  { type: 'phrasal', level: 'B1', topic: 'Get by - manage with difficulty or limited resources', lang: 'EN/FA' },
];

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(line.slice(separatorIndex + 1));

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env files
  }
}

async function loadEnvFiles() {
  const root = process.cwd();
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.env.local'));
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    exam: 'AUTO',
    topic: '',
    templateFile: '',
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--exam') {
      options.exam = String(argv[index + 1] ?? 'auto').toUpperCase();
      index += 1;
    } else if (arg === '--topic') {
      options.topic = String(argv[index + 1] ?? '');
      index += 1;
    } else if (arg === '--template-file') {
      options.templateFile = String(argv[index + 1] ?? '');
      index += 1;
    } else if (arg === '--model') {
      options.model = String(argv[index + 1] ?? DEFAULT_MODEL);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const validExams = new Set(['AUTO', 'IELTS', 'CELPIP', 'ESL']);
  if (!validExams.has(options.exam)) {
    throw new Error('--exam must be one of: auto, IELTS, CELPIP, ESL');
  }

  return options;
}

function pickTopic(forcedTopic) {
  if (forcedTopic) {
    return {
      type: 'vocab',
      level: 'B1',
      topic: forcedTopic,
    };
  }

  const selected = TOPIC_BANK[Math.floor(Math.random() * TOPIC_BANK.length)] ?? TOPIC_BANK[0];
  return { ...selected };
}

async function readTemplate(templateFileArg) {
  const templateFromEnv = process.env.TELEGRAM_POST_TEMPLATE?.trim();
  if (templateFromEnv) {
    return templateFromEnv;
  }

  const envTemplateFile = process.env.TELEGRAM_TEMPLATE_FILE?.trim();
  const templateFile = templateFileArg || envTemplateFile;

  if (!templateFile) {
    return '';
  }

  try {
    const content = await readFile(templateFile, 'utf8');
    return content.trim();
  } catch {
    return '';
  }
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response.');
  }
  return text.slice(start, end + 1);
}

function ensureStandardSignature(text) {
  const body = String(text ?? '').trim();
  if (!body) {
    return STANDARD_TELEGRAM_SIGNATURE;
  }

  if (body.includes(`https://t.me/Kaysenglishcorner`) || body.includes(`Kay's English Corner`)) {
    return body;
  }

  return `${body}\n\n${STANDARD_TELEGRAM_SIGNATURE}`;
}

function fallbackContent({ type, level, topic, channelUrl }) {
  // 10 format types with curated quality content - rotates through pedagogically diverse formats
  
  // FORMAT 1: Story-Based Learning (B2+ Corporate Narrative)
  const storyFormatLessons = [
    {
      title: '🎭 Story-Based Learning: The Corporate Pivot',
      format: 'story-based',
      level: 'B2+',
      topic: 'Advanced professional narrative with multisyllabic vocabulary',
      postBody: `🎭 SOPHISTICATED NARRATIVE: "From Stagnation to Strategic Reorientation"

Alexandra, a senior management consultant, found herself at a precipice. Her organization had implemented an antiquated paradigm for stakeholder engagement, perpetuating inefficiencies across departments. Rather than acquiesce to mediocrity, she initiated a comprehensive restructuring.

During the quarterly executive forum, Alexandra articulated her vision: "We must eschew our conventional methodologies. Our competition has leveraged agile frameworks, while we've remained entrenched in bureaucratic processes. This recalibration isn't merely cosmetic—it's existential."

Her colleague interjected: "Isn't this too precipitous? We lack empirical data to substantiate such a radical transformation."

"Precisely," Alexandra countered. "That ambiguity is exactly why we must act. Circumspection often masquerades as prudence, but inertia is antithetical to innovation. The data confirms our trajectory is untenable."

Within months, her initiative had engendered unprecedented productivity gains—not through happenstance, but through meticulous execution and unwavering philosophical commitment to organizational excellence.

💡 KEY VOCABULARY SPOTLIGHT:
• Paradigm (noun) = established model or framework
• Eschew (verb) = deliberately avoid or reject
• Entrenched (adjective) = firmly established, difficult to change
• Precipitous (adjective) = sudden, extreme, or dangerously steep
• Circumspection (noun) = careful consideration; caution
• Substantiate (verb) = provide evidence for; verify

💡 ADVANCED LEARNING TECHNIQUE:
Notice how Alexandra doesn't merely "say things"—she "articulates," "leverages," and "substantiates." Professional English privileges precision over simplicity. Practice replacing everyday verbs (say, think, use) with their sophisticated equivalents.

🎯 CHALLENGE: Identify three "pedestrian" verbs in your writing today and elevate them to B2+ alternatives!`,
      hashtags: ['#AdvancedNarrative', '#ProfessionalEnglish', '#ExecutiveVocabulary'],
      quizzes: [
        {
          question: '❓ What does "eschew" mean in Alexandra\'s context?',
          options: ['Examine thoroughly', 'Deliberately reject or avoid', 'Implement gradually', 'Question fundamentally'],
          correctIndex: 1,
          explanation: '"Eschew" = actively reject. She\'s calling for abandonment of outdated methodologies.',
        },
        {
          question: '❓ Her colleague\'s concern about being "too precipitous" suggests:',
          options: ['Moving too slowly', 'Acting too hastily without sufficient caution', 'Being too detailed', 'Lacking resources'],
          correctIndex: 1,
          explanation: '"Precipitous" = dangerously sudden. He worries she\'s rushing the transformation.',
        },
        {
          question: '❓ "Circumspection often masquerades as prudence" implies:',
          options: [
            'Caution and wisdom are identical',
            'Excessive caution can disguise itself as reasonable care',
            'Prudence is impractical',
            'Organizations should avoid caution'
          ],
          correctIndex: 1,
          explanation: 'Sophisticated observation: excessive caution (circumspection) can masquerade (disguise itself) as genuine wisdom (prudence)—a nuanced critique.',
        },
      ],
    },
  ];

  // FORMAT 2: Error Analysis Challenge (B2 - No Persian)
  const errorAnalysisLessons = [
    {
      title: '🔍 Error Analysis: Sophisticated Grammar Errors in Academic Writing',
      format: 'error-analysis',
      level: 'B2',
      topic: 'Advanced learner mistakes in professional contexts',
      postBody: `🔍 GRADUATE-LEVEL WRITING: Identify 5 Sophisticated Errors

❌ FLAWED ACADEMIC PARAGRAPH:
"The implications of neuroplasticity are fundamental to contemporary pedagogical discourse. Researchers has demonstrated that cognitive flexibility, which it is enhanced through deliberate practice, enables individuals to circumvent traditionally entrenched learning paradigms. Despite of significant advances, institutional frameworks remain mired by outdated methodologies."

💡 WHAT'S GRAMMATICALLY WRONG?

1. "Researchers has demonstrated" → Should be "Researchers have demonstrated" (plural subject = plural verb)
2. "which it is enhanced" → Should be "which is enhanced" (redundant pronoun; relative clauses don't repeat subjects this way)
3. "Despite of significant advances" → Should be "Despite significant advances" OR "In spite of significant advances" (preposition usage)
4. "mired by outdated" → Should be "mired in outdated" (correct collocation with passive voice)
5. Missing article: "the... learning paradigms" requires article consistency

✅ CORRECTED VERSION:
"The implications of neuroplasticity are fundamental to contemporary pedagogical discourse. Researchers have demonstrated that cognitive flexibility, which is enhanced through deliberate practice, enables individuals to circumvent traditionally entrenched learning paradigms. Despite significant advances, institutional frameworks remain mired in outdated methodologies."

💡 ADVANCED DISTINCTIONS:
• "Despite" (preposition, no "of") vs "In spite of" (prepositional phrase with "of")
• Relative clauses ("which is...") must not repeat subjects with pronouns
• Passive voice collocations matter: "mired in," "entrenched by," "burdened with"

🎯 CHALLENGE: Find ONE error in your next Telegram message and correct it!`,
      hashtags: ['#AcademicWriting', '#AdvancedGrammar', '#PrecisionMatters'],
      quizzes: [
        {
          question: '❓ What\'s wrong with "Researchers has demonstrated"?',
          options: [
            'Nothing, "researchers" is singular',
            '"Researchers" is plural, requiring "have" not "has"',
            'Should use past tense instead'
          ],
          correctIndex: 1,
          explanation: 'Subject-verb agreement: plural subjects require plural verbs!',
        },
        {
          question: '❓ How do you fix: "which it is enhanced through practice"?',
          options: [
            'Change "it" to "that"',
            'Remove "it"—should be "which is enhanced through practice"',
            'Add another verb after "it"'
          ],
          correctIndex: 1,
          explanation: 'Relative clauses don\'t repeat subjects. "It" is redundant and ungrammatical.',
        },
        {
          question: '❓ Which is CORRECT?',
          options: [
            'Despite of significant advances',
            'Despite significant advances',
            'In spite significant advances'
          ],
          correctIndex: 1,
          explanation: '"Despite" is a preposition (no "of"). "In spite of" is a phrase (with "of").',
        },
      ],
    },
  ];

  // FORMAT 3: Progressive Difficulty Tower (B2+ - Semantic Nuances)
  const progressiveLessons = [
    {
      title: '🏗️ Semantic Sophistication: "Undermine" at Three Cognitive Levels',
      format: 'progressive-difficulty',
      level: 'B2+',
      topic: 'Advanced semantic nuances and collocational precision',
      postBody: `🏗️ ONE CONCEPT, THREE ANALYTICAL DEPTHS

LEVEL 1️⃣ (B1 - SURFACE UNDERSTANDING):
"Undermine" = weaken or damage gradually
✓ The scandal undermined his credibility. (direct causation)
✓ Budget cuts undermine infrastructure quality. (straightforward damage)

LEVEL 2️⃣ (B2 - STRUCTURAL NUANCE):
"Undermine" = systematically weaken foundational elements
✓ Institutional corruption undermines democratic legitimacy. (attacks foundational principles, not just surface impacts)
✓ Disinformation undermines epistemic frameworks. (targets how people know things, not just what they know)
• Distinction: Not merely damage, but erosion of underlying principles

LEVEL 3️⃣ (B2+ - PHILOSOPHICAL/ANALYTICAL):
"Undermine" = expose logical contradictions or philosophical flaws
✓ Recent neuroscience undermines traditional mind-body dualism. (refutes theoretical foundations)
✓ Postmodern critique undermines essentialist claims about identity. (deconstructs ontological assumptions)
• Nuance: Suggests intellectual challenge, not just causal damage

SEMANTIC HIERARCHY:
"Damage" (crude) → "Undermine" (systematic) → "Fundamentally vitiate" (theoretical)

💡 COLLOCATION PATTERNS:
• Concrete: undermine [credibility, morale, effort]
• Institutional: undermine [legitimacy, authority, governance]
• Epistemological: undermine [certainty, assumptions, paradigms]

🎯 MASTER-LEVEL CHALLENGE: Notice how word choice encodes your intellectual positioning. Choose "undermine" (systematic critique) vs. "damage" (causal harm) based on argumentative depth!`,
      hashtags: ['#SemanticPrecision', '#AdvancedCollocations', '#IntellectualEnglish'],
      quizzes: [
        {
          question: '❓ "Institutional corruption undermines democratic legitimacy" suggests:',
          options: [
            'Corruption causes temporary problems',
            'Corruption weakens the foundational principles of democracy itself',
            'Corruption is only a financial issue'
          ],
          correctIndex: 1,
          explanation: 'B2+ understanding: "undermine" attacks foundational principles (legitimacy), not just operational efficiency.',
        },
        {
          question: '❓ Why say "undermines epistemic frameworks" rather than "damages knowledge"?',
          options: [
            'It\'s unnecessarily complicated',
            'It specifies that the attack targets how we know things, not just facts themselves',
            'There\'s no meaningful difference'
          ],
          correctIndex: 1,
          explanation: '"Epistemic frameworks" = systems of knowing; more sophisticated than "knowledge".',
        },
        {
          question: '❓ Which statement is MOST SOPHISTICATED?',
          options: [
            'This undermines my understanding',
            'This undermines the epistemological scaffolding upon which contemporary scientific certainty is constructed',
            'This damages things'
          ],
          correctIndex: 1,
          explanation: 'Maximum sophistication comes from theoretical vocabulary + precise target of critique.',
        },
      ],
    },
  ];

  // FORMAT 4: Comparison Battle (B2 - Persian Removed)
  const comparisonLessons = [
    {
      title: '⚖️ Comparison Battle: "Conversely" vs "Conversely"—The Subtle Art of Contrast',
      format: 'comparison',
      level: 'B2',
      topic: 'Advanced discourse markers and logical relationships',
      postBody: `⚖️ SOPHISTICATED CONTRAST: Understanding Nuanced Opposing Statements

CONTEXT 1: Direct Opposition in Academic Writing
❌ "Traditional pedagogy emphasizes rote memorization. Conversely, constructivist approaches prioritize experiential discovery." (Acceptable, but blunt)
✅ "Whereas traditional pedagogy emphasizes rote memorization, constructivist approaches fundamentally invert this paradigm by prioritizing experiential discovery." (More sophisticated, creates deeper contrast)

CONTEXT 2: Conceding then Contrasting
❌ "The research is significant. Conversely, it has limitations." (Too simplistic)
✅ "Although the research presents compelling findings, methodological constraints sufficiently undermine its generalizability to warrant circumspection in interpretation." (Acknowledges merit while demonstrating critical analysis)

THE DISCOURSE MARKER HIERARCHY:
• "But" = crude opposition (avoid in formal writing)
• "However" / "Nevertheless" = competent contrast (B1-B2)
• "Conversely" = explicit logical inversion (B2, but potentially weak if overused)
• "Whilst/Whereas" + clause inversion = sophisticated rhetorical positioning (B2+, more subtle)
• Implicit contrast through structural parallelism (expert level)

NATIVE ELITE PRACTICE:
In sophisticated academic discourse, contrast is often embedded structurally rather than explicitly marked. Notice how professional writers often avoid discourse markers entirely and rely on parallel construction to imply opposition.

EXAMPLE - Professional vs. Pedestrian:
❌ "Some argue X. Conversely, others argue Y."
✅ "Whilst proponents contend X, critics posit the antithetical thesis: Y."

💡 STRATEGIC INSIGHT: Excessive use of "conversely" marks you as competent but not expert. True sophistication means creating contrast without announcing it.

🎯 CHALLENGE: Rewrite one comparison from your work using implicit contrast instead of explicit markers!`,
      hashtags: ['#AcademicStyle', '#DiscourseMarkers', '#WritingSophistication'],
      quizzes: [
        {
          question: '❓ Why is "whereas" more sophisticated than "conversely" in academic writing?',
          options: [
            'They\'re equally sophisticated',
            '"Whereas" subordinates one idea to another, creating implicit logical relationships rather than announcing contrast',
            '"Conversely" is actually more sophisticated'
          ],
          correctIndex: 1,
          explanation: 'Expert writers embed contrast structurally; competent writers announce it with markers like "conversely".',
        },
        {
          question: '❓ "Methodological constraints sufficiently undermine its generalizability" demonstrates:',
          options: [
            'Simple criticism',
            'Measured critique acknowledging both merit and limitations',
            'Praise with reservations'
          ],
          correctIndex: 1,
          explanation: '"Sufficiently undermine" = sophisticated quantification of critique; neither absolute dismissal nor uncritical acceptance.',
        },
        {
          question: '❓ Which revision BEST exemplifies B2+ sophistication?',
          options: [
            'Some argue X. Conversely, others argue Y.',
            'Whilst proponents contend X, critics posit Y.',
            'X is debated; some say one thing, some say another.'
          ],
          correctIndex: 1,
          explanation: 'Structural embedding + sophisticated verbs ("contend," "posit") + implicit contrast = higher register.',
        },
      ],
    },
  ];

  // FORMAT 5: Native Speaker Authenticity (B2+ - Policy Think Tank Dialogue)
  const nativeSpeakerLessons = [
    {
      title: '🎬 Native Expert Dialogue: Policy Deliberation Between Researchers',
      format: 'native-speaker',
      level: 'B2+',
      topic: 'Advanced professional discourse and intellectual debate',
      postBody: `🎬 AUTHENTIC DIALOGUE: How Sophisticated Professionals Actually Argue

SCENARIO: Two policy researchers debating climate mitigation frameworks 🌍

A: "The carbon offset paradigm is fundamentally flawed. It perpetuates the fiction that we can externalize environmental costs through market mechanisms."

B: "I appreciate the critique, but I'd contend that's an oversimplification. Offsets aren't panacea, sure, but they're pragmatic given political constraints."

A: "Pragmatism that exacerbates the problem isn't pragmatism—it's complicity. We're papering over systemic failures with incremental measures."

B: "That's intellectually satisfying rhetoric, but it lacks operational specificity. How exactly do you circumvent entrenched fossil fuel interests without intermediate mechanisms?"

A: "Fair point. I'll concede that framing. But intermediate mechanisms cannot become permanent fixtures. There needs to be an explicit sunset clause."

B: "Now we're converging. If we coupled offsets with mandatory carbon tax indexation—"

A: "—and regulatory enforcement with real penalties, not token fines."

B: "Exactly. That's a substantive policy architecture."

💡 AUTHENTIC PATTERNS NATIVE PROFESSIONALS USE:
• Explicit disagreement: "I appreciate X, but I'd contend..." (not just "you're wrong")
• Strategic concession: "Fair point. I'll concede that framing." (shows intellectual maturity)
• Collaborative completion: Finishing each other's thoughts mid-clause
• Jargon precision: "operational specificity," "policy architecture" (field-specific terminology)
• Escalating nuance: Moving from abstract critique to concrete mechanism design

🎯 NOTICE: NO contractions here (unlike casual speech). Sophisticated deliberation privileges clarity over informality.

CONTRASTIVE OBSERVATION:
Compare casual: "Look, you're being unrealistic. That won't work in the real world."
vs. Expert: "I'd contend that operational constraints warrant reconsideration of the theoretical model."
= Same disagreement, exponentially more sophisticated register.`,
      hashtags: ['#ProfessionalEnglish', '#IntellectualDialogue', '#ExpertRegister'],
      quizzes: [
        {
          question: '❓ When A says "It\'s complicity," they\'re arguing:',
          options: [
            'The approach is honest',
            'Using intermediate measures is actively participating in environmental harm rather than genuinely solving it',
            'Market mechanisms are helpful'
          ],
          correctIndex: 1,
          explanation: '"Complicity" = knowing participation in wrongdoing. Strong rhetorical move.',
        },
        {
          question: '❓ B\'s response "That\'s rhetorically satisfying but lacks operational specificity" suggests:',
          options: [
            'A\'s critique is correct',
            'A sounds good but doesn\'t explain HOW to implement alternatives',
            'Rhetoric is more important than policy'
          ],
          correctIndex: 1,
          explanation: '"Operational specificity" = concrete implementation details. B challenges abstract critique.',
        },
        {
          question: '❓ The dialogue demonstrates sophisticated negotiation through:',
          options: [
            'Direct personal attacks',
            'Strategic concession, collaborative building, and moving from abstract critique to concrete design',
            'Avoiding any disagreement'
          ],
          correctIndex: 1,
          explanation: 'Expert dialogic patterns: acknowledge merit, concede valid points, reconstruct toward shared solution.',
        },
      ],
    },
  ];

  // FORMAT 6: Pronunciation + Comprehensive Phonology (B2+ - Advanced Patterns)
  const pronunciationLessons = [
    {
      title: '🔊 Phonological Sophistication: Vowel Reduction and Prosody in Native Speech',
      format: 'pronunciation',
      level: 'B2+',
      topic: 'Advanced phonetic and prosodic patterns in professional speech',
      postBody: `🔊 MASTER PRONUNCIATION: From Textbook Articulation to Native Prosody

THE PHENOMENON: Vowel Reduction and Swallowing in Rapid Professional Speech

Most learners over-articulate. Notice the difference:

❌ TEXTBOOK (Character-by-character, every vowel distinct):
"Laboratory" = LAB-or-a-TOR-ee (5 clear syllables)
✗ This marks you as non-native immediately.

✅ NATIVE SPEECH (Vowel reduction, syllable compression):
"Laboratory" = LAB-ra-tree (3 syllables, vowels become schwa [ə] sound)
or even colloquially: "LABRA-tree"

ADVANCED PATTERN 1: The Schwa Invasion
In rapid speech, unstressed vowels collapse to [ə]:
• "Photograph" = FOH-tuh-graf (not FOTE-o-graf)
• "Communicate" = kuh-MYOO-ni-kayt (not COM-myoo-ni-kate)
• "Interesting" = IN-truh-sting (not IN-tur-est-ing)
→ Reality: Native speakers execute vowel reduction automatically; learners must hear and replicate this pattern.

ADVANCED PATTERN 2: Prosodic Stress and Intonation Contours
Professional English uses strategic stress-placement to signal sophistication:
• Normal: "The POLICY is ineffective." (question form, confusion)
• Assertive: "The policy is INEFFECT-ive." (confident statement)
• Analytical: "The POL-icy is ineffective." (emphasizing the object of critique, inviting counter-argument)

💡 PHONOLOGICAL INSIGHT:
Stress placement encodes epistemological positioning. Where you place stress telegraphs whether you're asking, asserting, or inviting dialogue.

ADVANCED PATTERN 3: Connected Speech Phenomena
Native speech violates textbook phoneme boundaries:
• "Did you" → [dɪ dʒu] in isolation, but → [dɪdʒə] or [dɪʃə] in connected speech
• "What are you" → [wɑt are ju] in slow speech, but → [wədʒə] in fluent speech
• This isn't laziness—it's phonological sophistication.

🎯 DIAGNOSTIC CHALLENGE: Listen to a native policy expert for 60 seconds and count how many words they fully pronounce vs. reduce. Most will be reduced.

💡 MASTERY TECHNIQUE: Record yourself reading academic text. Then listen to a native professional read the same text. Map WHERE they differ phonetically. Those differences are your improvement pathway.`,
      hashtags: ['#PhonologySophistication', '#NativePronunciation', '#ProsodyMatters'],
      quizzes: [
        {
          question: '❓ Why do natives say "LAB-ra-tree" instead of "LAB-or-a-TOR-ee"?',
          options: [
            'It\'s incorrect and uneducated',
            'Unstressed vowels reduce to schwa [ə] sound in rapid fluent speech',
            'Americans can\'t pronounce properly'
          ],
          correctIndex: 1,
          explanation: 'Vowel reduction is a feature of fluent native speech, not a defect. It\'s phonologically systematic.',
        },
        {
          question: '❓ If you stress "THE policy is ineffective" vs "the POL-icy is ineffective":',
          options: [
            'Both mean exactly the same thing',
            'Stress placement changes prosodic meaning; first suggests questioning, second invites focus-shifting critique',
            'The first is always wrong'
          ],
          correctIndex: 1,
          explanation: 'Prosody = how stress/intonation shapes meaning. This is expert-level pronunciation.',
        },
        {
          question: '❓ Connected speech phenomena like "didyə" for "did you" represent:',
          options: [
            'Speech errors native speakers should avoid',
            'Phonological features of fluent native discourse—automatic boundary reduction',
            'Problems unique to American English'
          ],
          correctIndex: 1,
          explanation: 'This phonological shifting is systematic, universal in native speech, and marks true fluency.',
        },
      ],
    },
  ];

  // FORMAT 7: Cultural Context Master (B2+ - Diplomatic Euphemism Analysis)
  const culturalLessons = [
    {
      title: '🌍 Diplomatic Euphemism Analysis: "Friendly Fire" and Other Professional Circumlocutions',
      format: 'cultural-context',
      level: 'B2+',
      topic: 'Advanced pragmatics and cultural semiotics in professional discourse',
      postBody: `🌍 THE SEMIOTICS OF EVASION: How Professionals Obscure Through Language

WHAT IS "FRIENDLY FIRE"?
Technically: Soldiers accidentally wounded/killed by allies' weapons
Linguistically: A terminological paradox designed to soften moral horror

WHY THIS MATTERS:
This single phrase demonstrates how professional registers use euphemism not as politeness, but as cognitive framing. The term restructures reality itself.

THE EUPHEMISTIC GRADIENT:

Level 1 (Direct Reality):
"Our soldiers were killed by our own soldiers who made targeting mistakes."
→ Uncomfortable. Demands accountability and transparency.

Level 2 (Partial Softening):
"Casualties resulted from targeting error."
→ Passive voice abstracts agency. But "casualties" acknowledges death.

Level 3 (Professional Euphemism):
"Friendly fire incident resulted in personnel attrition."
→ "Attrition" = natural loss (like rainfall), not caused violence
→ "Incident" = neutral, technical register
→ "Friendly" = paradoxically humanizing while obscuring

Level 4 (Maximum Circumlocution):
"Intra-theater security event necessitated force management protocols."
→ Incomprehensible to non-specialists, which IS the point
→ Obscures moral reality through terminological density

💡 CULTURAL INSIGHT:
Different English-speaking professional contexts employ euphemism strategically:
• Military: "Collateral damage," "neutralize," "kinetic action"
• Corporate: "Right-sizing," "resource optimization," "delayering"
• Political: "Enhanced interrogation," "kinetic intervention"
• Academic: "Problematize," "theorize," "emergent frameworks"

Each domain encodes power relations through circumlocution.

💡 THE PRAGMATIC FUNCTION:
Euphemisms aren't failures of directness—they're sophisticated tools for:
1) Reducing emotional intensity to enable decision-making
2) Maintaining professional distance
3) Creating in-group solidarity (specialists understand; outsiders don't)
4) Obscuring moral discomfort

🎯 EXPERT-LEVEL OBSERVATION:
Notice that mastering English at B2+ means understanding not just what words mean, but what social work they perform. "Friendly fire" performs immense social work—it transforms tragedy into an administrative problem.

CHALLENGE FOR CRITICAL LEARNERS:
What euphemisms operate in YOUR professional field? What reality do they obscure? How does that obscuring serve institutional interests?`,
      hashtags: ['#Pragmatics', '#Euphemism', '#CriticalLanguageAwareness'],
      quizzes: [
        {
          question: '❓ Why is "friendly fire" language called a "paradox"?',
          options: [
            'It\'s not actually paradoxical',
            'The term combines contradictory concepts (friendly + fire) to soften an uncomfortable reality',
            'It\'s unclear what the phrase means'
          ],
          correctIndex: 1,
          explanation: 'The linguistic paradox masks tragic reality. "Friendly" contradicts the harm, creating cognitive distancing.',
        },
        {
          question: '❓ How does "personnel attrition" differ from "our soldiers were killed"?',
          options: [
            'There\'s no meaningful difference',
            'Passive voice + abstract noun ("attrition") obscure agency and cause, making killing seem like natural loss',
            'The second is more professional'
          ],
          correctIndex: 1,
          explanation: '"Attrition" implies natural reduction (like rainfall), not caused violence. This is professional euphemism doing moral work.',
        },
        {
          question: '❓ Which is a function of professional euphemism?',
          options: [
            'Making language more poetic',
            'Creating in-group solidarity among specialists while obscuring reality from outsiders',
            'Making communication clearer'
          ],
          correctIndex: 1,
          explanation: 'Euphemisms in professional domains create specialist registers that exclude outsiders—a form of institutional power.',
        },
      ],
    },
  ];

  // FORMAT 8: Common Collocations Puzzle (B2+ - Sophisticated Verb Collocations)
  const collocationLessons = [
    {
      title: '🧩 Collocation Mastery: "Precipitate" vs "Catalyze" vs "Engender"',
      format: 'collocations',
      level: 'B2+',
      topic: 'Advanced verb selection and semantic precision in causation',
      postBody: `🧩 SEMANTIC PRECISION: Understanding Subtle Causative Distinctions

All three verbs mean "cause something to happen"—but precise speakers distinguish them rigorously.

PRECIPITATE (verb) = Cause something sudden/sudden, often negative or unexpected:
✓ "Economic sanctions precipitated political instability." (sudden, somewhat violent causation)
✓ "The whistleblower's revelation precipitated institutional collapse." (rapid, forceful)
• Connotation: Abruptness, necessity/inevitability, often negative
• Typical objects: crisis, conflict, instability, collapse, decline

CATALYZE (verb) = Initiate change that accelerates existing processes:
✓ "Technological innovation catalyzed the industrial transformation." (enables/accelerates pre-existing conditions)
✓ "Her mentorship catalyzed his intellectual development." (unlocked potential)
• Connotation: Enabling, acceleration of natural processes, often positive
• Typical objects: change, transformation, reform, development, growth

ENGENDER (verb) = Gradual creation of attitudes/conditions through sustained influence:
✓ "These policies engender distrust in democraticinstitutions." (generate attitudes slowly)
✓ "Prolonged inequality engenders social resentment." (creates psychological states)
• Connotation: Gradual production, psychological/attitudinal, morally neutral
• Typical objects: sentiment, resentment, trust, hostility, culture, conditions

COLLOCATIONAL HIERARCHY:
Negative abruptness: PRECIPITATE
Positive enabling: CATALYZE
Attitude/culture creation: ENGENDER

🎯 COMPARATIVE SENTENCES (Notice the exact differences):

❌ "Economic inequality catalyzes social tension." (Wrong—suggests it's positive enabling)
✅ "Economic inequality engenders social resentment." (Correct—creates psychological state)
✅ "Economic inequality precipitates social unrest." (Also correct—sudden negative consequence)

❌ "Leadership catalyzes instability." (Awkward—suggests good outcome)
✅ "Leadership precipitates conflict." (Better—abrupt negative)

❌ "Technology engenders the digital revolution." (Wrong—too gradual/passive)
✅ "Technology catalyzes the digital revolution." (Correct—enables transformation)

💡 EXPERT DISTINCTION:
Imprecise writers use "cause" or "lead to." Sophisticated writers choose:
• PRECIPITATE for sudden negative consequences
• CATALYZE for enabling transformations
• ENGENDER for cultural/psychological effects

Native specialists notice immediately when learners misuse these. Correct collocation marks you as analytically sophisticated.

🎯 DIAGNOSTIC: Look at your last three essay paragraphs. Count how many times you wrote "cause." Replace each with the precise causative verb.`,
      hashtags: ['#VerbCollocations', '#SemanticPrecision', '#AdvancedAcademic'],
      quizzes: [
        {
          question: '❓ Which verb BEST completes: "Policy failures _____ public distrust in government"?',
          options: [
            'precipitate (too sudden)',
            'catalyze (suggests positive enabling)',
            'engender (creates psychological attitude)'
          ],
          correctIndex: 2,
          explanation: '"Engender" captures gradual creation of sentiment. "Precipitate" would be too abrupt.',
        },
        {
          question: '❓ Distinguish: "Technology _____ innovation" vs "War _____ economic collapse"',
          options: [
            'Both use the same verb',
            'First uses CATALYZE (enabling); second uses PRECIPITATE (sudden consequence)',
            'Both use ENGENDER'
          ],
          correctIndex: 1,
          explanation: 'CATALYZE = enabling existing processes. PRECIPITATE = sudden negative outcomes.',
        },
        {
          question: '❓ Which demonstrates B2+ sophistication?',
          options: [
            'Inequality causes problems.',
            'Inequality engenders systemic resentment.',
            'Inequality precipitates instability.'
          ],
          correctIndex: 2,
          explanation: 'Choosing precise causative verbs and their correct collocations marks advanced speakers.',
        },
      ],
    },
  ];

  // FORMAT 9: Paragraph Rescue Challenge (B2 - Persian Removed)
  const paragraphRescueLessons = [
    {
      title: '🆘 Paragraph Rescue: Scholarly Writing with Syntactic Errors',
      format: 'paragraph-rescue',
      level: 'B2',
      topic: 'Advanced editing and academic writing refinement',
      postBody: `🆘 GRADUATE-LEVEL WRITING: Identify and Fix Seven Errors

❌ ORIGINAL (Flawed Academic Submission):
"The epistemological implications of artificial intelligence is becoming increasingly salient to contemporary researchers. Whilst proponents argues that computational systems can replicate human cognition, critics contend such claims represents a fundamental misunderstanding of consciousness. Furthermore, the ethical frameworks which governs automated decision-making remains underdeveloped, creating significant challenges for implementation in high-stakes domains. The research community must reconcile these tensions, yet scholars are often reluctant to engage with philosophical questions, preferring instead quantitative methodologies that lacks theoretical depth. Current trajectories proves problematic without more robust interdisciplinary dialogue."

💡 IDENTIFYING ERRORS:

1. "implications... is" → "implications... ARE" (plural subject needs plural verb)
2. "proponents argues" → "proponents argue" (plural subject; verb agreement)
3. "claims represents" → "claims represent" (compound plural structure)
4. "frameworks which governs" → "frameworks which govern" (relative clause agreement)
5. "remains underdeveloped" → "remain underdeveloped" (plural frameworks need plural verb)
6. "methodologies that lacks" → "methodologies that lack" (plural noun requiring plural verb)
7. "trajectories proves" → "trajectories prove" (plural subject; verb agreement)

BONUS: Structural awkwardness—"Yet scholars are reluctant" creates weak transition. Should be: "Yet, scholars' reluctance to engage with philosophical rigor"

✅ CORRECTED VERSION:
"The epistemological implications of artificial intelligence are becoming increasingly salient to contemporary researchers. Whilst proponents argue that computational systems can replicate human cognition, critics contend such claims represent a fundamental misunderstanding of consciousness. Furthermore, the ethical frameworks that govern automated decision-making remain underdeveloped, creating significant challenges for implementation in high-stakes domains. The research community must reconcile these tensions; yet scholars' reluctance to engage with philosophical rigor, coupled with preference for quantitative methodologies that lack theoretical depth, exacerbates fragmentation. Current trajectories prove problematic without more robust interdisciplinary dialogue."

💡 EDITING PRINCIPLE:
At B2+, errors aren't about simple grammar—they're about maintaining agreement across complex embedded structures. Sophisticated writing requires tracking plural/singular across multiple clauses.

🎯 REFINEMENT: Notice the restructured final sentences use parallel construction ("coupled with preference") rather than awkward conjunction. This is editorial sophistication beyond error-correction.

CHALLENGE: Rewrite one paragraph from your current work, focusing ONLY on subject-verb agreement in complex sentences.`,
      hashtags: ['#AcademicEditing', '#SyntacticControl', '#WritingPolish'],
      quizzes: [
        {
          question: '❓ Why is "implications... is" grammatically incorrect?',
          options: [
            'Nothing\'s wrong with it',
            '"Implications" is plural; requires "are" not "is"',
            'Should use past tense'
          ],
          correctIndex: 1,
          explanation: 'Subject-verb agreement: plural subjects require plural verbs!',
        },
        {
          question: '❓ Fix: "The frameworks which governs automated decisions remains problematic."',
          options: [
            'The frameworks which governs automated decisions remains problematic',
            'The frameworks which govern automated decisions remain problematic',
            'The framework which governs automated decisions remains problematic'
          ],
          correctIndex: 1,
          explanation: '"Frameworks" (plural) requires "govern" and "remain" (both plural).',
        },
        {
          question: '❓ At B2+, subject-verb agreement errors suggest:',
          options: [
            'Minor mistakes anyone makes',
            'Inability to maintain grammatical control across complex embedded structures—serious for academic credibility',
            'Native speakers make these mistakes too'
          ],
          correctIndex: 1,
          explanation: 'At B2+, agreement errors read as careless or cognitively disorganized. Academics notice immediately.',
        },
      ],
    },
  ];

  // FORMAT 10: Multiple Choice + Complex Logical Reasoning (B2+)
  const multipleChoiceLessons = [
    {
      title: '📝 Advanced Logical Reasoning: Counterfactual Conditionals in Evidence Analysis',
      format: 'multiple-choice',
      level: 'B2+',
      topic: 'Complex conditional structures and hypothetical reasoning',
      postBody: `📝 MASTER COMPLEX CONDITIONALS: Moving Beyond Simple If-Then

GRAMMAR FOCUS: Advanced Conditional Structures for Hypothesis and Evidence

Level 1 (B1): Simple conditionals describe reality
✓ "If renewable energy becomes cheaper, adoption increases." (Likely outcome, factual relationship)

Level 2 (B2): Mixed conditionals express counterfactuals
✓ "If we had invested in renewable energy a decade ago, we would currently possess more sustainable infrastructure." (Past condition unfulfilled; present consequence hypothetical)
→ Structure: Past condition + Present consequence = What hypothetically exists NOW because of what didn't happen THEN

Level 3 (B2+): Nested conditionals with evidential qualification
✓ "Had institutional frameworks been more responsive to climate science, we would likely be navigating significantly less severe ecological constraints than we presently face."
→ Double counterfactual: past (if institutions had responded) presupposing earlier cause (if climate warnings had been heeded)

💡 THE EPISTEMOLOGICAL TOOL:
Complex conditionals don't just describe grammar—they express levels of certainty:
• "If X, then Y" = objective relationship (high certainty)
• "If X, then Y would probably occur" = qualified prediction (medium certainty)
• "Had X occurred, Y would presently exist" = counterfactual reasoning (lowest certainty; most sophisticated)

NATIVE EXPERT PATTERN:
Watch how policy experts construct arguments:

❌ Simple/Weak: "If we had stricter regulations, pollution would be lower."
✅ Advanced: "Were regulatory frameworks substantively more stringent, we would observe measurable atmospheric improvement—contingent, of course, on enforcement mechanisms that remain systemically underdeveloped."
→ Notice: Triple conditional (if... were... would...) + qualification ("contingent on...") + acknowledgment of complicating factors

💡 PRAGMATIC FUNCTION:
Advanced conditionals allow you to:
1) Make sophisticated claims without asserting certainty
2) Acknowledge multiple causal pathways
3) Signal intellectual humility while maintaining analytical rigor

🎯 CHALLENGE: Take one claim from your field. Express it using three different conditional structures, moving from simple to complex. Notice how sophistication increases with conditional complexity!`,
      hashtags: ['#ComplexConditionals', '#LogicalReasoning', '#AdvancedGrammar'],
      quizzes: [
        {
          question: '❓ "Had institutions responded to climate warnings, we would currently possess more sustainable infrastructure." What does this structure express?',
          options: [
            'A simple statement about current reality',
            'A counterfactual: past unfulfilled condition + present hypothetical consequence',
            'A prediction about the future'
          ],
          correctIndex: 1,
          explanation: 'Mixed conditional = past condition never fulfilled but present consequence imagined. Sophisticated rhetorical move.',
        },
        {
          question: '❓ Why is "would probably occur" more B2+ than "would occur"?',
          options: [
            'It\'s less sophisticated',
            'It qualifies certainty, expressing appropriate epistemic humility—a mark of advanced discourse',
            'There\'s no meaningful difference'
          ],
          correctIndex: 1,
          explanation: 'Experts hedge conditional claims with "probably," "likely," "tend to"—marking intellectual maturity.',
        },
        {
          question: '❓ Which demonstrates mastery of conditional reasoning?',
          options: [
            'If regulations improve, pollution decreases.',
            'Had regulatory frameworks been stringent and enforcement mechanisms robust, atmospheric improvement would have materialized—contingent on political will remaining aligned.',
            'We should have stricter rules.'
          ],
          correctIndex: 1,
          explanation: 'Multiple nested conditions + qualification + acknowledgment of complicating factors = B2+ sophistication.',
        },
      ],
    },
  ];

  // ALL FORMATS IN ONE POOL - SELECT RANDOMLY
  const allFormats = [
    ...storyFormatLessons,
    ...errorAnalysisLessons,
    ...progressiveLessons,
    ...comparisonLessons,
    ...nativeSpeakerLessons,
    ...pronunciationLessons,
    ...culturalLessons,
    ...collocationLessons,
    ...paragraphRescueLessons,
    ...multipleChoiceLessons,
  ];

  // Pick a random format from all 10 types
  const selectedLesson = allFormats[Math.floor(Math.random() * allFormats.length)];

  const cta = channelUrl
    ? `\n\n🌈✨ Kay's English Corner\nYour Gateway to English Success in Canada 🇨🇦\n🔗 Join us on Telegram\n${channelUrl}`
    : '';

  return {
    title: selectedLesson.title,
    format: selectedLesson.format,
    level: selectedLesson.level,
    topic: selectedLesson.topic,
    postBody: `${selectedLesson.postBody}${cta}`,
    hashtags: selectedLesson.hashtags,
    quizzes: selectedLesson.quizzes || [selectedLesson.quiz], // Support both array and single quiz
  };
}

async function generateContentWithOpenAI({ model, type, level, topic, template, channelUrl }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackContent({ type, level, topic, channelUrl });
  }

  const templateHint = template
    ? `Use this style template while keeping factual clarity:\n${template}`
    : 'Use concise, encouraging micro-lesson style for Telegram channels.';

  const prompt = `You are creating one Telegram post for English language learners.
Audience: Intermediate English learners (B1-B2 level).
Content Type: ${type} (vocabulary, grammar, idiom, expression, or phrasal verb)
Specific Topic: ${topic}
Level: ${level}
${templateHint}

Return STRICT JSON only:
{
  "title": string,
  "type": "${type}",
  "level": string,
  "topic": string,
  "postBody": string,
  "hashtags": string[],
  "quiz": {
    "question": string,
    "options": [string, string, string, string],
    "correctIndex": number,
    "explanation": string
  }
}

Requirements:
- postBody max 2200 characters, plain text, no markdown tables.
- Match this house style:
  1) Catchy title line with emoji for ${type}.
  2) English explanation + example usage + natural context.
  3) Persian/Farsi companion explanation.
  4) Tip on how to practice this TODAY.
  5) Call-to-action to share example in comments.
  6) Friendly branded footer for Kay's English Corner.
- Focus ONLY on vocabulary, grammar, idioms, expressions—NOT exam tips.
- Keep sentence structure simple and learner-friendly.
- Include one practical usage task the user can try immediately.
- quiz.question should feel like a usage scenario (fill-in-the-blank or best-choice).
- Hashtags: 3 to 6 tags for ${type}.
- quiz.correctIndex must be 0-3.
- quiz options must be distinct and plausible.
- Include this line near the end: "🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!"
${channelUrl ? `- Include this CTA naturally in postBody: ${channelUrl}` : ''}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 900,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const outputText = data?.choices?.[0]?.message?.content;
  if (!outputText || typeof outputText !== 'string') {
    throw new Error('OpenAI response did not include valid message content.');
  }

  const parsed = JSON.parse(extractJson(outputText));
  return parsed;
}

function normalizeContent(content, fallback) {
  const safe = content && typeof content === 'object' ? content : fallback;
  
  // Handle both old single quiz and new quizzes array
  let quizzes = [];
  if (Array.isArray(safe.quizzes) && safe.quizzes.length > 0) {
    quizzes = safe.quizzes;
  } else if (safe.quiz) {
    quizzes = [safe.quiz];
  } else if (Array.isArray(fallback.quizzes) && fallback.quizzes.length > 0) {
    quizzes = fallback.quizzes;
  } else {
    quizzes = [fallback.quiz];
  }

  // Normalize quiz objects
  const normalizedQuizzes = quizzes.slice(0, 3).map((quiz) => {
    const options = Array.isArray(quiz.options) ? quiz.options.slice(0, 4).map((item) => String(item)) : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    return {
      question: String(quiz.question || '').slice(0, 290),
      options: options.length >= 3 ? options.slice(0, 4) : [...options, ...Array(4 - options.length).fill('').map((_, i) => `Option ${options.length + i + 1}`)],
      correctIndex: Math.max(0, Math.min(3, Number(quiz.correctIndex ?? 0))),
      explanation: String(quiz.explanation || '').slice(0, 180),
    };
  });

  const hashtags = Array.isArray(safe.hashtags)
    ? safe.hashtags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6)
    : fallback.hashtags;

  return {
    title: String(safe.title ?? fallback.title),
    examFocus: String(safe.examFocus ?? fallback.examFocus),
    level: String(safe.level ?? fallback.level),
    topic: String(safe.topic ?? fallback.topic),
    postBody: String(safe.postBody ?? fallback.postBody).slice(0, 3500),
    hashtags: hashtags.length ? hashtags : fallback.hashtags,
    quizzes: normalizedQuizzes,
    quiz: normalizedQuizzes[0], // Keep for backwards compatibility
  };
}

async function telegramRequest(method, payload, token) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }

  return data;
}

function buildPostMessage(content) {
  const hashLine = content.hashtags.length ? `\n\n${content.hashtags.join(' ')}` : '';
  return `${content.postBody}${hashLine}`;
}

function resolveChatId(explicitChatId, channelUrl) {
  const direct = explicitChatId?.trim();
  if (direct) {
    return direct;
  }

  const url = channelUrl?.trim();
  if (!url) {
    return '';
  }

  const normalized = url.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
      postBody: ensureStandardSignature(String(safe.postBody ?? fallback.postBody).slice(0, 3500)),
    return '';
  }

  return slug.startsWith('@') ? slug : `@${slug}`;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);
  const pick = pickTopic(options.exam, options.topic);
  const template = await readTemplate(options.templateFile);
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL?.trim() ?? '';

  const fallback = fallbackContent({
    exam: pick.exam,
    level: pick.level,
    topic: pick.topic,
    channelUrl,
  });

  let generated;
  try {
    generated = await generateContentWithOpenAI({
      model: options.model,
      exam: pick.exam,
      level: pick.level,
      topic: pick.topic,
      template,
      channelUrl,
    });
  } catch (error) {
    console.warn(`[warn] Falling back to template content: ${error.message}`);
    generated = fallback;
  }

  const content = normalizeContent(generated, fallback);

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: 'dry-run', content }, null, 2));
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);

  if (!botToken || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and/or target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL).');
  }

  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text: buildPostMessage(content),
    disable_web_page_preview: true,
  }, botToken);

  // Send all 3 quizzes (or however many are provided)
  for (let i = 0; i < content.quizzes.length; i += 1) {
    const quiz = content.quizzes[i];
    const delayMs = i > 0 ? 500 : 0; // Small delay between polls to avoid rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    
    await telegramRequest('sendPoll', {
      chat_id: chatId,
      question: quiz.question,
      options: quiz.options,
      type: 'quiz',
      correct_option_id: quiz.correctIndex,
      explanation: quiz.explanation,
      is_anonymous: true,
    }, botToken);
  }

  console.log(`[ok] Posted content and ${content.quizzes.length} quiz polls for topic: ${content.topic}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
