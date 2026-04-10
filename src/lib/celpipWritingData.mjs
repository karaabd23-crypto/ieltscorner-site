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
      clb5: '',
      clb7: '',
      clb9: `Hi Sarah,

I hope you're doing well! I'm reaching out because I'll be heading to Halifax from March 14th to March 21st to visit my elderly parents — they've been needing extra support lately and I don't want to miss the chance to spend time with them.

Unfortunately, I can't bring Biscuit on this trip, so I was hoping you might be willing to look after him while I'm away. You were absolutely wonderful with him last summer, and he clearly adores you!

Biscuit's routine is pretty easygoing. He needs two short walks a day — around 7 a.m. and 6 p.m. — and he eats half a cup of dry food at 7 a.m. and 5 p.m. He's well-behaved and loves his squeaky toy. Just be sure to latch the garden gate, as he sometimes tries to sneak out!

I'd love to return the favour in any way I can — maybe watch your plants while you're away next time, or treat you to dinner when I get back.

Please let me know if this works for you. Thanks so much in advance!

Warm regards,
Alex`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hi Jamie,

Hope things are great with you! I'm reaching out because I've been putting together a surprise birthday dinner for Priya — she's turning 40 next month and I really want it to be special.

I've booked a private room at Rosetta's for Saturday, May 10th at 7 p.m. I know she loves it there. The plan is to tell her we're going for a casual dinner, so I need a few of us to keep things hush-hush until she walks in!

Here's where I could really use your help: I'd love for you to reach out to her sister and a few friends from her old job and get their RSVPs by April 25th. It would also be great if you could help me pick out a gift — you know her taste much better than I do!

Would you be free to grab coffee sometime this week to go over the details? Thursday or Friday afternoon works best for me.

Let me know what you think — I really hope you can help make this happen!

Cheers,
Sam`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hey Marcus,

Hope you're having a great week! I'm finally making the big move to Westmount — I found a great two-bedroom with much better transit access, and I sign the lease on April 30th.

The only challenge is that I have a few large items — a sectional sofa, a queen-sized bed frame, and a bookshelf — that definitely won't fit in a regular car. I was wondering if there's any chance you'd be willing to lend a hand and bring your truck? I'm planning to do the move on Saturday, May 3rd, and I think two or three trips should cover everything. It shouldn't take more than half the day.

I wouldn't ask if I didn't really need the help, and I promise to make it worth your while. Pizza and drinks are absolutely on me, and I'll happily help you out with any projects you've got coming up — painting, repairs, whatever you need.

Let me know if you're free that Saturday. I really appreciate it!

Talk soon,
Jordan`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hi Mei,

I'm back! Japan was absolutely incredible — honestly one of the best trips I've ever taken. I kept thinking of you throughout because I know you've wanted to visit for ages!

The highlights for me were Kyoto's temples and the food market in Osaka. I ate my weight in ramen and takoyaki, and the bullet train experience alone was worth the trip. I also managed to catch the tail end of cherry blossom season in Nara, which was stunning.

A few tips if you do go: book your JR pass before you leave Canada — it's much cheaper that way — try to avoid the Golden Week holiday period in early May if you want fewer crowds, and download the Google Translate camera feature, which was a lifesaver for menus!

I have hundreds of photos I'd love to share with you. Would you be up for coffee or lunch one afternoon this week? I can walk you through everything and answer any questions you have about planning your own trip.

Can't wait to catch up!

Warmly,
Sophie`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hi Priya,

I hope everything is going well with you and the family! I've been meaning to reach out because I'm facing a big decision and your experience is exactly what I need to hear.

I've been seriously considering leaving my job at the firm to go back to school full-time for a master's in urban planning. The work I do now is stable, but I feel like I've hit a ceiling, and this graduate program has always been something I've thought about. I just can't shake the feeling that now is the right time to do it.

I know you went through something similar when you left your finance role to go back for your MBA, and you came out the other side in a much better place. I'd love to know what the experience was really like — what was harder than expected, what you'd do differently, and whether timing matters as much as people say.

Would you be free for a call sometime this week or next? Even 30 minutes would help me think this through.

Thanks so much,
Dev`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hey Carlos,

Hope you're doing well! I have a fun question for you — how would you feel about joining my soccer team?

I joined a recreational league back in September and I'm really enjoying it. We play on Sunday mornings at Centennial Park, usually from 10 to noon. The level is casual but competitive enough to keep things interesting. The problem is, one of our players just moved to Vancouver and now we're one short — which means we could be forced to forfeit games if we don't fill the spot soon.

I immediately thought of you. I remember you mentioning you played in high school, and honestly even if you're a bit rusty, this group is super welcoming. It's a mixed skill level, everyone's there to have fun, and we usually grab food together after the game.

No pressure, but I think you'd really enjoy it — it's a great way to stay active and meet some great people. Would you be up for coming out this Sunday just to try it? No commitment needed.

Let me know!

Cheers,
Lena`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hi Aunt Rosa,

I hope you're doing well! I'm reaching out for some culinary guidance — I'm hosting a dinner party this Saturday for eight friends, and I've decided to finally attempt your famous lasagna. No pressure, right?

I know the recipe by heart in theory, but I've never actually made it from scratch and I want to do it justice. A few things I'm not sure about: should I pre-cook the pasta sheets, or do they soften enough in the oven? And how long do you usually let it rest before cutting — I always make a mess when I slice it too soon!

Also, one of my guests has a nut allergy. I know the original recipe doesn't call for nuts, but I wanted to check in case the béchamel has any almond flour or anything like that. I want to make sure it's completely safe for her.

If you have a few minutes to call or send me the recipe with your notes, I would be so grateful. I promise to report back on how it goes!

With love,
Giulia`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hi Nina,

I honestly don't know where to start — I can't believe I missed your birthday. There's no real excuse. I've been so caught up with the move and the new job that the date completely slipped by me, and I am genuinely mortified. You didn't miss mine — you organized a whole surprise and went out of your way to make my day special. I should have done the same, and I'm so sorry I didn't.

I'd really love to make it up to you, if you'll let me. How about dinner at that new place on King Street you mentioned a while back — fully on me, of course? I'll also pick up a belated gift, though I know that doesn't quite cover it. We could go this weekend if you're free, or whenever works best for you.

I want you to know how much your friendship means to me. You're one of the most thoughtful people in my life, and you deserved to be celebrated properly. I'm so sorry, and I promise not to let this happen again.

With love and a lot of guilt,
Aisha`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Hi David,

I just wanted to take a moment to say a proper thank you for everything you did this past weekend. I honestly could not have done it without you — the deck looks incredible and the garden beds are exactly what I had in mind.

What really stood out was how you came prepared with your own tools and just jumped right in without any fuss. You stayed the entire weekend even when the weather turned on Sunday morning, and you never once complained or made me feel like I was asking too much. That kind of generosity is rare, and I'm genuinely grateful.

The backyard was something I had been putting off for two years because it felt too overwhelming to tackle alone. Now it's actually a space I want to spend time in. That's entirely down to your help and your patience explaining things as we went.

I'd love to return the favour in some concrete way. Please let me know if there's anything around your place you've been meaning to get done — painting, repairs, anything at all. I'm there.

Thanks again, truly.

Best,
Marcus`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Dear Program Coordinator,

I am writing to bring a serious concern to your attention regarding a course I recently enrolled in. I registered for the Intermediate English Writing course (Section 4B) based on the description in your spring catalogue, which stated that the class is designed for learners with a solid foundation at the B1–B2 level. However, on the first day of class, it became clear that the content is delivered at a beginner level, covering material I completed over two years ago.

This mismatch is significantly affecting my progress. I enrolled specifically to strengthen intermediate skills, and attending a class below my level is not helping me reach my language goals. I am also concerned about the time investment involved in continuing in a course that does not meet my needs.

I would like to request a transfer to a more appropriate class level, if one is available in the current session. If that is not possible, I would appreciate a partial refund of my registration fee so that I may enrol in a more suitable program elsewhere.

Thank you for your time. I look forward to hearing from you.

Sincerely,
Priya Sharma`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Dear City Service Office Representative,

I am writing to express my concern about the recent removal of Route 47, which served the Rosedale Park neighbourhood for many years. I have relied on this route for my daily commute to work for the past three years, and its removal has created a significant hardship for me and many of my neighbours.

The replacement service requires a 25-minute walk to the nearest stop, which is difficult during winter months and is not manageable on a tight schedule. More importantly, the replacement route does not operate before 8 a.m., which means I cannot reach my workplace by 7:30 a.m. as required. As a result, I have had to arrange and pay for alternative transportation at considerable expense.

I would like to respectfully request a review of this decision. If restoring Route 47 is not possible, I would suggest either extending the hours of the replacement route or adding a connecting shuttle from Rosedale Park during peak morning hours.

I am happy to provide additional information if needed. Thank you for your consideration.

Respectfully,
Thomas Okafor`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Dear Customer Service Manager,

I am writing to file a formal complaint regarding the translation of my birth certificate completed by your agency on February 12th (Reference #TX-8841). The translated document contained multiple significant errors, including an incorrect birth year and a misspelling of my legal surname. Neither of these errors appear in the original document.

As a direct result of these errors, my permanent residency application was flagged and returned by Immigration, Refugees and Citizenship Canada, causing a three-week delay. During this period, I was required to submit a new application and pay a re-processing fee of $150. I also incurred the cost of expedited courier services to meet the revised submission deadline.

I would like to request that your agency provide a corrected and certified translation immediately and at no additional charge. I am also requesting reimbursement of the $150 re-processing fee and the $45 courier cost, totalling $195, as these expenses arose directly from errors made by your team.

Please find the original and translated documents attached. I look forward to your prompt response.

Best regards,
Amara Diallo`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Dear Customer Service Manager,

I am writing to share feedback about the Old Town Historical Walking Tour I attended on Saturday, April 5th. I booked this tour based on your website's description of a comprehensive two-hour experience covering twelve heritage sites with an expert guide. Unfortunately, the tour did not meet those expectations in several important ways.

The tour lasted approximately 90 minutes rather than the advertised two hours. The Parliament Building stop, one of the highlights listed in your brochure, was skipped entirely without explanation. At several other stops, the guide moved on after just a few minutes and was unable to answer questions about the history of the sites. A number of participants, including myself, expressed disappointment during the tour.

I understand that unforeseen circumstances can affect operations, and I would not have raised this if the gaps were minor. However, the experience fell significantly short of what was promised and what I paid $75 for.

I would appreciate either a partial refund of 50% or an invitation to join another tour at no additional cost. I am happy to discuss this further at your convenience.

Kind regards,
Leila Nouri`,
      clb11: '',
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
      clb5: '',
      clb7: '',
      clb9: `Dear Program Coordinator,

I am writing to raise a concern about the results of the 2026 Regional Short Story Competition, in which I was a participant. Following the announcement of the winners, I discovered that the first-place submission, "The River Turns," was published in the Lakeview Writers' Annual Competition in November 2025. This appears to be a direct violation of Rule 3.2 of your competition guidelines, which states that all entries must be original, unpublished works that have not been submitted to any other competition.

I want to be clear that my concern is not primarily about my own placement. Rather, this raises a fundamental fairness issue for all participants who submitted original, unpublished work as required. The rules create a level playing field, and if they are not enforced, the integrity of the competition is undermined for everyone involved.

I would like to formally request an investigation into this matter. Specifically, I am asking that the organizing committee verify the publication history of the winning entry and communicate what steps will be taken, including whether the results will be reviewed.

I appreciate your attention and look forward to your response.

Sincerely,
Nathan Reid`,
      clb11: '',
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

/**
 * Look up a full prompt object by ID.
 * Checks sidebar-specific prompts first, then the main task1 bank.
 * Bank prompts that still use the old singlestring sampleResponse are
 * shimmed into the sampleResponses shape so the component stays uniform.
 */
export function getSidebarPromptById(id) {
  const extended = CELPIP_SIDEBAR_EXTENDED_PROMPTS.find((p) => p.id === id);
  if (extended) {
    return {
      ...extended,
      sampleResponses: getPromptSampleResponses(extended),
    };
  }

  const bankPrompt = CELPIP_PROMPT_BANK.task1.find((p) => p.id === id);
  if (!bankPrompt) return null;

  return {
    ...bankPrompt,
    sampleResponses: getPromptSampleResponses(bankPrompt),
  };
}
