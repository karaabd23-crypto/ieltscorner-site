export const CELPIP_WRITING_PRODUCT_NAME = 'CELPIP Writing Score & Analysis';
export const CELPIP_WRITING_PRICE_CAD = 5;
export const CELPIP_WRITING_AMOUNT_CENTS = 500;
export const CELPIP_WRITING_BILLING_INTERVAL = 'month';

export const CELPIP_TASK_CONFIG = {
  task1: {
    id: 'task1',
    label: 'Task 1 · Email',
    minutes: 27,
    targetWords: '150–200 words',
    focus: 'purpose, tone, completeness, organization',
  },
  task2: {
    id: 'task2',
    label: 'Task 2 · Survey Response',
    minutes: 26,
    targetWords: '150–200 words',
    focus: 'clear opinion, support, comparison, organization',
  },
};

export const CELPIP_LEVEL_GUIDE = [
  { level: 12, label: 'Advanced proficiency', descriptor: 'Fully developed response, precise control, strong flexibility, and only rare minor errors.' },
  { level: 11, label: 'Very strong proficiency', descriptor: 'Well-developed, highly clear writing with strong tone control and only small lapses.' },
  { level: 10, label: 'Effective proficiency', descriptor: 'Clear, organized, and detailed writing that handles the task well with minor weaknesses.' },
  { level: 9, label: 'Good proficiency', descriptor: 'Generally effective writing with good support and noticeable but non-blocking language issues.' },
  { level: 8, label: 'Adequate proficiency', descriptor: 'Task is mostly completed and understandable, but support, range, or accuracy may be uneven.' },
  { level: 7, label: 'Developing proficiency', descriptor: 'Main message is understandable, but organization, tone, detail, or grammar control is limited.' },
  { level: 6, label: 'Limited proficiency', descriptor: 'Response is partly developed with frequent language problems and weak support.' },
  { level: 5, label: 'Basic proficiency', descriptor: 'Meaning is inconsistent, support is thin, and errors make the writing difficult at times.' },
  { level: 4, label: 'Below test standard', descriptor: 'Response is incomplete or unclear, with major problems in task fulfillment and language control.' },
];

const TASK1_ISSUES = [
  {
    key: 'noise-complaint',
    title: 'Noise complaint',
    scenario: 'A neighbor in your building has been making loud noise late at night for the past week.',
    impact: 'You cannot sleep well and your work performance is dropping.',
    action: 'ask for immediate enforcement of quiet hours after 10 PM',
  },
  {
    key: 'schedule-change',
    title: 'Schedule change request',
    scenario: 'Your family situation changed and you need a temporary schedule adjustment.',
    impact: 'Your current timetable conflicts with essential responsibilities.',
    action: 'request a two-week schedule adjustment and suggest alternatives',
  },
  {
    key: 'service-delay',
    title: 'Service delay complaint',
    scenario: 'A service provider promised completion by a fixed date but has delayed repeatedly.',
    impact: 'You have missed deadlines and experienced extra stress.',
    action: 'request a firm completion date and compensation',
  },
  {
    key: 'course-refund',
    title: 'Refund request',
    scenario: 'You paid for a short course that was canceled with very short notice.',
    impact: 'You lost both money and preparation time.',
    action: 'request a full refund or immediate transfer to another session',
  },
  {
    key: 'facility-problem',
    title: 'Facility maintenance issue',
    scenario: 'A shared facility in your building has not been functioning for several days.',
    impact: 'Daily routines are disrupted for you and other residents.',
    action: 'ask for urgent repair and a temporary workaround',
  },
  {
    key: 'membership-error',
    title: 'Billing error correction',
    scenario: 'You were charged twice for a monthly membership.',
    impact: 'Your budget is affected and you cannot continue payments confidently.',
    action: 'request a refund for the duplicate charge and written confirmation',
  },
  {
    key: 'delivery-problem',
    title: 'Missing delivery item',
    scenario: 'Your online order arrived with an essential item missing.',
    impact: 'You cannot complete your planned study or work task.',
    action: 'request express replacement shipping or a partial refund',
  },
  {
    key: 'policy-appeal',
    title: 'Policy exception request',
    scenario: 'A policy was applied to your case without considering special circumstances.',
    impact: 'You face an unfair penalty despite acting responsibly.',
    action: 'request a fair review and a one-time exception',
  },
  {
    key: 'program-feedback',
    title: 'Program improvement suggestion',
    scenario: 'A program you attend has repeated organizational issues.',
    impact: 'Participants lose time and confidence in the program.',
    action: 'suggest practical improvements and request a response timeline',
  },
  {
    key: 'booking-conflict',
    title: 'Booking conflict resolution',
    scenario: 'Your confirmed booking was changed without notice.',
    impact: 'You had to rearrange important plans at the last minute.',
    action: 'request reinstatement of your original booking or an equivalent solution',
  },
];

const TASK1_RECIPIENTS = [
  { key: 'building-manager', role: 'building manager', signoff: 'Sincerely' },
  { key: 'customer-service', role: 'customer service manager', signoff: 'Best regards' },
  { key: 'program-coordinator', role: 'program coordinator', signoff: 'Kind regards' },
  { key: 'supervisor', role: 'supervisor', signoff: 'Thank you' },
  { key: 'city-office', role: 'city service office representative', signoff: 'Respectfully' },
];

const buildSampleLevelMeta = (taskType) => ({
  sampleLevel: 'CLB 9',
  sampleLevelWhy: taskType === 'task1'
    ? [
        'Uses formal tone and audience-appropriate register throughout the email.',
        'Fully addresses purpose, impact, and requested action with clear organization.',
        'Shows strong grammar control and precise vocabulary with only minor risk points.',
      ]
    : [
        'Presents a clear position and sustains it with relevant support and comparison.',
        'Uses cohesive transitions and paragraphing to maintain logical flow.',
        'Demonstrates varied sentence structure and controlled grammar expected at CLB 9+.',
      ],
});

const buildTask1Sample = (issue, recipient, index) => `Dear ${recipient.role},

I am writing to report an ongoing issue regarding ${issue.scenario.toLowerCase()}.

Over the last several days, this problem has become increasingly difficult to manage. ${issue.impact} Consequently, I have had to reorganize my schedule and spend additional time addressing a situation that should be resolved through normal procedures.

I would appreciate your support to ${issue.action}. This is a practical and proportionate step that would improve conditions quickly for everyone affected. If required, I can provide a short incident log with dates and times to support your review.

Please let me know what action can be taken and when I can expect an update. Thank you for your time and consideration.

${recipient.signoff},
Candidate ${index + 1}`;

const task1Prompts = TASK1_ISSUES.flatMap((issue) =>
  TASK1_RECIPIENTS.map((recipient, recipientIndex) => {
    const index = TASK1_RECIPIENTS.findIndex((item) => item.key === recipient.key) +
      TASK1_ISSUES.findIndex((item) => item.key === issue.key) * TASK1_RECIPIENTS.length;
    return {
      id: `email-${issue.key}-${recipient.key}`,
      title: `${issue.title} to a ${recipient.role}`,
      scenario: `Write an email to your ${recipient.role}. ${issue.scenario} ${issue.impact}`,
      instructions: [
        'Explain the situation clearly with relevant context.',
        'Describe the impact on you using specific details.',
        `Politely ${issue.action}.`,
      ],
      sampleResponse: buildTask1Sample(issue, recipient, index + recipientIndex),
      ...buildSampleLevelMeta('task1'),
    };
  })
).slice(0, 50);

const TASK2_TOPICS = [
  {
    key: 'online-vs-inperson',
    title: 'Online classes or in-person classes',
    question: 'Which option is better for adult learners?',
    options: ['Online classes', 'In-person classes'],
  },
  {
    key: 'public-transport',
    title: 'More buses or more bike lanes',
    question: 'If a city receives new transportation funding, which choice is better?',
    options: ['More bus routes', 'More bike lanes'],
  },
  {
    key: 'work-model',
    title: 'Work from home or work in office',
    question: 'Which model is better for most employees?',
    options: ['Work from home', 'Work in office'],
  },
  {
    key: 'save-vs-travel',
    title: 'Save money or travel now',
    question: 'Which is the better choice for someone with extra money?',
    options: ['Save for the future', 'Travel now'],
  },
  {
    key: 'small-vs-large-event',
    title: 'Small event or large event',
    question: 'Which is better for most families?',
    options: ['Small event', 'Large event'],
  },
  {
    key: 'reading-vs-video',
    title: 'Reading or watching videos to learn',
    question: 'Which helps people learn more effectively?',
    options: ['Reading', 'Watching videos'],
  },
  {
    key: 'car-vs-transit',
    title: 'Buy a car or rely on transit',
    question: 'Which is the better option for newcomers in cities?',
    options: ['Buy a car', 'Use public transit'],
  },
  {
    key: 'rent-vs-buy',
    title: 'Rent a home or buy a home',
    question: 'Which is better for young professionals early in their career?',
    options: ['Rent a home', 'Buy a home'],
  },
  {
    key: 'team-vs-individual',
    title: 'Team projects or individual projects',
    question: 'Which approach is better in education?',
    options: ['Team projects', 'Individual projects'],
  },
  {
    key: 'morning-vs-evening',
    title: 'Morning study or evening study',
    question: 'Which schedule is more effective for most adults?',
    options: ['Morning study', 'Evening study'],
  },
];

const TASK2_CONTEXTS = [
  'for newcomers adapting to life in Canada',
  'for busy working adults',
  'for college students under deadline pressure',
  'for parents balancing work and family',
  'for people preparing for language tests',
];

const buildTask2Sample = (topic, context, index) => `I believe ${topic.options[0].toLowerCase()} is the better option ${context}. In most real-life situations, this choice is more practical because it improves consistency and allows people to allocate time and resources efficiently. It also reduces avoidable stress and supports better long-term planning.

For example, when people apply this option consistently, they can build a stable routine and achieve measurable progress over time. By contrast, the alternative can still be useful in specific cases, but it often relies on ideal conditions that are not always realistic.

Overall, while both choices have value, ${topic.options[0].toLowerCase()} remains the more realistic and beneficial option for most people in this context. It offers stronger outcomes, better balance, and fewer unexpected setbacks.

Sample writer ${index + 1}`;

const task2Prompts = TASK2_TOPICS.flatMap((topic) =>
  TASK2_CONTEXTS.map((context, contextIndex) => {
    const index = TASK2_CONTEXTS.findIndex((item) => item === context) +
      TASK2_TOPICS.findIndex((item) => item.key === topic.key) * TASK2_CONTEXTS.length;
    return {
      id: `survey-${topic.key}-${contextIndex + 1}`,
      title: `${topic.title} (${context})`,
      question: `${topic.question} ${context}`,
      options: topic.options,
      sampleResponse: buildTask2Sample(topic, context, index + contextIndex),
      ...buildSampleLevelMeta('task2'),
    };
  })
).slice(0, 50);

export const CELPIP_PROMPT_BANK = {
  task1: task1Prompts,
  task2: task2Prompts,
};

export const CELPIP_PROMPT_TOTAL = CELPIP_PROMPT_BANK.task1.length + CELPIP_PROMPT_BANK.task2.length;

export function getPromptById(taskType, promptId) {
  return CELPIP_PROMPT_BANK[taskType]?.find((prompt) => prompt.id === promptId) || null;
}

export function getLevelDescriptor(level) {
  return CELPIP_LEVEL_GUIDE.find((item) => item.level === Number(level)) || CELPIP_LEVEL_GUIDE[CELPIP_LEVEL_GUIDE.length - 1];
}
