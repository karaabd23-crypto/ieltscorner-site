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

export const CELPIP_SAMPLE_LEVELS = [
  { key: 'clb5', label: 'CLB 5' },
  { key: 'clb7', label: 'CLB 7' },
  { key: 'clb9', label: 'CLB 9' },
  { key: 'clb11', label: 'CLB 11' },
];

export function getPromptSampleResponses(prompt) {
  const sampleResponses = prompt?.sampleResponses && typeof prompt.sampleResponses === 'object'
    ? prompt.sampleResponses
    : {};

  return {
    clb5: String(sampleResponses.clb5 || '').trim(),
    clb7: String(sampleResponses.clb7 || '').trim(),
    clb9: String(sampleResponses.clb9 || prompt?.sampleResponse || '').trim(),
    clb11: String(sampleResponses.clb11 || '').trim(),
  };
}

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
  sampleLevel: 'CLB 9+',
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

const buildTask1SampleClb5 = (issue, recipient, index) => `Dear ${recipient.role},

I am writing to you because I have a problem. ${issue.scenario} This problem is very bad for me because ${issue.impact.charAt(0).toLowerCase() + issue.impact.slice(1)} I try to fix it myself but nothing is working. Every day this problem is getting worse and I am very tired of this situation.

I think you can help me with this problem. I want you to ${issue.action}. I think this is very important because if we do not fix this now, the problem will get worse. I know you are busy, but I really need your help because I cannot do this alone.

I hope you can read my email and help me soon. Please tell me when you can do something about this. I am waiting for your answer. Thank you very much for your time.

Thank you,
Candidate ${index + 1}`;

const buildTask1SampleClb7 = (issue, recipient, index) => `Dear ${recipient.role},

I am writing to inform you about a problem that has been affecting me recently. ${issue.scenario} Because of this situation, ${issue.impact.charAt(0).toLowerCase() + issue.impact.slice(1)} This has been going on for some time now, and it is making my daily routine much more difficult than it needs to be.

I have tried to deal with this situation on my own, but unfortunately it has not improved at all. In fact, the problem seems to be getting worse as time goes on. I feel that this issue needs to be addressed by someone with the authority to take proper action.

I would like to respectfully ask you to ${issue.action}. I believe this is a reasonable step that would resolve the problem quickly and prevent any further difficulties. Please let me know what you are able to do and when I can expect an update.

Thank you for taking the time to read this email. I look forward to your response.

${recipient.signoff},
Candidate ${index + 1}`;

const buildTask1Sample = (issue, recipient, index) => `Dear ${recipient.role},

I am writing to report an ongoing issue regarding ${issue.scenario.toLowerCase()}.

Over the last several days, this problem has become increasingly difficult to manage. ${issue.impact} Consequently, I have had to reorganize my schedule and spend additional time addressing a situation that should be resolved through normal procedures. The disruption has affected both my daily routine and my ability to complete important tasks, which is not something I take lightly.

I would appreciate your support to ${issue.action}. This is a practical and proportionate step that would improve conditions quickly for everyone affected. If required, I can provide a short incident log with dates, times, and specific details to support your review.

Please let me know what action can be taken and when I can expect an update. I am available to discuss this further if it would be helpful. Thank you for your time and consideration.

${recipient.signoff},
Candidate ${index + 1}`;

const buildTask1SampleClb11 = (issue, recipient, index) => `Dear ${recipient.role},

I am writing to bring a matter of some urgency to your attention regarding ${issue.scenario.toLowerCase()}. Although I appreciate that operational demands may complicate an immediate resolution, the situation has reached a point where continued inaction could result in further disruption.

To provide context, ${issue.impact.charAt(0).toLowerCase() + issue.impact.slice(1)} The cumulative effect has been both professionally inconvenient and personally frustrating, and I have made reasonable efforts to manage the situation independently before escalating.

I would respectfully ask that you ${issue.action}. This represents a proportionate and achievable step that would address the most pressing aspect of the problem. Should it be helpful, I am prepared to provide supporting documentation to facilitate your review.

I appreciate your willingness to consider this matter and would welcome the opportunity to discuss a workable solution at your earliest convenience.

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
      sampleResponses: {
        clb5: buildTask1SampleClb5(issue, recipient, index + recipientIndex),
        clb7: buildTask1SampleClb7(issue, recipient, index + recipientIndex),
        clb9: buildTask1Sample(issue, recipient, index + recipientIndex),
        clb11: buildTask1SampleClb11(issue, recipient, index + recipientIndex),
      },
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

const buildTask2SampleClb5 = (topic, context, index) => `I think ${topic.options[0].toLowerCase()} is better ${context}. This is good because it helps people a lot. Many people I know also choose this one because it is easier for them and their family. I also think it is better for people who are busy and do not have much free time.

For example, if you choose ${topic.options[0].toLowerCase()}, you can save more time and you do not need to worry about many problems. My friend tried this and it worked very well for her. She said it is much better than before and she is very happy now. She told me it changed her life in a good way.

The other choice, ${topic.options[1].toLowerCase()}, is also okay sometimes. But I think it is harder for most people and it takes more time and money. Not everyone can do this easily.

So I think ${topic.options[0].toLowerCase()} is the best choice for most people. It is simple, it works well, and many people can use it in their daily life. That is why I recommend it.

Writer ${index + 1}`;

const buildTask2SampleClb7 = (topic, context, index) => `In my opinion, ${topic.options[0].toLowerCase()} is the better option ${context}. There are several important reasons why I believe this is a more practical choice for most people.

First of all, ${topic.options[0].toLowerCase()} gives people more control over their time and helps them manage their responsibilities more effectively. For example, people who choose this option can plan their schedules better, avoid many common problems, and focus on what really matters to them. Over time, this leads to less stress and better results.

On the other hand, ${topic.options[1].toLowerCase()} can work in certain situations, but it is often more difficult to manage. Many people find that it requires too much time and effort, and the results are not always consistent.

In conclusion, while both options have some benefits, I think ${topic.options[0].toLowerCase()} is a more practical and realistic choice for most people. It provides better balance and more consistent outcomes in everyday life.

Writer ${index + 1}`;

const buildTask2Sample = (topic, context, index) => `I believe ${topic.options[0].toLowerCase()} is the better option ${context}. In most real-life situations, this choice is more practical because it improves consistency and allows people to allocate time and resources efficiently. It also reduces avoidable stress and supports better long-term planning.

For example, when people apply this option consistently, they can build a stable routine and achieve measurable progress over time. The results tend to compound, meaning that small improvements each week lead to significant gains in the long run. By contrast, the alternative can still be useful in specific cases, but it often relies on ideal conditions that are not always realistic.

Overall, while both choices have value, ${topic.options[0].toLowerCase()} remains the more realistic and beneficial option for most people in this context. It offers stronger outcomes, better day-to-day balance, and fewer unexpected setbacks. For these reasons, I would recommend it as the preferred approach.

Sample writer ${index + 1}`;

const buildTask2SampleClb11 = (topic, context, index) => `When weighing the merits of ${topic.options[0].toLowerCase()} against ${topic.options[1].toLowerCase()} ${context}, I am firmly of the view that the former represents a more sustainable and universally accessible choice.

The principal advantage of ${topic.options[0].toLowerCase()} lies in the degree of autonomy and predictability it affords. Individuals who adopt this approach are better positioned to tailor their efforts to their own circumstances and sustain engagement that produces compounding benefits over time. A working professional juggling family obligations and career development, for instance, can allocate limited hours strategically rather than conforming to rigid external constraints.

That said, ${topic.options[1].toLowerCase()} should not be dismissed entirely. In settings where structured accountability or social reinforcement is essential, it can deliver distinct benefits. However, these advantages tend to be situational rather than systemic, and for the majority of people navigating competing priorities, they do not outweigh the flexibility that ${topic.options[0].toLowerCase()} provides.

In sum, ${topic.options[0].toLowerCase()} consistently emerges as the more practical and rewarding option for the widest range of individuals.

Writer ${index + 1}`;

const task2Prompts = TASK2_TOPICS.flatMap((topic) =>
  TASK2_CONTEXTS.map((context, contextIndex) => {
    const index = TASK2_CONTEXTS.findIndex((item) => item === context) +
      TASK2_TOPICS.findIndex((item) => item.key === topic.key) * TASK2_CONTEXTS.length;
    return {
      id: `survey-${topic.key}-${contextIndex + 1}`,
      title: `${topic.title} (${context})`,
      question: `${topic.question} ${context}`,
      options: topic.options,
      sampleResponses: {
        clb5: buildTask2SampleClb5(topic, context, index + contextIndex),
        clb7: buildTask2SampleClb7(topic, context, index + contextIndex),
        clb9: buildTask2Sample(topic, context, index + contextIndex),
        clb11: buildTask2SampleClb11(topic, context, index + contextIndex),
      },
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

// ============================================================
// PRACTICE HUB – TASK 1 SIDEBAR PROMPTS
// ============================================================

export const CELPIP_FREE_TASK_ID = 'informal-pet-sitting';

const INFORMAL_SAMPLE_META = {};

const CELPIP_INFORMAL_PROMPTS = [
  {
    id: 'informal-pet-sitting',
    formality: 'Informal',
    sidebarLabel: 'Pet Sitting',
    title: 'Pet sitting request',
    scenario: 'You are planning a week-long trip to Halifax next month to visit your elderly parents. You have a friendly dog named Biscuit that you cannot bring with you on the trip. Your neighbour has met Biscuit several times and even looked after him for a weekend last summer.',
    instructions: [
      'Explain why you are going away and the exact dates you will need help with your dog.',
      "Describe your dog's daily routine and any special care instructions your neighbour should know about.",
      "Offer to do something in return for your neighbour's help.",
    ],
    sampleResponses: {
      clb5: `Hi Sarah,

I am going to Halifax next month from March 14 to March 21. I need to visit my parents because they are old and they need my help. I cannot bring Biscuit with me on this trip so I need someone to take care of him. You are very good with him and he likes you very much. You helped me before last summer and it was very good.

Biscuit needs two walks every day. One walk is in the morning at 7 and one walk is at 6 in the evening. He eats half cup of food two times a day. He is a very good dog but sometimes he tries to go out from the gate. So please make sure you close the gate.

I want to help you too. Maybe I can water your plants or take you for dinner when I come back. Please let me know if you can help me.

Thank you very much,
Alex`,
      clb7: `Hi Sarah,

I hope you are doing well. I am writing because I need to travel to Halifax from March 14th to 21st to visit my elderly parents. They have been needing more support recently, so I want to spend a full week with them. Unfortunately, I cannot bring Biscuit with me on this trip.

I was wondering if you could look after him while I am away. You were wonderful with him when you watched him last summer, and he clearly enjoyed spending time with you.

His routine is fairly simple. He needs a short walk at about 7 a.m. and another at 6 p.m. He eats half a cup of dry food twice a day, in the morning and evening. He is very friendly and well-behaved, but you should always make sure the garden gate is latched because he sometimes tries to get out.

I would be happy to return the favour any time. I could water your plants, help with errands, or treat you to dinner when I get back. Let me know if this works for you.

Thanks a lot,
Alex`,
      clb9: `Hi Sarah,

I hope you're doing well! I'm reaching out because I'll be heading to Halifax from March 14th to March 21st to visit my elderly parents — they've been needing extra support lately and I don't want to miss the chance to spend time with them.

Unfortunately, I can't bring Biscuit on this trip, so I was hoping you might be willing to look after him while I'm away. You were absolutely wonderful with him last summer, and he clearly adores you!

Biscuit's routine is pretty easygoing. He needs two short walks a day — around 7 a.m. and 6 p.m. — and he eats half a cup of dry food at 7 a.m. and 5 p.m. He's well-behaved and loves his squeaky toy. Just be sure to latch the garden gate, as he sometimes tries to sneak out!

I'd love to return the favour in any way I can — maybe watch your plants while you're away next time, or treat you to dinner when I get back.

Please let me know if this works for you. Thanks so much in advance!

Warm regards,
Alex`,
      clb11: `Hi Sarah,

I hope this message finds you well! I'm getting in touch because I'll be travelling to Halifax from March 14th through the 21st to spend some much-needed time with my elderly parents, who have been requiring a bit more support lately.

Naturally, Biscuit can't come along for the trip, and it occurred to me that you might be the perfect person to keep him company while I'm away. He was thoroughly smitten with you after that weekend last summer, and I know he'd be in excellent hands.

His daily routine is straightforward. He takes two short walks — one around 7 a.m. and another at 6 p.m. — and eats half a cup of dry food at 7 a.m. and again at 5 p.m. He's generally very well-behaved, though he has a talent for nudging the garden gate open if it isn't fully latched, so it's worth double-checking after each walk.

I'd genuinely love to reciprocate in whatever way suits you — whether that's looking after your place during your next trip or treating you to dinner.

Do let me know if this works for your schedule!

Warmly,
Alex`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-celebration',
    formality: 'Informal',
    sidebarLabel: 'Celebration Support',
    title: 'Surprise party planning request',
    scenario: 'Your close friend and colleague is turning 40 next month. You want to organize a surprise birthday dinner at their favourite restaurant and need help from another close friend who knows the guest of honour well.',
    instructions: [
      'Explain the plan for the surprise celebration, including the date and venue.',
      'Describe what specific help you need from your friend to organize the event.',
      'Suggest a time to meet this week to finalize the details.',
    ],
    sampleResponses: {
      clb5: `Hi Jamie,

How are you? I am writing because I want to plan a surprise birthday dinner for Priya. She is turning 40 next month and I want to make it very special for her. I know she will be very happy.

I booked a private room at Rosetta's restaurant for Saturday, May 10 at 7 p.m. Priya loves this restaurant very much. The plan is to tell her we are going for a normal dinner so she does not know about the surprise. Please do not tell her about this plan.

I need your help with some things. Can you please call her sister and some of her old friends from work and ask them if they can come? I need to know by April 25. Also, I need help to choose a good gift for her because you know what she likes better than me.

Can we meet this week to talk about the plan? Thursday or Friday afternoon is good for me. Let me know what day works for you.

Thanks,
Sam`,
      clb7: `Hi Jamie,

How are you? I'm writing because I'm planning a surprise birthday dinner for Priya. She's turning 40 next month and I really want to do something special for her.

I have already booked a private room at Rosetta's for Saturday, May 10th at 7 p.m. She loves that restaurant, so I think it's the perfect place. The plan is to tell her that we're going for a casual dinner with friends so she doesn't find out about the surprise.

I need your help to make this work. Could you contact her sister and a few of her old work friends and get their RSVPs by April 25th? It would also be great if you could help me choose a gift for her. You know her taste much better than I do, so your opinion would really help.

Would you be free to meet for coffee this week so we can go over all the details? Thursday or Friday afternoon works well for me. Let me know what works for you.

Thanks so much,
Sam`,
      clb9: `Hi Jamie,

Hope things are great with you! I'm reaching out because I've been putting together a surprise birthday dinner for Priya — she's turning 40 next month and I really want it to be special.

I've booked a private room at Rosetta's for Saturday, May 10th at 7 p.m. I know she loves it there. The plan is to tell her we're going for a casual dinner, so I need a few of us to keep things hush-hush until she walks in!

Here's where I could really use your help: I'd love for you to reach out to her sister and a few friends from her old job and get their RSVPs by April 25th. It would also be great if you could help me pick out a gift — you know her taste much better than I do!

Would you be free to grab coffee sometime this week to go over the details? Thursday or Friday afternoon works best for me.

Let me know what you think — I really hope you can help make this happen!

Cheers,
Sam`,
      clb11: `Hi Jamie,

I hope you're doing wonderfully! I've been quietly putting something together for Priya's 40th and I'd love to loop you in — I think it could be really special with your help.

I've secured a private dining room at Rosetta's for Saturday, May 10th at 7 p.m. The plan is to steer her there under the pretence of a casual dinner, so we'll need to keep everything under wraps until she walks through the door.

Here's what I'm hoping you could take on: reaching out to her sister and a handful of friends from her old office to collect RSVPs by April 25th. You have such a natural way with people that I think the invitations would feel more personal coming from you. I'd also love your help selecting a gift — you understand her taste far better than I could.

Would you have any time this week to sit down over coffee and hash out the details? I'm flexible Thursday or Friday afternoon.

Let me know — I genuinely couldn't pull this off without you!

Cheers,
Sam`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-moving-help',
    formality: 'Informal',
    sidebarLabel: 'Moving Help',
    title: 'Help with apartment move',
    scenario: 'You are moving to a new apartment in a different part of the city next weekend. You have several large pieces of furniture that will not fit in a regular car. Your friend has a truck and helped you move once before.',
    instructions: [
      'Explain why you are moving and the exact date you need help.',
      'Describe what specific help you need from your friend.',
      'Offer to compensate your friend for their time and effort.',
    ],
    sampleResponses: {
      clb5: `Hi Marcus,

How are you? I want to tell you some good news. I found a very nice apartment in Westmount. It has two bedrooms and it is close to the bus and metro. I am very excited about this new place. I am signing the lease on April 30.

The problem is I have some very big furniture. I have a sofa, a bed, and a big bookshelf. These things are too big for my car. I remember you have a truck and you helped me move before. Can you please help me again on Saturday, May 3? I think we need to make two or three trips but it should not take the whole day.

I want to thank you for your help. I will buy pizza and drinks for us. Also, if you need help with anything at your house later, like painting or fixing things, I am very happy to help you too.

Please tell me if you are free that Saturday. Thank you very much!

Jordan`,
      clb7: `Hey Marcus,

How's it going? I have some big news — I'm moving to Westmount! I found a nice two-bedroom apartment with much better access to transit, and I'm signing the lease on April 30th. I'm really excited about the new place.

The only problem is that I have several large pieces of furniture, including a sectional sofa, a queen-sized bed frame, and a bookshelf. These definitely won't fit in a regular car. I was wondering if you could help me move with your truck on Saturday, May 3rd. I think two or three trips should be enough to get everything over there, and I don't think it will take more than half the day.

Of course, I will buy pizza and drinks for us during the move. I'm also happy to help you with any projects you have coming up, whether it's painting, repairs, or anything else you need.

Let me know if that Saturday works for you. I really appreciate it either way!

Jordan`,
      clb9: `Hey Marcus,

Hope you're having a great week! I'm finally making the big move to Westmount — I found a great two-bedroom with much better transit access, and I sign the lease on April 30th.

The only challenge is that I have a few large items — a sectional sofa, a queen-sized bed frame, and a bookshelf — that definitely won't fit in a regular car. I was wondering if there's any chance you'd be willing to lend a hand and bring your truck? I'm planning to do the move on Saturday, May 3rd, and I think two or three trips should cover everything. It shouldn't take more than half the day.

I wouldn't ask if I didn't really need the help, and I promise to make it worth your while. Pizza and drinks are absolutely on me, and I'll happily help you out with any projects you've got coming up — painting, repairs, whatever you need.

Let me know if you're free that Saturday. I really appreciate it!

Talk soon,
Jordan`,
      clb11: `Hey Marcus,

I hope your week's been going smoothly! I have some exciting news — I've finally locked in a two-bedroom place in Westmount with much better transit access, and I'm signing the lease on April 30th.

The one logistical challenge I'm facing is that a few of my larger pieces — the sectional sofa, queen-sized bed frame, and that monster bookshelf — simply won't fit in a standard vehicle. I was wondering whether you might be available to lend a hand with your truck on Saturday, May 3rd. I've mapped it out and I believe two or three trips should comfortably cover everything, so we'd likely be wrapped up well before the afternoon.

I wouldn't dream of asking without making it worth your while. Lunch, drinks, and snacks are entirely on me, and I'd be more than happy to return the favour whenever you have a project lined up — painting, repairs, heavy lifting, you name it.

Do let me know if that Saturday works for your schedule. I genuinely appreciate it either way!

Talk soon,
Jordan`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-vacation-photos',
    formality: 'Informal',
    sidebarLabel: 'Vacation Photos',
    title: 'Sharing vacation experience',
    scenario: 'You recently returned from a two-week vacation in Japan. You had many memorable experiences and took a lot of photos. Your classmate had mentioned before you left that they were also hoping to visit Japan someday.',
    instructions: [
      'Tell your classmate about your trip and what you enjoyed most.',
      'Share some practical advice about what to do or avoid in Japan.',
      'Suggest getting together to look at photos and share your experiences in person.',
    ],
    sampleResponses: {
      clb5: `Hi Mei,

I am back from Japan! The trip was really amazing and I had a very good time. I was there for two weeks and I visited many places. I went to Kyoto, Osaka, and Nara. The food was very delicious. I ate ramen and takoyaki every day. I also went to many beautiful temples in Kyoto. In Nara I saw cherry blossoms and they were very beautiful. The bullet train was also very exciting and very fast.

I want to give you some advice for when you go to Japan. You should buy the JR pass before you leave Canada because it is much cheaper. Also, do not go in early May because there are too many people during Golden Week. You should also download Google Translate on your phone because it helps you read the menus.

I took a lot of photos and I want to show them to you. Do you want to have coffee or lunch this week? I can tell you all about my trip.

See you soon,
Sophie`,
      clb7: `Hi Mei,

I'm back from Japan and it was amazing! I thought about you a lot during the trip because I know you want to go there.

The best parts were the temples in Kyoto and the food market in Osaka. I tried so much ramen and takoyaki. The bullet train was also a great experience. I was lucky to see the cherry blossoms in Nara before the season ended.

Here are a few tips for when you go: buy the JR pass before you leave Canada because it's cheaper. Try to avoid Golden Week in early May because it's very crowded. Also, download the Google Translate camera — it helps a lot with reading menus.

I took hundreds of photos and would love to show you. Are you free for coffee or lunch this week? I can tell you everything and help you plan your trip.

Talk soon!
Sophie`,
      clb9: `Hi Mei,

I'm back! Japan was absolutely incredible — honestly one of the best trips I've ever taken. I kept thinking of you throughout because I know you've wanted to visit for ages!

The highlights for me were Kyoto's temples and the food market in Osaka. I ate my weight in ramen and takoyaki, and the bullet train experience alone was worth the trip. I also managed to catch the tail end of cherry blossom season in Nara, which was stunning.

A few tips if you do go: book your JR pass before you leave Canada — it's much cheaper that way — try to avoid the Golden Week holiday period in early May if you want fewer crowds, and download the Google Translate camera feature, which was a lifesaver for menus!

I have hundreds of photos I'd love to share with you. Would you be up for coffee or lunch one afternoon this week? I can walk you through everything and answer any questions you have about planning your own trip.

Can't wait to catch up!

Warmly,
Sophie`,
      clb11: `Hi Mei,

I'm finally back, and I have to say — Japan completely exceeded every expectation I had. I found myself thinking of you constantly because I know it's been on your bucket list for ages.

The temples in Kyoto were breathtaking, and the food scene in Osaka was on another level entirely — I practically lived on ramen and takoyaki. The bullet train was worth the trip for the sheer efficiency and the views of Mount Fuji. I also had the luck of catching cherry blossom season in Nara, which was nothing short of magical.

A handful of practical tips: purchase your JR pass before leaving Canada, as it's significantly cheaper in advance. Steer clear of Golden Week in early May unless you enjoy wall-to-wall crowds. And download Google Translate's camera feature — it was a lifesaver for menus and signage.

I came back with hundreds of photos and would love to walk you through them. Any chance you're free for coffee this week?

Warmly,
Sophie`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-family-support',
    formality: 'Informal',
    sidebarLabel: 'Family Support',
    title: 'Career advice from a family member',
    scenario: 'You are thinking seriously about leaving your current stable job to return to school full-time for a graduate degree. Your older sibling made a similar decision ten years ago and successfully transitioned careers afterward.',
    instructions: [
      'Explain the decision you are considering and why you are thinking about it now.',
      'Ask your sibling about their experience and what they would do differently.',
      'Ask when you could speak on the phone or meet to talk it through.',
    ],
    sampleResponses: {
      clb5: `Hi Priya,

How are you? I hope the family is good. I want to ask you something very important because I need your advice.

I am thinking about leaving my job at the firm. My job is stable and the salary is okay, but I don't feel I am growing anymore. I am bored and I don't learn new things. I want to go back to school full-time and study urban planning. It is something I always wanted to do. But I am a little scared because I will lose my income for two years.

I remember you left your finance job to do your MBA about ten years ago. Now you are doing very well and you have a great career. Can you tell me about your experience? Was it very hard? Did you have enough money? What would you do different if you could go back?

Can we talk on the phone this week or next week? Even 30 minutes is enough. I really need to hear from you before I decide.

Thank you so much,
Dev`,
      clb7: `Hi Priya,

I hope you and the family are doing well! I wanted to talk to you about something important that I've been thinking about.

I'm seriously considering leaving my job at the firm to go back to school for a master's in urban planning. My current work is stable, but I feel like I've reached a point where I'm not growing anymore. This program has always been something I wanted to do, and I think now might be the right time.

I know you went through something similar when you left your finance job for your MBA, and you ended up in a much better place. I'd really like to hear about what the experience was like for you — what was harder than you expected, and what you would do differently.

Would you have time for a phone call this week or next? Even 30 minutes would really help me think through this.

Thanks so much,
Dev`,
      clb9: `Hi Priya,

I hope everything is going well with you and the family! I've been meaning to reach out because I'm facing a big decision and your experience is exactly what I need to hear.

I've been seriously considering leaving my job at the firm to go back to school full-time for a master's in urban planning. The work I do now is stable, but I feel like I've hit a ceiling, and this graduate program has always been something I've thought about. I just can't shake the feeling that now is the right time to do it.

I know you went through something similar when you left your finance role to go back for your MBA, and you came out the other side in a much better place. I'd love to know what the experience was really like — what was harder than expected, what you'd do differently, and whether timing matters as much as people say.

Would you be free for a call sometime this week or next? Even 30 minutes would help me think this through.

Thanks so much,
Dev`,
      clb11: `Hi Priya,

I hope everything's going beautifully with you and the family! I've been mulling something over for quite a while, and I keep coming back to the thought that your perspective is exactly what I need.

I'm seriously considering stepping away from my position at the firm to pursue a full-time master's in urban planning. The work has been stable, but the growth opportunities feel genuinely exhausted, and this program has sat at the back of my mind for years. There's a strong voice telling me that if I don't make the leap now, I may never find a better window.

Your experience resonates deeply with what I'm facing — leaving a secure finance role to pursue your MBA was bold, and the career trajectory that followed speaks for itself. I'd be incredibly grateful to hear the unfiltered version: what was more challenging than anticipated, what you'd approach differently, and how much the timing ultimately mattered.

Would you be able to carve out time for a call this week or next? Even half an hour would go a long way toward helping me think this through.

With love,
Dev`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-sports-support',
    formality: 'Informal',
    sidebarLabel: 'Sports Support',
    title: 'Inviting a friend to join a sports team',
    scenario: 'You recently joined a community soccer team and have been enjoying it a lot. Your team urgently needs one more player to avoid forfeiting upcoming games. Your friend is athletic and mentioned playing soccer in high school.',
    instructions: [
      'Explain the situation with the team and why one more player is needed urgently.',
      'Describe what the commitment involves in terms of time, location, and skill level.',
      'Encourage your friend to join and explain what you think they will enjoy.',
    ],
    sampleResponses: {
      clb5: `Hi Carlos,

How are you? I have a fun question for you. I joined a soccer team in September and I really like it. We play every Sunday morning at Centennial Park from 10 to 12. The people are very nice and it is good exercise.

But we have a problem now. One of our players moved to Vancouver last week. We need one more person on the team. If we don't find someone soon, we will have to give up some games. That would be very bad because everyone worked hard this season.

I thought of you right away because I remember you played soccer in high school. You were very good! The level is not too serious. Some people are very good and some are beginners. Everyone is friendly and we have a good time. After the game we always go eat together at a restaurant near the park.

Do you want to come this Sunday to try? There is no commitment. You can just come and see if you like it.

Let me know!
Lena`,
      clb7: `Hey Carlos,

How's it going? I have a fun question for you. I joined a recreational soccer league back in September and I'm really enjoying it. We play every Sunday morning at Centennial Park from 10 to noon.

The problem is that one of our players just moved to Vancouver, and now we need one more person. If we don't find someone soon, we might have to forfeit some games. That would be really disappointing because the team has worked hard all season.

I thought of you right away because I remember you played in high school. The level is casual but still competitive enough to be fun. Even if you're a bit rusty, everyone is very welcoming and the skill levels are mixed. We also usually grab food together after the game, which is always a great time.

Would you like to come this Sunday to try it out? There's no commitment needed. I think you'd really enjoy it.

Let me know!
Lena`,
      clb9: `Hey Carlos,

Hope you're doing well! I have a fun question for you — how would you feel about joining my soccer team?

I joined a recreational league back in September and I'm really enjoying it. We play on Sunday mornings at Centennial Park, usually from 10 to noon. The level is casual but competitive enough to keep things interesting. The problem is, one of our players just moved to Vancouver and now we're one short — which means we could be forced to forfeit games if we don't fill the spot soon.

I immediately thought of you. I remember you mentioning you played in high school, and honestly even if you're a bit rusty, this group is super welcoming. It's a mixed skill level, everyone's there to have fun, and we usually grab food together after the game.

No pressure, but I think you'd really enjoy it — it's a great way to stay active and meet some great people. Would you be up for coming out this Sunday just to try it? No commitment needed.

Let me know!

Cheers,
Lena`,
      clb11: `Hey Carlos,

I hope you're doing well! I've got a question for you that I think you might actually enjoy — how would you feel about lacing up your boots and joining my soccer team?

I signed up for a recreational league back in September and it's honestly become one of the highlights of my week. We play Sunday mornings at Centennial Park from 10 to noon, and the level strikes a wonderful balance between casual and competitive. The catch is that one of our regulars just relocated to Vancouver, leaving us a player short — and without a replacement, we risk forfeiting upcoming matches.

You were the first person who came to mind. I distinctly remember you mentioning that you played through high school, and even if it's been a while, this group is incredibly welcoming and the skill range is broad. After every game we head out for food together, which has become its own tradition.

No pressure, but I genuinely think you'd love it — it's a fantastic way to stay active and meet great people. Would you be open to coming out this Sunday for a trial run?

Let me know!

Cheers,
Lena`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-recipe-help',
    formality: 'Informal',
    sidebarLabel: 'Recipe Help',
    title: 'Asking for a family recipe',
    scenario: "You are hosting a dinner party for eight people this weekend, including a close friend who has a nut allergy. You want to make your family member's famous lasagna but have never made it before and want to get it exactly right.",
    instructions: [
      'Explain why you are asking for the recipe and the occasion you are preparing for.',
      'Ask specific questions about the recipe or any steps you are unsure about.',
      'Ask whether any adjustments are needed for a guest with a nut allergy.',
    ],
    sampleResponses: {
      clb5: `Hi Aunt Rosa,

How are you? I hope you are doing well. I am writing to you because I need your help with something. I am having a dinner party this Saturday for 8 friends. I want to make your famous lasagna because everyone always says it is the best they ever ate. But I never made it before so I need the recipe and your advice.

I have some questions about the recipe. Do I need to cook the pasta sheets first? Or do I put them in the oven and they get soft from the sauce? Also how long should I let it cool before I cut it? I always see people make a mess when they cut too early.

Also I need to tell you that one of my friends has a nut allergy. It is very serious. I don't think the recipe has nuts in it but can you check for me? Maybe the sauce or the cheese has something with nuts. I want to make sure the food is safe for her.

Thank you so much!
Giulia`,
      clb7: `Hi Aunt Rosa,

I hope you're doing well! I'm hosting a dinner party for eight friends this Saturday and I've decided to make your famous lasagna. I've never made it from scratch before, so I need your help to get it right.

I have a few questions about the recipe. Should I pre-cook the pasta sheets or do they soften enough in the oven? Also, how long should I let the lasagna rest before I cut it? I always see people having problems with this.

One more thing — one of my guests has a nut allergy. I don't think the recipe uses nuts, but could you check if the béchamel sauce has any almond flour or anything similar? I want to make sure it's completely safe for her.

If you have time to call me or send the recipe with your notes, I would really appreciate it. I'll let you know how it turns out!

With love,
Giulia`,
      clb9: `Hi Aunt Rosa,

I hope you're doing well! I'm reaching out for some culinary guidance — I'm hosting a dinner party this Saturday for eight friends, and I've decided to finally attempt your famous lasagna. No pressure, right?

I know the recipe by heart in theory, but I've never actually made it from scratch and I want to do it justice. A few things I'm not sure about: should I pre-cook the pasta sheets, or do they soften enough in the oven? And how long do you usually let it rest before cutting — I always make a mess when I slice it too soon!

Also, one of my guests has a nut allergy. I know the original recipe doesn't call for nuts, but I wanted to check in case the béchamel has any almond flour or anything like that. I want to make sure it's completely safe for her.

If you have a few minutes to call or send me the recipe with your notes, I would be so grateful. I promise to report back on how it goes!

With love,
Giulia`,
      clb11: `Hi Aunt Rosa,

I hope this finds you well! I'm writing because I've finally summoned the courage to attempt your legendary lasagna — I'm hosting a dinner party for eight friends this Saturday and I want to do the recipe proud.

I realise I've watched you make it a dozen times, but actually executing it solo is another matter entirely. A couple of things I'd love your guidance on: should the pasta sheets be parboiled beforehand, or will they hydrate from the sauce during baking? And what's your secret for timing the rest period before slicing?

There's one additional consideration — one of my guests has a fairly serious nut allergy. I'm fairly confident the traditional recipe is nut-free, but I wanted to check whether the béchamel calls for any almond flour or nut-based substitutes. Her safety is obviously the top priority.

If you could spare a few minutes for a quick call or jot down the recipe with your annotations, I would be enormously grateful. I'll send you a full report once the evening wraps up!

With all my love,
Giulia`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-birthday-mixup',
    formality: 'Informal',
    sidebarLabel: 'Birthday Mix-up',
    title: 'Apology for missing a birthday',
    scenario: "You completely forgot your best friend's birthday last week. This friend remembered your birthday earlier this year and organized a small surprise party for you. You feel very guilty and want to make it up to them.",
    instructions: [
      'Apologize sincerely for forgetting and explain how it happened.',
      'Suggest a specific way to celebrate late and make it up to your friend.',
      'Express how much the friendship means to you.',
    ],
    sampleResponses: {
      clb5: `Hi Nina,

I am very sorry I forgot your birthday. I feel really bad about it. I know it was last week and I didn't even call you or send a message. What happened is that I was very busy with starting my new job and also moving to a new apartment at the same time. I was very tired every day and the date went past me. But that is not a good excuse.

I feel even worse because you remembered my birthday earlier this year. You organized a surprise party for me and invited all our friends. It was one of the best nights I had this year. You are always so thoughtful and I should have done the same for you.

I want to make it up to you. Can I take you to dinner at that new restaurant on King Street? I will pay for everything. I also want to get you a nice gift. We can go this weekend or any day that is good for you.

Your friendship is very important to me and I am very sorry this happened.

Love,
Aisha`,
      clb7: `Hi Nina,

I am so sorry I missed your birthday last week. I feel terrible about it and I want to apologize properly.

I've been so busy with the move and starting my new job that the date completely slipped my mind. I know there's really no good excuse, especially because you remembered my birthday and organized a whole surprise party for me. That night was so special and it showed how thoughtful you are. I should have done the same for you and I'm really disappointed in myself.

I'd love to make it up to you if you'll let me. How about dinner at that new restaurant on King Street? My treat, of course. I'll also get you a proper belated gift. We could go this weekend, or whenever works best for you. Just pick the day and I'll be there.

Your friendship means so much to me, and you deserve to be celebrated properly. I promise I won't let this happen again.

With love,
Aisha`,
      clb9: `Hi Nina,

I honestly don't know where to start — I can't believe I missed your birthday. There's no real excuse. I've been so caught up with the move and the new job that the date completely slipped by me, and I am genuinely mortified. You didn't miss mine — you organized a whole surprise and went out of your way to make my day special. I should have done the same, and I'm so sorry I didn't.

I'd really love to make it up to you, if you'll let me. How about dinner at that new place on King Street you mentioned a while back — fully on me, of course? I'll also pick up a belated gift, though I know that doesn't quite cover it. We could go this weekend if you're free, or whenever works best for you.

I want you to know how much your friendship means to me. You're one of the most thoughtful people in my life, and you deserved to be celebrated properly. I'm so sorry, and I promise not to let this happen again.

With love and a lot of guilt,
Aisha`,
      clb11: `Hi Nina,

I truly don't know where to begin, because no arrangement of words feels adequate for how terrible I feel about missing your birthday. There's simply no justification — I allowed the move and the new position to consume me so completely that the date slipped past without a pause. You, meanwhile, not only remembered mine but went above and beyond to organise a surprise that made me feel genuinely special. The contrast isn't lost on me.

If you'll allow me, I'd love to make it right. I was thinking dinner at that new place on King Street you've been curious about — entirely my treat. I'll also track down a proper belated gift, though I realise no present fully compensates for the thoughtlessness. This weekend works for me, but I'm happy to work around your schedule.

What I most want you to know is how profoundly your friendship matters to me. You are one of the most considerate people I know, and you deserved to be celebrated with the same care you show everyone else. I give you my word this won't happen again.

With love,
Aisha`,
    },
    ...INFORMAL_SAMPLE_META,
  },
  {
    id: 'informal-svc-appreciation',
    formality: 'Informal',
    sidebarLabel: 'Service Appreciation',
    title: 'Thank you for help with renovation',
    scenario: 'Your neighbour spent an entire weekend helping you renovate your backyard. They brought their own tools, worked all day Saturday and Sunday without asking for anything in return, and the results look fantastic.',
    instructions: [
      'Thank your neighbour genuinely and mention specific things they did that helped.',
      'Explain the difference their help made to you.',
      'Offer to return the favour in a concrete and specific way.',
    ],
    sampleResponses: {
      clb5: `Hi David,

I want to say thank you very much for helping me with my backyard this weekend. You did so much work and everything looks great now. The deck looks beautiful and the garden beds are very nice.

You came with all your tools and you worked all day Saturday and all day Sunday. Even when it started raining on Sunday morning you didn't stop. You didn't ask for any money or anything. I really appreciate that because not everyone would do this. You are a very kind neighbour.

I was waiting for two years to fix the backyard. It was too much work for me alone. Now it looks amazing and I want to spend time outside every day. My family is also very happy with how it looks. This is all because of your help and your hard work.

I want to do something for you too. If you need help with anything at your house, please tell me. I can help with painting, repairs, moving furniture, or anything else. I am happy to help anytime.

Thank you again, David.

Marcus`,
      clb7: `Hi David,

I wanted to write to say a proper thank you for all the work you did this weekend on my backyard. The deck looks amazing and the garden beds turned out exactly how I wanted them.

What really impressed me was that you came with your own tools and worked the entire weekend without any complaint. Even when it rained on Sunday morning, you kept going. That kind of help is not easy to find.

I had been putting off this project for two years because it felt too big to do alone. Now, thanks to you, I actually want to spend time out there. That's completely because of your help and your patience.

Please let me know if there's anything I can do for you. If you have any projects at your place — painting, repairs, or anything else — I'm happy to help.

Thanks again, David.

Best,
Marcus`,
      clb9: `Hi David,

I just wanted to take a moment to say a proper thank you for everything you did this past weekend. I honestly could not have done it without you — the deck looks incredible and the garden beds are exactly what I had in mind.

What really stood out was how you came prepared with your own tools and just jumped right in without any fuss. You stayed the entire weekend even when the weather turned on Sunday morning, and you never once complained or made me feel like I was asking too much. That kind of generosity is rare, and I'm genuinely grateful.

The backyard was something I had been putting off for two years because it felt too overwhelming to tackle alone. Now it's actually a space I want to spend time in. That's entirely down to your help and your patience explaining things as we went.

I'd love to return the favour in some concrete way. Please let me know if there's anything around your place you've been meaning to get done — painting, repairs, anything at all. I'm there.

Thanks again, truly.

Best,
Marcus`,
      clb11: `Hi David,

I've been meaning to write you a proper thank-you ever since Sunday evening, because a casual "thanks" at the door didn't come close to capturing how grateful I am. The deck is stunning, the garden beds are precisely what I'd envisioned, and the whole backyard feels like a completely different space.

What struck me most was the way you showed up fully prepared — tools in hand, plan in mind — and simply got to work without hesitation. You powered through an entire weekend, including that miserable Sunday morning downpour, and never once gave the impression you had anywhere else you'd rather be. That kind of selfless generosity is genuinely rare.

For two years I'd been staring at that backyard feeling overwhelmed by the scope of the project. Now, thanks to your expertise and patience in walking me through every step, it's become the part of my home I'm most excited to use.

I want to return the favour in a meaningful way. Whenever you have a project — painting, repairs, landscaping — please don't hesitate to call. I'm there, no questions asked.

Thank you again, David.

Warmest regards,
Marcus`,
    },
    ...INFORMAL_SAMPLE_META,
  },
];

const FORMAL_EXTRA_SAMPLE_META = {};

const CELPIP_EXTRA_FORMAL_PROMPTS = [
  {
    id: 'formal-class-mismatch',
    formality: 'Formal',
    sidebarLabel: 'Class Mismatch',
    title: 'Incorrect class level complaint',
    scenario: 'You registered for an intermediate-level language class based on the description in the course catalogue. On the first day, you realized the class is taught at a basic level that does not match your current skills. You have already paid the full course fee.',
    instructions: [
      'Explain the problem clearly, referencing the course description in the catalogue.',
      'Describe how the level mismatch is affecting your learning goals.',
      'Request a transfer to the appropriate level or a partial refund.',
    ],
    sampleResponses: {
      clb5: `Dear Program Coordinator,

I am writing about a problem with my class. I signed up for the Intermediate English Writing class (Section 4B) because the catalogue said it is for B1–B2 students. I thought it would help me improve my writing skills and prepare for my work. But when I went to the first class, I was very surprised. The teacher is teaching beginner things that I already know well. The vocabulary is too easy and the grammar is very basic.

This is a big problem for me because I paid the full course fee. I am not learning anything new and I feel like I am wasting my time. I need a class that is at my level so I can actually improve. I came to this school because I trust your programs.

Can you please move me to a higher level class? I think the advanced section would be better for me. If there is no class available right now, can I get some of my money back so I can find another program?

Thank you for your time.

Sincerely,
Priya Sharma`,
      clb7: `Dear Program Coordinator,

I am writing to inform you about a concern with my current course. I registered for the Intermediate English Writing class (Section 4B) because the spring catalogue described it as designed for B1–B2 level learners. However, on the first day of class, I realized the content is being taught at a beginner level. The material covers topics I completed more than two years ago.

This level mismatch is significantly affecting my learning. I enrolled to improve my intermediate skills, and attending a class below my level is not helping me reach my goals. I am also concerned about the time I am spending on content that does not challenge me.

I would like to request a transfer to an appropriate level if one is available this session. If a transfer is not possible, I would appreciate a partial refund so I can enrol in a better-suited program.

Thank you for your time. I look forward to your response.

Sincerely,
Priya Sharma`,
      clb9: `Dear Program Coordinator,

I am writing to bring a serious concern to your attention regarding a course I recently enrolled in. I registered for the Intermediate English Writing course (Section 4B) based on the description in your spring catalogue, which stated that the class is designed for learners with a solid foundation at the B1–B2 level. However, on the first day of class, it became clear that the content is delivered at a beginner level, covering material I completed over two years ago.

This mismatch is significantly affecting my progress. I enrolled specifically to strengthen intermediate skills, and attending a class below my level is not helping me reach my language goals. I am also concerned about the time investment involved in continuing in a course that does not meet my needs.

I would like to request a transfer to a more appropriate class level, if one is available in the current session. If that is not possible, I would appreciate a partial refund of my registration fee so that I may enrol in a more suitable program elsewhere.

Thank you for your time. I look forward to hearing from you.

Sincerely,
Priya Sharma`,
      clb11: `Dear Program Coordinator,

I am writing to draw your attention to a significant discrepancy between the course I registered for and the instruction I have been receiving. I enrolled in the Intermediate English Writing course (Section 4B) on the strength of your spring catalogue description, which clearly indicated that the class targets learners with a solid B1–B2 foundation. Regrettably, the first session made it apparent that the material is pitched at a beginner level, revisiting concepts and exercises I completed well over two years ago.

This mismatch has had a tangible impact on my academic progress. The decision to enrol was driven specifically by a desire to refine intermediate-level competencies, and continuing in a course that does not align with my proficiency represents a considerable investment of both time and tuition with no meaningful return.

I would respectfully request one of two outcomes: a transfer to a section that corresponds to the intermediate level I originally registered for, or, failing availability, a partial refund of my registration fee to allow me to pursue a more appropriate program elsewhere.

Thank you for giving this matter your prompt consideration. I am happy to discuss it further at your convenience.

Sincerely,
Priya Sharma`,
    },
    ...FORMAL_EXTRA_SAMPLE_META,
  },
  {
    id: 'formal-route-change',
    formality: 'Formal',
    sidebarLabel: 'Route Change',
    title: 'Transit route removal complaint',
    scenario: 'The city recently removed the bus route that stopped near your neighbourhood. The replacement route requires a 25-minute walk and does not operate during early morning hours when you need to commute to work.',
    instructions: [
      'Explain which route was removed and how long you have depended on it.',
      'Describe the specific impact the change has had on your daily commute.',
      'Request a review of the route decision or propose an alternative solution.',
    ],
    sampleResponses: {
      clb5: `Dear City Service Office,

I am writing about the bus Route 47. This bus was very important for me. It stopped near my house in Rosedale Park and I used it every day for 3 years to go to work. But now the city removed it and I am having a very hard time.

The new bus stop is 25 minutes walking from my house. That is too far, especially in winter when it is very cold and the roads have ice. Also the new bus does not start before 8 a.m. I need to be at my work by 7:30 a.m. so this bus does not work for me at all. Now I have to pay for a taxi every morning. This is very expensive and I cannot keep doing this.

I know other people in my neighbourhood have the same problem. Many of us used Route 47 every day. Please bring back Route 47. Or if that is not possible, can you make the new bus start earlier in the morning, maybe at 6:30?

Thank you for reading this.

Sincerely,
Thomas Okafor`,
      clb7: `Dear City Service Office Representative,

I am writing to express my concern about the removal of Route 47, which has served the Rosedale Park neighbourhood for many years. I have depended on this route for my daily commute to work for the past three years, and its removal has created a real hardship for me.

The replacement service requires a 25-minute walk to the nearest stop, which is very difficult during winter months when the roads are icy. More importantly, the replacement bus does not operate before 8 a.m., and I need to be at my workplace by 7:30 a.m. Because of this, I have had to arrange alternative transportation at significant extra cost every week.

I would like to request that this decision be reviewed. If restoring Route 47 is not possible, I would suggest extending the hours of the replacement route or adding a connecting shuttle from Rosedale Park during morning peak hours.

Thank you for considering this matter.

Respectfully,
Thomas Okafor`,
      clb9: `Dear City Service Office Representative,

I am writing to express my concern about the recent removal of Route 47, which served the Rosedale Park neighbourhood for many years. I have relied on this route for my daily commute to work for the past three years, and its removal has created a significant hardship for me and many of my neighbours.

The replacement service requires a 25-minute walk to the nearest stop, which is difficult during winter months and is not manageable on a tight schedule. More importantly, the replacement route does not operate before 8 a.m., which means I cannot reach my workplace by 7:30 a.m. as required. As a result, I have had to arrange and pay for alternative transportation at considerable expense.

I would like to respectfully request a review of this decision. If restoring Route 47 is not possible, I would suggest either extending the hours of the replacement route or adding a connecting shuttle from Rosedale Park during peak morning hours.

I am happy to provide additional information if needed. Thank you for your consideration.

Respectfully,
Thomas Okafor`,
      clb11: `Dear City Service Office Representative,

I am writing to formally express my concern regarding the recent elimination of Route 47, a vital transit link for the Rosedale Park neighbourhood. Having depended on this route for my daily commute over the past three years, I can attest to the considerable hardship its removal has caused myself and numerous other residents.

The designated replacement requires a 25-minute walk to the nearest stop \u2014 a distance that becomes particularly burdensome during winter and is not feasible on a time-sensitive morning schedule. Of greater concern is the fact that the replacement route does not commence service until 8 a.m., rendering it impractical for commuters required to arrive at work by 7:30 a.m. I have been forced to fund private transportation at significant personal expense.

I would respectfully urge the department to revisit this decision. Should a full reinstatement prove unfeasible, I would propose either extending the replacement route's operating hours or introducing a connecting shuttle during peak commuting times.

Thank you for your thoughtful consideration.

Respectfully yours,
Thomas Okafor`,
    },
    ...FORMAL_EXTRA_SAMPLE_META,
  },
  {
    id: 'formal-translation-complaint',
    formality: 'Formal',
    sidebarLabel: 'Translation Complaint',
    title: 'Incorrect document translation complaint',
    scenario: 'A certified translation service translated an important official document for you with several significant errors. These errors caused your government application to be delayed, resulting in additional costs and considerable stress.',
    instructions: [
      'Describe the translation errors and how they affected your government application.',
      'Request that the document be corrected free of charge as soon as possible.',
      'Ask for compensation for any costs directly resulting from the errors.',
    ],
    sampleResponses: {
      clb5: `Dear Customer Service Manager,

I am writing about a problem with a translation your company did for me. On February 12, I asked you to translate my birth certificate. The reference number is TX-8841. But the translation has many mistakes. The birth year is wrong and my last name is spelled wrong. I checked the original document and these mistakes are not there. So the errors are from your translation.

Because of these mistakes, my permanent residency application was sent back by the government. They said the documents don't match. Now I have to send it again and pay a new fee of $150. I also had to pay $45 for fast delivery because the deadline is very close. This is very stressful for me.

I want you to fix the translation for free because this is your mistake. I also want my $195 back because I paid this extra money only because of the errors in your work.

Please reply soon. I am sending you the original and the translated documents.

Thank you,
Amara Diallo`,
      clb7: `Dear Customer Service Manager,

I am writing to make a formal complaint about the translation of my birth certificate completed by your agency on February 12th (Reference #TX-8841). The translated document has several important errors. The birth year is incorrect and my legal surname is misspelled. These mistakes do not appear in the original document.

Because of these errors, my permanent residency application was returned by IRCC, causing a three-week delay. During this time I was unable to move forward with my immigration plans. I had to pay a re-processing fee of $150 and an expedited courier cost of $45 to meet the new deadline.

I would like your agency to provide a corrected and certified translation at no extra charge. I am also requesting reimbursement of the $195 in additional costs that resulted directly from your errors.

I have attached the original and translated documents for your review. I look forward to a prompt response.

Best regards,
Amara Diallo`,
      clb9: `Dear Customer Service Manager,

I am writing to file a formal complaint regarding the translation of my birth certificate completed by your agency on February 12th (Reference #TX-8841). The translated document contained multiple significant errors, including an incorrect birth year and a misspelling of my legal surname. Neither of these errors appear in the original document.

As a direct result of these errors, my permanent residency application was flagged and returned by Immigration, Refugees and Citizenship Canada, causing a three-week delay. During this period, I was required to submit a new application and pay a re-processing fee of $150. I also incurred the cost of expedited courier services to meet the revised submission deadline.

I would like to request that your agency provide a corrected and certified translation immediately and at no additional charge. I am also requesting reimbursement of the $150 re-processing fee and the $45 courier cost, totalling $195, as these expenses arose directly from errors made by your team.

Please find the original and translated documents attached. I look forward to your prompt response.

Best regards,
Amara Diallo`,
      clb11: `Dear Customer Service Manager,

I am writing to lodge a formal complaint concerning the certified translation of my birth certificate completed by your agency on February 12th under Reference #TX-8841. The translated document contains multiple material errors, most notably an incorrect birth year and a misspelling of my legal surname \u2014 neither of which appears in the source document.

The consequences have been considerable. My permanent residency application was flagged and returned by Immigration, Refugees and Citizenship Canada, resulting in a three-week delay that disrupted my immigration timeline. I was required to resubmit at a re-processing cost of $150 and to arrange expedited courier services at an additional $45.

I am requesting two remedies. First, that your agency issue a corrected and certified translation without delay and at no charge. Second, that you reimburse the $195 in costs incurred as a direct consequence of errors attributable to your team.

I have enclosed both documents for reference. I trust this matter will receive prompt attention.

Best regards,
Amara Diallo`,
    },
    ...FORMAL_EXTRA_SAMPLE_META,
  },
  {
    id: 'formal-tour-feedback',
    formality: 'Formal',
    sidebarLabel: 'Tour Feedback',
    title: 'Guided tour quality complaint',
    scenario: 'You recently completed a guided historical city tour that you paid a premium price for. Several parts were rushed, one stop was skipped entirely, and the guide was unprepared to answer basic questions about the sites.',
    instructions: [
      'Describe the specific issues you experienced during the tour.',
      'Explain how the experience did not match what was advertised.',
      'Request a partial refund or an invitation to re-join a full tour at no cost.',
    ],
    sampleResponses: {
      clb5: `Dear Customer Service Manager,

I am writing about the Old Town Historical Walking Tour that I went on Saturday, April 5. I paid $75 for this tour. Your website said it is a 2-hour tour that covers 12 heritage sites with an expert guide. But the tour was not like what you promised.

First, the tour was only about 90 minutes, not 2 hours. Second, we did not go to the Parliament Building even though it was in the brochure. The guide said we didn't have time but I don't know why. Also, at many of the stops the guide talked very fast and did not explain much. When people asked questions, the guide could not answer them. This was disappointing because we expected an expert.

I paid a lot of money for this tour and I think it was not fair. The tour was shorter than promised and we missed an important stop. Can I please get 50% of my money back? Or can I join another tour for free to see what I missed?

Thank you for your time.

Sincerely,
Leila Nouri`,
      clb7: `Dear Customer Service Manager,

I am writing to share my feedback about the Old Town Historical Walking Tour I attended on Saturday, April 5th. I booked this tour because your website described it as a two-hour experience covering twelve heritage sites with an expert guide. Unfortunately, the tour did not meet those expectations in several ways.

The tour lasted about 90 minutes instead of two hours. The Parliament Building stop was skipped without explanation, even though it was listed in the brochure as a highlight. At several other stops, the guide moved on very quickly and could not answer basic questions about the history of the sites. This was disappointing for me and other people in the group.

I paid $75 for this experience and feel it fell significantly short of what was advertised. I would appreciate either a partial refund of 50% or an invitation to join another full tour at no additional cost.

I am happy to discuss this further if needed.

Kind regards,
Leila Nouri`,
      clb9: `Dear Customer Service Manager,

I am writing to share feedback about the Old Town Historical Walking Tour I attended on Saturday, April 5th. I booked this tour based on your website's description of a comprehensive two-hour experience covering twelve heritage sites with an expert guide. Unfortunately, the tour did not meet those expectations in several important ways.

The tour lasted approximately 90 minutes rather than the advertised two hours. The Parliament Building stop, one of the highlights listed in your brochure, was skipped entirely without explanation. At several other stops, the guide moved on after just a few minutes and was unable to answer questions about the history of the sites. A number of participants, including myself, expressed disappointment during the tour.

I understand that unforeseen circumstances can affect operations, and I would not have raised this if the gaps were minor. However, the experience fell significantly short of what was promised and what I paid $75 for.

I would appreciate either a partial refund of 50% or an invitation to join another tour at no additional cost. I am happy to discuss this further at your convenience.

Kind regards,
Leila Nouri`,
      clb11: `Dear Customer Service Manager,

I am writing to provide detailed feedback regarding the Old Town Historical Walking Tour I attended on Saturday, April 5th. I selected this experience based on your website's description of a two-hour guided tour encompassing twelve heritage sites led by a knowledgeable expert. I regret to say that the tour fell considerably short of those commitments.

The tour concluded after approximately 90 minutes. The Parliament Building stop, prominently featured in your brochure as a highlight, was omitted entirely without explanation. At several remaining sites, the guide offered only cursory commentary and was unable to field basic historical questions from participants.

I appreciate that operational circumstances can occasionally affect service delivery. However, the cumulative gaps between what was advertised and what was delivered represent a significant departure from the $75 premium experience I paid for.

I would welcome either a partial refund of 50% or a complimentary invitation to re-join a full-length tour at a future date.

Kind regards,
Leila Nouri`,
    },
    ...FORMAL_EXTRA_SAMPLE_META,
  },
  {
    id: 'formal-competition-dispute',
    formality: 'Formal',
    sidebarLabel: 'Competition Dispute',
    title: 'Writing competition fairness complaint',
    scenario: 'You entered a regional writing competition. After results were announced, you discovered that the winning submission had been previously published in another competition, which was against the stated rules.',
    instructions: [
      'Explain the situation and reference the specific rule that was violated.',
      'Describe how this affected the fairness of the competition for all participants.',
      'Request an investigation and ask what action will be taken regarding the results.',
    ],
    sampleResponses: {
      clb5: `Dear Program Coordinator,

I am writing about the 2026 Regional Short Story Competition. I was a participant in this competition and I want to tell you about a problem with the results.

After the winners were announced, I found out that the first place story, "The River Turns," was already published before. It was in the Lakeview Writers' Annual Competition last year, in November 2025. But your rules say very clearly that all stories must be original and not published before. This is Rule 3.2 in the competition guidelines.

I think this is not fair for the other writers. Many people worked very hard and followed the rules. They wrote original stories that were never published anywhere. If the winning story does not follow the rules, then the competition is not fair for anyone.

I would like you to please check this. Can the committee look at the history of the winning story and see if it was really published before? Also, I want to know what you will do about the results. Will you change the final rankings?

Thank you for your time.

Sincerely,
Nathan Reid`,
      clb7: `Dear Program Coordinator,

I am writing about a concern with the results of the 2026 Regional Short Story Competition. After the winners were announced, I discovered that the first-place submission, "The River Turns," was published in the Lakeview Writers' Annual Competition in November 2025. According to Rule 3.2 of your guidelines, all entries must be original and unpublished works.

This is a serious fairness issue for all the participants who followed the rules and submitted original work. Many of us spent weeks writing and editing our stories specifically for this competition. If the rules are not enforced consistently, the competition loses its credibility and it discourages honest writers from entering in the future.

I would like to request a formal investigation into this matter. I am asking the committee to verify the publication history of the winning entry and to let all participants know what steps will be taken. Specifically, I would like to know whether the results will be reviewed and whether the rankings may be adjusted.

Thank you for your attention to this important matter.

Sincerely,
Nathan Reid`,
      clb9: `Dear Program Coordinator,

I am writing to raise a concern about the results of the 2026 Regional Short Story Competition, in which I was a participant. Following the announcement of the winners, I discovered that the first-place submission, "The River Turns," was published in the Lakeview Writers' Annual Competition in November 2025. This appears to be a direct violation of Rule 3.2 of your competition guidelines, which states that all entries must be original, unpublished works that have not been submitted to any other competition.

I want to be clear that my concern is not primarily about my own placement. Rather, this raises a fundamental fairness issue for all participants who submitted original, unpublished work as required. The rules create a level playing field, and if they are not enforced, the integrity of the competition is undermined for everyone involved.

I would like to formally request an investigation into this matter. Specifically, I am asking that the organizing committee verify the publication history of the winning entry and communicate what steps will be taken, including whether the results will be reviewed.

I appreciate your attention and look forward to your response.

Sincerely,
Nathan Reid`,
      clb11: `Dear Program Coordinator,

I am writing to bring to your attention a matter of considerable concern regarding the results of the 2026 Regional Short Story Competition. In the days following the announcement, I became aware that the first-place entry, "The River Turns," had been previously published in the Lakeview Writers' Annual Competition in November 2025. This constitutes a clear violation of Rule 3.2, which stipulates that all submissions must be original, unpublished works not previously entered in any other contest.

My concern extends beyond personal interest in my own placement. This is a matter of procedural fairness affecting every participant who honoured the rules by submitting genuinely original work. Competition guidelines exist to ensure a level playing field, and when violations go unaddressed, the credibility of the event is fundamentally compromised.

I am formally requesting that the organizing committee conduct a thorough investigation, beginning with verification of the winning entry's publication history. I would further ask that the committee communicate transparently with all participants regarding the findings and any corrective measures, including whether the standings will be revised.

I appreciate your attention to this matter and look forward to a considered response.

Sincerely,
Nathan Reid`,
    },
    ...FORMAL_EXTRA_SAMPLE_META,
  },
];

/** All sidebar-specific extended prompts (informal + new formal). */
export const CELPIP_SIDEBAR_EXTENDED_PROMPTS = [
  ...CELPIP_INFORMAL_PROMPTS,
  ...CELPIP_EXTRA_FORMAL_PROMPTS,
];

/** Ordered sidebar list for the Task 1 practice hub. */
export const CELPIP_TASK1_SIDEBAR = [
  { id: 'informal-pet-sitting',                       label: 'Informal \u2013 Pet Sitting',           formality: 'Informal', isFree: true  },
  { id: 'email-course-refund-customer-service',        label: 'Formal \u2013 Workshop Refund',         formality: 'Formal',   isFree: false },
  { id: 'email-program-feedback-program-coordinator',  label: 'Formal \u2013 Product Suggestion',      formality: 'Formal',   isFree: false },
  { id: 'formal-class-mismatch',                       label: 'Formal \u2013 Class Mismatch',          formality: 'Formal',   isFree: false },
  { id: 'formal-route-change',                         label: 'Formal \u2013 Route Change',            formality: 'Formal',   isFree: false },
  { id: 'email-facility-problem-building-manager',     label: 'Formal \u2013 Repair Dispute',          formality: 'Formal',   isFree: false },
  { id: 'informal-celebration',                        label: 'Informal \u2013 Celebration Support',   formality: 'Informal', isFree: false },
  { id: 'informal-moving-help',                        label: 'Informal \u2013 Moving Help',           formality: 'Informal', isFree: false },
  { id: 'informal-vacation-photos',                    label: 'Informal \u2013 Vacation Photos',       formality: 'Informal', isFree: false },
  { id: 'informal-family-support',                     label: 'Informal \u2013 Family Support',        formality: 'Informal', isFree: false },
  { id: 'informal-sports-support',                     label: 'Informal \u2013 Sports Support',        formality: 'Informal', isFree: false },
  { id: 'informal-recipe-help',                        label: 'Informal \u2013 Recipe Help',           formality: 'Informal', isFree: false },
  { id: 'informal-birthday-mixup',                     label: 'Informal \u2013 Birthday Mix-up',       formality: 'Informal', isFree: false },
  { id: 'formal-translation-complaint',                label: 'Formal \u2013 Translation Complaint',   formality: 'Formal',   isFree: false },
  { id: 'formal-tour-feedback',                        label: 'Formal \u2013 Tour Feedback',           formality: 'Formal',   isFree: false },
  { id: 'informal-svc-appreciation',                   label: 'Informal \u2013 Service Appreciation',  formality: 'Informal', isFree: false },
  { id: 'formal-competition-dispute',                  label: 'Formal \u2013 Competition Dispute',     formality: 'Formal',   isFree: false },
  { id: 'email-program-feedback-supervisor',           label: 'Formal \u2013 Program Improvement',    formality: 'Formal',   isFree: false },
];

export const CELPIP_FREE_PROMPT_IDS = {
  task1: CELPIP_FREE_TASK_ID,
  task2: 'survey-online-vs-inperson-1',
};

function buildTask2HubInstructions(options = []) {
  const optionLine = options.length >= 2
    ? `Choose one option clearly: ${options[0]} or ${options[1]}.`
    : 'Choose one option clearly in your opening.';

  return [
    optionLine,
    'Support your choice with reasons and at least one specific example or consequence.',
    'Briefly explain why the other option is less suitable before you conclude.',
  ];
}

function createTask2SidebarPrompt({
  id,
  sidebarLabel,
  title,
  question,
}) {
  const bankPrompt = getPromptById('task2', id);
  if (!bankPrompt) {
    throw new Error(`Missing Task 2 prompt for sidebar id "${id}"`);
  }

  const samples = getPromptSampleResponses(bankPrompt);

  return {
    id,
    sidebarLabel,
    title: title || bankPrompt.title,
    question: question || bankPrompt.question,
    options: Array.isArray(bankPrompt.options) ? bankPrompt.options : [],
    instructions: buildTask2HubInstructions(bankPrompt.options),
    sampleResponses: {
      clb5: samples.clb5,
      clb7: samples.clb7,
      clb9: samples.clb9,
      clb11: samples.clb11,
    },
    sampleLevelWhy: Array.isArray(bankPrompt.sampleLevelWhy) ? bankPrompt.sampleLevelWhy : [],
  };
}

export const CELPIP_TASK2_CURATED_PROMPTS = [
  createTask2SidebarPrompt({
    id: 'survey-online-vs-inperson-1',
    sidebarLabel: 'Online vs In-Person',
    title: 'Online classes or in-person classes',
    question: 'For newcomers adapting to life in Canada, which option is better for adult learners: online classes or in-person classes?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-public-transport-1',
    sidebarLabel: 'Bus Routes vs Bike Lanes',
    title: 'More buses or more bike lanes',
    question: 'If a city wants to help newcomers adapt to life in Canada, which transportation investment is better: more bus routes or more bike lanes?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-work-model-2',
    sidebarLabel: 'Remote vs Office Work',
    title: 'Work from home or work in office',
    question: 'For busy working adults, which model is better for most employees: working from home or working in an office?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-save-vs-travel-2',
    sidebarLabel: 'Save or Travel',
    title: 'Save money or travel now',
    question: 'For busy working adults with extra money, which is the better choice: saving for the future or travelling now?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-small-vs-large-event-4',
    sidebarLabel: 'Small or Large Events',
    title: 'Small event or large event',
    question: 'For parents balancing work and family, which is better for most families: a small event or a large event?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-reading-vs-video-2',
    sidebarLabel: 'Reading vs Video Lessons',
    title: 'Reading or watching videos to learn',
    question: 'For busy working adults, which helps people learn more effectively: reading or watching videos?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-car-vs-transit-1',
    sidebarLabel: 'Car vs Transit',
    title: 'Buy a car or rely on transit',
    question: 'For newcomers adapting to life in Canada, which is the better option in cities: buying a car or relying on public transit?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-rent-vs-buy-2',
    sidebarLabel: 'Rent or Buy a Home',
    title: 'Rent a home or buy a home',
    question: 'For busy working adults early in their careers, which is better: renting a home or buying a home?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-team-vs-individual-3',
    sidebarLabel: 'Team vs Solo Projects',
    title: 'Team projects or individual projects',
    question: 'For college students under deadline pressure, which approach is better in education: team projects or individual projects?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-morning-vs-evening-2',
    sidebarLabel: 'Morning vs Evening Study',
    title: 'Morning study or evening study',
    question: 'For busy working adults, which study schedule is more effective: morning study or evening study?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-online-vs-inperson-5',
    sidebarLabel: 'Classes for Test Prep',
    title: 'Online classes for test prep',
    question: 'For people preparing for language tests, which is better: online classes or in-person classes?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-work-model-4',
    sidebarLabel: 'Work Model for Parents',
    title: 'Work from home or work in office',
    question: 'For parents balancing work and family, which model is better: working from home or working in an office?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-save-vs-travel-3',
    sidebarLabel: 'Save or Travel Under Pressure',
    title: 'Save money or travel now',
    question: 'For college students under deadline pressure who suddenly have extra money, which is better: saving for the future or travelling now?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-reading-vs-video-5',
    sidebarLabel: 'Study Mode for Test Takers',
    title: 'Reading or watching videos to learn',
    question: 'For people preparing for language tests, which helps most: reading or watching videos?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-car-vs-transit-2',
    sidebarLabel: 'Car vs Transit for Workers',
    title: 'Buy a car or rely on transit',
    question: 'For busy working adults in cities, which is the better option: buying a car or using public transit?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-rent-vs-buy-4',
    sidebarLabel: 'Housing for Parents',
    title: 'Rent a home or buy a home',
    question: 'For parents balancing work and family, which is better: renting a home or buying a home?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-team-vs-individual-5',
    sidebarLabel: 'Projects for Test Prep',
    title: 'Team projects or individual projects',
    question: 'For people preparing for language tests, which approach is better for learning: team projects or individual projects?',
  }),
  createTask2SidebarPrompt({
    id: 'survey-morning-vs-evening-5',
    sidebarLabel: 'Study Time for Test Takers',
    title: 'Morning study or evening study',
    question: 'For people preparing for language tests, which study schedule is more effective: morning study or evening study?',
  }),
];

export const CELPIP_TASK2_SIDEBAR = CELPIP_TASK2_CURATED_PROMPTS.map((prompt, index) => ({
  id: prompt.id,
  label: `Survey \u2013 ${prompt.sidebarLabel}`,
  formality: 'Survey',
  isFree: prompt.id === CELPIP_FREE_PROMPT_IDS.task2 && index === 0,
}));

export const CELPIP_TASK_SIDEBARS = {
  task1: CELPIP_TASK1_SIDEBAR,
  task2: CELPIP_TASK2_SIDEBAR,
};

const CELPIP_CURATED_HUB_PROMPTS = {
  task1: CELPIP_SIDEBAR_EXTENDED_PROMPTS,
  task2: CELPIP_TASK2_CURATED_PROMPTS,
};

export function isCelpipFreePrompt(taskType, promptId) {
  return CELPIP_FREE_PROMPT_IDS[taskType] === promptId;
}

export function getPracticeHubPromptById(taskType, id) {
  const curated = CELPIP_CURATED_HUB_PROMPTS[taskType]?.find((prompt) => prompt.id === id);
  if (curated) {
    return {
      ...curated,
      taskType,
      sampleResponses: getPromptSampleResponses(curated),
    };
  }

  const bankPrompt = CELPIP_PROMPT_BANK[taskType]?.find((prompt) => prompt.id === id);
  if (!bankPrompt) return null;

  return {
    ...bankPrompt,
    taskType,
    sampleResponses: getPromptSampleResponses(bankPrompt),
  };
}

/**
 * Look up a full prompt object by ID.
 * Checks sidebar-specific prompts first, then the main task1 bank.
 * Bank prompts that still use the old singlestring sampleResponse are
 * shimmed into the sampleResponses shape so the component stays uniform.
 */
export function getSidebarPromptById(id) {
  return getPracticeHubPromptById('task1', id);
}
