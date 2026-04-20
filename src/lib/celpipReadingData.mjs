export const CELPIP_READING_PRODUCT_NAME = 'CELPIP Reading Simulator';
export const CELPIP_READING_PRICE_CAD = 20;
export const CELPIP_READING_BILLING_INTERVAL = 'month';

export const CELPIP_READING_LEVEL_GUIDE = [
  { minRatio: 0.9, level: 10, label: 'Test-ready', descriptor: 'Strong control of detail, paraphrase, and inference under time pressure.' },
  { minRatio: 0.8, level: 9, label: 'Competitive', descriptor: 'Mostly accurate reading with only a few costly distractor mistakes.' },
  { minRatio: 0.7, level: 8, label: 'Close to target', descriptor: 'Solid foundation, but timing or inference questions still lower the score.' },
  { minRatio: 0.58, level: 7, label: 'Developing', descriptor: 'Enough comprehension to progress, but accuracy drops when distractors tighten.' },
  { minRatio: 0.45, level: 6, label: 'Below target', descriptor: 'Core meaning is often understood, but details and viewpoint tracking remain unstable.' },
  { minRatio: 0, level: 5, label: 'Needs rebuilding', descriptor: 'Reading process is still too slow or too reactive for CELPIP-style pressure.' },
];

export const CELPIP_READING_TEST_CATALOG = [
  {
    id: 'reading-test-01',
    order: 1,
    access: 'free',
    status: 'published',
    title: 'Free Full Reading Test',
    focus: 'Balanced full-form simulation across all four CELPIP reading parts',
    summary: 'Production baseline form used for calibration and learner diagnostics.',
  },
  {
    id: 'reading-test-02',
    order: 2,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 02',
    focus: 'Workplace notices, comparison logic, and viewpoint tracking',
    summary: 'Designed to punish shallow keyword matching and force cleaner elimination.',
  },
  {
    id: 'reading-test-03',
    order: 3,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 03',
    focus: 'Longer passage pacing, inference, and evidence selection',
    summary: 'Harder paraphrase pressure with tighter time-management demands.',
  },
  {
    id: 'reading-test-04',
    order: 4,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 04',
    focus: 'Mixed difficulty set with stronger distractors',
    summary: 'Closest to a pressure-test form for learners targeting CLB 9 and above.',
  },
  {
    id: 'reading-test-05',
    order: 5,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 05',
    focus: 'Policy interpretation, clause exceptions, and precision traps',
    summary: 'Adds denser legal-style phrasing with stronger near-miss distractors.',
  },
  {
    id: 'reading-test-06',
    order: 6,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 06',
    focus: 'Diagram application speed under compressed decision windows',
    summary: 'Targets accuracy when details are spread across prose and tables.',
  },
  {
    id: 'reading-test-07',
    order: 7,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 07',
    focus: 'Paraphrase-heavy passages with competing partial truths',
    summary: 'Built to expose keyword-only strategies and reward proof-based reading.',
  },
  {
    id: 'reading-test-08',
    order: 8,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 08',
    focus: 'Public notices and service updates with timeline conflicts',
    summary: 'Emphasizes date, condition, and eligibility precision.',
  },
  {
    id: 'reading-test-09',
    order: 9,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 09',
    focus: 'Information synthesis across multiple stakeholder viewpoints',
    summary: 'Increases cognitive load on stance tracking and compromise positions.',
  },
  {
    id: 'reading-test-10',
    order: 10,
    access: 'premium',
    status: 'draft',
    title: 'Reading Test 10',
    focus: 'Capstone pressure form with elevated inference ambiguity',
    summary: 'Final benchmark-level simulation before live exam day.',
  },
];

export const CELPIP_READING_PREMIUM_TESTS = CELPIP_READING_TEST_CATALOG.filter(
  (entry) => entry.access === 'premium',
);

const paragraph = (text) => ({ type: 'paragraph', text });
const meta = (text) => ({ type: 'meta', text });
const label = (text) => ({ type: 'label', text });
const divider = () => ({ type: 'divider' });

export const CELPIP_READING_WORK_AREAS = {
  detail: {
    title: 'Detail tracking',
    diagnosis: 'You are losing marks on questions that depend on one exact fact, date, condition, or restriction.',
    action: 'Slow down only at the proof line and confirm the exact condition before you choose.',
    lessons: [
      {
        title: 'CELPIP Reading Detail Location Discipline',
        href: '/lessons/reading/celpip-reading-detail-location-discipline/',
      },
      {
        title: 'CELPIP Reading Diagram Accuracy System',
        href: '/lessons/reading/celpip-reading-diagram-accuracy-system/',
      },
    ],
  },
  paraphrase: {
    title: 'Paraphrase recognition',
    diagnosis: 'You are following repeated words too literally instead of matching the meaning in different wording.',
    action: 'Use keywords to locate the zone, then restate the sentence in simpler words before choosing.',
    lessons: [
      {
        title: 'CELPIP Reading: Scan for Proof, Not Just Keyword Match',
        href: '/lessons/reading/celpip-reading-scan-for-proof-not-keyword-match-b1/',
      },
      {
        title: 'CELPIP Reading Specific vs General Meaning',
        href: '/lessons/reading/celpip-reading-specific-vs-general-meaning/',
      },
    ],
  },
  inference: {
    title: 'Inference control',
    diagnosis: 'You are adding ideas that feel reasonable instead of building the answer from clues in the passage.',
    action: 'Write the clue chain in your head first, then choose the option that matches that chain most closely.',
    lessons: [
      {
        title: 'CELPIP Reading Inference Proof Framework',
        href: '/lessons/reading/celpip-reading-inference-proof-framework/',
      },
    ],
  },
  viewpoint: {
    title: 'Viewpoint tracking',
    diagnosis: 'You are mixing up who believes what, especially when several speakers or claims appear together.',
    action: 'Track the speaker, the contrast words, and the final stance before answering.',
    lessons: [
      {
        title: 'CELPIP Reading Viewpoint Confusion Fix',
        href: '/lessons/reading/celpip-reading-viewpoint-confusion-fix/',
      },
    ],
  },
  'main-idea': {
    title: 'Main idea and paragraph purpose',
    diagnosis: 'You are finding details but missing the overall claim, function, or final position of the passage.',
    action: 'Ask what job the paragraph is doing before you compare answer choices.',
    lessons: [
      {
        title: 'CELPIP Reading Main Idea and Paragraph Purpose',
        href: '/lessons/reading/celpip-reading-main-idea-and-paragraph-purpose/',
      },
    ],
  },
  timing: {
    title: 'Time control',
    diagnosis: 'Your score suggests that pacing, unanswered items, or late-section pressure may be costing you marks.',
    action: 'Protect the easy marks first, set a limit for hard items, and return only after the rest of the section is secure.',
    lessons: [
      {
        title: 'CELPIP Reading: Time Management by Question Type',
        href: '/lessons/reading/celpip-reading-time-management-by-question-type-b2/',
      },
    ],
  },
};

export const CELPIP_READING_FREE_TEST = {
  id: 'reading-test-01',
  title: 'Free Full Reading Test',
  durationMinutes: 60,
  estimatedDifficulty: 'Realistic CLB 7–9 pressure',
  totalQuestions: 38,
  sections: [
    /* ──────────────────────────────────────────────────────────
       PART 1 — Reading Correspondence  (11 questions: 5 fill-in-blank + 6 MCQ)
       ────────────────────────────────────────────────────────── */
    {
      id: 'part-1',
      label: 'Part 1',
      title: 'Workplace Safety Training',
      context: 'Read the email and the reply below. Answer Questions 1 to 11.',
      passage: [
        meta('From: Priya Mehta, Health and Safety Coordinator'),
        meta('To: All Building 3 staff'),
        meta('Subject: Updated safety training requirements for Q3'),
        paragraph('Hello everyone,'),
        paragraph('As part of our annual compliance review, the company has updated the mandatory safety training schedule for all staff in Building 3. Please read the following changes carefully, as some deadlines have been moved forward.'),
        paragraph('All employees must complete the online fire safety module by July 15. Previously, the deadline was August 1, but the provincial auditor will visit in the last week of July, so all records must be finalized earlier. The module takes approximately 45 minutes and can be accessed through the staff portal under "Training."'),
        paragraph('Employees who work with chemicals must also attend the in-person WHMIS refresher on either July 8 or July 12. Both sessions run from 9:00 a.m. to 12:00 p.m. in Conference Room 2B. Space is limited to 25 per session, so please register through the portal by June 28. Anyone who does not register by that date will be automatically assigned to the July 12 session if seats remain.'),
        paragraph('Supervisors should note that team members who completed WHMIS training within the past six months do not need to attend again, but they must still complete the fire safety module. If you believe someone on your team qualifies for the exemption, email me directly with the employee\'s name, training date, and certificate number.'),
        paragraph('Thank you for making this a priority.'),
        meta('Priya Mehta'),
        meta('Health and Safety Coordinator, Building 3'),
        divider(),
        meta('From: Daniel Okafor, Lab Technician'),
        meta('To: Priya Mehta'),
        meta('Subject: RE: Updated safety training requirements for Q3'),
        paragraph('Hi Priya,'),
        paragraph('Thank you for the update. I have a few questions about the {{BLANK:q1}} for our department.'),
        paragraph('I completed WHMIS training in April, so I believe I qualify for the {{BLANK:q2}}. I will send you my certificate details separately. However, I still need to complete the fire safety {{BLANK:q3}} before the new deadline.'),
        paragraph('One of my colleagues, Tariq, started working here in May and has not taken any safety training yet. Could you confirm whether he needs to attend {{BLANK:q4}} the WHMIS refresher and the fire safety module?'),
        paragraph('Also, Tariq works the afternoon shift and cannot attend the morning sessions. Is there an {{BLANK:q5}} for employees who have scheduling conflicts? If not, I would like to suggest that an afternoon session be added.'),
        paragraph('Thank you for your help.'),
        meta('Daniel'),
      ],
      questions: [
        {
          id: 'q1',
          number: 1,
          type: 'select',
          prompt: 'Fill in blank 1: "I have a few questions about the ____ for our department."',
          options: [
            { id: 'a', text: 'schedule changes' },
            { id: 'b', text: 'training requirements' },
            { id: 'c', text: 'building renovations' },
            { id: 'd', text: 'team assignments' },
          ],
          correctAnswer: 'b',
          explanation: 'The original email describes updated training requirements. Daniel is asking about those requirements for his department.',
          skillTag: 'paraphrase',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          number: 2,
          type: 'select',
          prompt: 'Fill in blank 2: "I believe I qualify for the ____."',
          options: [
            { id: 'a', text: 'promotion' },
            { id: 'b', text: 'exemption' },
            { id: 'c', text: 'extension' },
            { id: 'd', text: 'transfer' },
          ],
          correctAnswer: 'b',
          explanation: 'Priya\'s email says employees who completed WHMIS within six months do not need to attend again. Daniel completed it in April, so he is requesting an exemption.',
          skillTag: 'paraphrase',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          number: 3,
          type: 'select',
          prompt: 'Fill in blank 3: "I still need to complete the fire safety ____."',
          options: [
            { id: 'a', text: 'inspection' },
            { id: 'b', text: 'drill' },
            { id: 'c', text: 'module' },
            { id: 'd', text: 'certification' },
          ],
          correctAnswer: 'c',
          explanation: 'Priya\'s email refers to "the online fire safety module." Daniel uses the same term.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          number: 4,
          type: 'select',
          prompt: 'Fill in blank 4: "Could you confirm whether he needs to attend ____ the WHMIS refresher and the fire safety module?"',
          options: [
            { id: 'a', text: 'neither' },
            { id: 'b', text: 'only' },
            { id: 'c', text: 'either' },
            { id: 'd', text: 'both' },
          ],
          correctAnswer: 'd',
          explanation: 'Tariq is a new employee with no prior training, so he would need both the WHMIS refresher and the fire safety module.',
          skillTag: 'inference',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          number: 5,
          type: 'select',
          prompt: 'Fill in blank 5: "Is there an ____ for employees who have scheduling conflicts?"',
          options: [
            { id: 'a', text: 'alternative' },
            { id: 'b', text: 'exemption' },
            { id: 'c', text: 'penalty' },
            { id: 'd', text: 'deadline' },
          ],
          correctAnswer: 'a',
          explanation: 'Daniel is asking whether there is another option because Tariq cannot attend the morning sessions. "Alternative" fits the context of requesting a different arrangement.',
          skillTag: 'paraphrase',
          difficulty: 'easy',
        },
        {
          id: 'q6',
          number: 6,
          type: 'single',
          prompt: 'Why was the fire safety deadline moved from August 1 to July 15?',
          options: [
            { id: 'a', text: 'The training portal will be offline in August.' },
            { id: 'b', text: 'A provincial auditor is visiting at the end of July.' },
            { id: 'c', text: 'The fire safety instructor is unavailable in August.' },
            { id: 'd', text: 'Building 3 will be closed for repairs in late July.' },
          ],
          correctAnswer: 'b',
          explanation: 'Priya says the provincial auditor will visit in the last week of July, so records must be finalized earlier.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q7',
          number: 7,
          type: 'single',
          prompt: 'What happens to employees who do not register for WHMIS by June 28?',
          options: [
            { id: 'a', text: 'They are exempt from the requirement this quarter.' },
            { id: 'b', text: 'They must attend a weekend session at an external facility.' },
            { id: 'c', text: 'They are automatically assigned to the July 12 session if seats remain.' },
            { id: 'd', text: 'They receive a deduction from their next pay.' },
          ],
          correctAnswer: 'c',
          explanation: 'The email states anyone who does not register by June 28 will be automatically assigned to the July 12 session if seats remain.',
          skillTag: 'detail',
          difficulty: 'hard',
        },
        {
          id: 'q8',
          number: 8,
          type: 'single',
          prompt: 'What must a supervisor provide to request a WHMIS exemption for a team member?',
          options: [
            { id: 'a', text: 'A letter of recommendation and a medical certificate' },
            { id: 'b', text: 'The employee\'s name, training date, and certificate number' },
            { id: 'c', text: 'Proof that the employee has completed the fire safety module' },
            { id: 'd', text: 'A signed form from the provincial auditor' },
          ],
          correctAnswer: 'b',
          explanation: 'Priya says supervisors should email her directly with the employee\'s name, training date, and certificate number.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q9',
          number: 9,
          type: 'single',
          prompt: 'What is the main purpose of Daniel\'s reply email?',
          options: [
            { id: 'a', text: 'To report a safety violation in his department' },
            { id: 'b', text: 'To ask for clarification about training requirements and scheduling' },
            { id: 'c', text: 'To recommend that Priya cancel the WHMIS sessions' },
            { id: 'd', text: 'To apply for a position in a different department' },
          ],
          correctAnswer: 'b',
          explanation: 'Daniel is asking about his own exemption status, Tariq\'s requirements, and a possible afternoon session.',
          skillTag: 'main-idea',
          difficulty: 'medium',
        },
        {
          id: 'q10',
          number: 10,
          type: 'single',
          prompt: 'Why does Daniel mention that Tariq works the afternoon shift?',
          options: [
            { id: 'a', text: 'Tariq wants to be assigned to a different building.' },
            { id: 'b', text: 'Tariq cannot attend the morning WHMIS sessions.' },
            { id: 'c', text: 'Tariq prefers to complete training online rather than in person.' },
            { id: 'd', text: 'Tariq has already completed training at a previous job.' },
          ],
          correctAnswer: 'b',
          explanation: 'Daniel explains that Tariq works afternoons and cannot attend the morning sessions, then asks about alternatives.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q11',
          number: 11,
          type: 'multi',
          selectCount: 2,
          prompt: 'Which TWO statements are true about Daniel?',
          options: [
            { id: 'a', text: 'He needs to attend the WHMIS refresher in July.' },
            { id: 'b', text: 'He completed WHMIS training recently enough to request an exemption.' },
            { id: 'c', text: 'He started working at the company in May.' },
            { id: 'd', text: 'He still needs to complete the online fire safety module.' },
          ],
          correctAnswer: ['b', 'd'],
          explanation: 'Daniel completed WHMIS in April (within six months, qualifying for exemption) but still needs to finish the fire safety module. He is not the new employee — Tariq is.',
          skillTag: 'detail',
          difficulty: 'hard',
        },
      ],
    },

    /* ──────────────────────────────────────────────────────────
       PART 2 — Reading to Apply a Diagram  (8 questions)
       ────────────────────────────────────────────────────────── */
    {
      id: 'part-2',
      label: 'Part 2',
      title: 'Maplewood Waste Sorting Guide',
      context: 'Read the waste sorting guide and the table. Answer Questions 12 to 19.',
      passage: [
        paragraph('The City of Maplewood recently updated its curbside waste sorting rules. All households must separate waste into four streams: blue box (recyclables), green bin (organics), grey bin (garbage), and special drop-off items. Collection happens weekly on each resident\'s designated day.'),
        paragraph('Blue box materials include clean paper, cardboard, metal cans, glass bottles, and rigid plastics marked with recycling symbols 1 through 5. Plastic bags, styrofoam, and soft plastics such as chip bags cannot go in the blue box. Instead, soft plastics should be collected in a single transparent bag and placed on top of the blue box on collection day.'),
        paragraph('The green bin accepts all food scraps, including meat and dairy, as well as soiled paper products such as paper towels and pizza boxes. Yard waste like leaves and small branches may go in the green bin only between April and November. From December through March, yard waste must be bundled separately and placed beside the green bin.'),
        paragraph('The grey bin is for items that do not fit into the other three streams. Common examples include broken ceramics, diapers, and heavily soiled items that cannot be composted. Household hazardous waste such as paint, batteries, and motor oil must never go in any curbside bin. These items require a special drop-off at the Maplewood Environmental Centre, which is open Saturdays from 8:00 a.m. to 3:00 p.m.'),
      ],
      diagram: {
        caption: 'Maplewood Curbside Waste Sorting Guide',
        headers: ['Waste Stream', 'Bin', 'Accepted', 'Notes / restrictions'],
        rows: [
          ['Recyclables', 'Blue box', 'Clean paper, cardboard, metal cans, glass bottles, rigid plastics #1–5', 'No plastic bags, styrofoam, or soft plastics'],
          ['Organics', 'Green bin', 'Food scraps (all types), soiled paper, yard waste (Apr–Nov)', 'Yard waste Dec–Mar must be bundled separately'],
          ['Garbage', 'Grey bin', 'Broken ceramics, diapers, non-compostable soiled items', 'No hazardous waste'],
          ['Special drop-off', 'Environmental Centre', 'Paint, batteries, motor oil, hazardous waste', 'Open Saturdays 8 a.m.–3 p.m.'],
        ],
      },
      questions: [
        {
          id: 'q12',
          number: 12,
          type: 'single',
          prompt: 'A resident has an empty peanut butter jar made of rigid plastic #5. Where should it go?',
          options: [
            { id: 'a', text: 'Green bin' },
            { id: 'b', text: 'Blue box' },
            { id: 'c', text: 'Grey bin' },
            { id: 'd', text: 'Special drop-off' },
          ],
          correctAnswer: 'b',
          explanation: 'Rigid plastics marked with recycling symbols 1 through 5 go in the blue box.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q13',
          number: 13,
          type: 'single',
          prompt: 'A family found three half-full cans of spray paint in their garage. What should they do?',
          options: [
            { id: 'a', text: 'Put them in the grey bin on collection day.' },
            { id: 'b', text: 'Place them in a transparent bag on top of the blue box.' },
            { id: 'c', text: 'Take them to the Maplewood Environmental Centre on a Saturday.' },
            { id: 'd', text: 'Put them in the green bin with other household items.' },
          ],
          correctAnswer: 'c',
          explanation: 'Paint is classified as household hazardous waste, which must be taken to the Environmental Centre.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q14',
          number: 14,
          type: 'single',
          prompt: 'In January, a homeowner has a pile of fallen branches. How should they be disposed of?',
          options: [
            { id: 'a', text: 'Put them in the green bin.' },
            { id: 'b', text: 'Bundle them separately and place them beside the green bin.' },
            { id: 'c', text: 'Put them in the grey bin.' },
            { id: 'd', text: 'Take them to the Environmental Centre.' },
          ],
          correctAnswer: 'b',
          explanation: 'From December through March, yard waste must be bundled separately and placed beside the green bin, not inside it.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q15',
          number: 15,
          type: 'single',
          prompt: 'A resident wants to dispose of used chip bags. What is the correct method?',
          options: [
            { id: 'a', text: 'Place them directly in the blue box.' },
            { id: 'b', text: 'Put them in the grey bin.' },
            { id: 'c', text: 'Collect them in a transparent bag and place it on top of the blue box.' },
            { id: 'd', text: 'Put them in the green bin.' },
          ],
          correctAnswer: 'c',
          explanation: 'Chip bags are classified as soft plastics. Soft plastics should be collected in a single transparent bag and placed on top of the blue box.',
          skillTag: 'detail',
          difficulty: 'hard',
        },
        {
          id: 'q16',
          number: 16,
          type: 'single',
          prompt: 'Which item belongs in the green bin?',
          options: [
            { id: 'a', text: 'A clean newspaper' },
            { id: 'b', text: 'A pizza box with grease stains' },
            { id: 'c', text: 'A broken ceramic plate' },
            { id: 'd', text: 'An empty motor oil container' },
          ],
          correctAnswer: 'b',
          explanation: 'Soiled paper products such as pizza boxes go in the green bin. Clean paper goes in the blue box.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q17',
          number: 17,
          type: 'single',
          prompt: 'According to the guide, where should styrofoam packaging go?',
          options: [
            { id: 'a', text: 'In the blue box with other recyclables' },
            { id: 'b', text: 'In a transparent bag on top of the blue box' },
            { id: 'c', text: 'In the grey bin' },
            { id: 'd', text: 'At the Environmental Centre' },
          ],
          correctAnswer: 'c',
          explanation: 'Styrofoam cannot go in the blue box and is not classified as a soft plastic. Since it does not fit the blue, green, or special drop-off streams, it goes in the grey bin.',
          skillTag: 'inference',
          difficulty: 'hard',
        },
        {
          id: 'q18',
          number: 18,
          type: 'single',
          prompt: 'When is the Environmental Centre open for hazardous waste drop-off?',
          options: [
            { id: 'a', text: 'Monday through Friday, 9:00 a.m. to 5:00 p.m.' },
            { id: 'b', text: 'Saturdays, 8:00 a.m. to 3:00 p.m.' },
            { id: 'c', text: 'Sundays, 10:00 a.m. to 2:00 p.m.' },
            { id: 'd', text: 'Every day during business hours' },
          ],
          correctAnswer: 'b',
          explanation: 'The guide states the Maplewood Environmental Centre is open Saturdays from 8:00 a.m. to 3:00 p.m.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q19',
          number: 19,
          type: 'single',
          prompt: 'Which statement correctly applies information from both the text and the table?',
          options: [
            { id: 'a', text: 'Batteries belong in the grey bin because it is for non-recyclable items.' },
            { id: 'b', text: 'Metal cans go in the green bin because they contain food residue.' },
            { id: 'c', text: 'Soiled paper products go in the green bin because they are compostable.' },
            { id: 'd', text: 'Clean cardboard goes in the green bin with other paper products.' },
          ],
          correctAnswer: 'c',
          explanation: 'The text says the green bin accepts soiled paper products such as paper towels and pizza boxes. The table confirms the green bin is for organics including soiled paper. Batteries require special drop-off, not the grey bin.',
          skillTag: 'paraphrase',
          difficulty: 'medium',
        },
      ],
    },

    /* ──────────────────────────────────────────────────────────
       PART 3 — Reading for Information  (9 questions)
       ────────────────────────────────────────────────────────── */
    {
      id: 'part-3',
      label: 'Part 3',
      title: 'Regional Transit Expansion Plan',
      context: 'Read the article. Answer Questions 20 to 28.',
      passage: [
        label('Paragraph 1'),
        paragraph('The Regional Transportation Authority (RTA) has approved a five-year plan to expand bus and light rail services across the metropolitan area. The plan, estimated at $2.3 billion, was adopted after three years of public consultation and ridership studies. Officials say the expansion is intended to reduce car dependency, ease congestion on major corridors, and improve access for underserved communities.'),
        label('Paragraph 2'),
        paragraph('Under the current proposal, three new light rail lines will be constructed to connect the downtown core with suburban centres to the north, east, and southwest. Each line will include park-and-ride facilities at terminal stations, allowing commuters to drive to the station and transfer to rail. Construction on the first line is expected to begin in early 2027, with full service projected for 2030.'),
        label('Paragraph 3'),
        paragraph('Bus routes will also be restructured to feed into the new rail network. The RTA plans to replace several long, winding routes with shorter, more frequent services that connect neighbourhoods to the nearest rail station. Route planning data shows that current routes force some passengers to ride for over an hour to reach destinations that are only fifteen minutes away by car. The new bus structure aims to close this gap.'),
        label('Paragraph 4'),
        paragraph('Funding for the project will come from three sources. The federal government has committed $900 million through the National Transit Investment Fund. The provincial government will contribute $700 million over five years. The remaining $700 million will be raised locally through a combination of property tax increases and development charges applied to new residential and commercial projects near transit stations.'),
        label('Paragraph 5'),
        paragraph('Not everyone supports the plan. Some suburban councillors argue that the cost is too high and that taxpayers who rarely use transit will carry an unfair burden. Business groups near proposed construction zones have expressed concern about disruption to foot traffic and parking during the multi-year build. Others point out that similar projects in comparable cities have exceeded their original budgets by 20 to 40 percent.'),
        label('Paragraph 6'),
        paragraph('The RTA acknowledges these risks but argues that the long-term economic benefits outweigh the short-term costs. Internal modelling suggests the new system could remove up to 45,000 daily car trips from major roads within five years of completion, reducing both congestion and emissions. The authority has also committed to quarterly public reporting on spending and construction timelines to maintain accountability.'),
      ],
      questions: [
        {
          id: 'q20',
          number: 20,
          type: 'matching',
          prompt: 'In which paragraph can you find information about how the project will be paid for?',
          options: [
            { id: 'a', text: 'Paragraph 1' },
            { id: 'b', text: 'Paragraph 3' },
            { id: 'c', text: 'Paragraph 4' },
            { id: 'd', text: 'Paragraph 6' },
          ],
          correctAnswer: 'c',
          explanation: 'Paragraph 4 describes the three funding sources: federal, provincial, and local.',
          skillTag: 'main-idea',
          difficulty: 'medium',
        },
        {
          id: 'q21',
          number: 21,
          type: 'matching',
          prompt: 'In which paragraph does the author describe concerns raised by opponents of the plan?',
          options: [
            { id: 'a', text: 'Paragraph 2' },
            { id: 'b', text: 'Paragraph 3' },
            { id: 'c', text: 'Paragraph 5' },
            { id: 'd', text: 'Paragraph 6' },
          ],
          correctAnswer: 'c',
          explanation: 'Paragraph 5 presents the objections from suburban councillors, business groups, and others.',
          skillTag: 'main-idea',
          difficulty: 'easy',
        },
        {
          id: 'q22',
          number: 22,
          type: 'matching',
          prompt: 'In which paragraph is the reason for restructuring bus routes explained?',
          options: [
            { id: 'a', text: 'Paragraph 1' },
            { id: 'b', text: 'Paragraph 3' },
            { id: 'c', text: 'Paragraph 4' },
            { id: 'd', text: 'Paragraph 5' },
          ],
          correctAnswer: 'b',
          explanation: 'Paragraph 3 explains that current bus routes are inefficient and will be restructured to connect to the new rail network.',
          skillTag: 'main-idea',
          difficulty: 'medium',
        },
        {
          id: 'q23',
          number: 23,
          type: 'single',
          prompt: 'What is the main goal of the transit expansion plan?',
          options: [
            { id: 'a', text: 'To replace all existing bus routes with light rail lines' },
            { id: 'b', text: 'To reduce car dependency and improve access for underserved communities' },
            { id: 'c', text: 'To increase property tax revenue for the city' },
            { id: 'd', text: 'To create construction jobs across the metropolitan area' },
          ],
          correctAnswer: 'b',
          explanation: 'Paragraph 1 states the expansion is intended to reduce car dependency, ease congestion, and improve access for underserved communities.',
          skillTag: 'main-idea',
          difficulty: 'easy',
        },
        {
          id: 'q24',
          number: 24,
          type: 'single',
          prompt: 'How will commuters use the park-and-ride facilities?',
          options: [
            { id: 'a', text: 'They will park at downtown stations and walk to their workplaces.' },
            { id: 'b', text: 'They will drive to terminal stations and transfer to rail.' },
            { id: 'c', text: 'They will ride buses from parking lots near the highway.' },
            { id: 'd', text: 'They will leave their cars at home and take a shuttle bus.' },
          ],
          correctAnswer: 'b',
          explanation: 'Paragraph 2 says park-and-ride facilities at terminal stations allow commuters to drive to the station and transfer to rail.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q25',
          number: 25,
          type: 'single',
          prompt: 'According to the passage, what problem do current bus routes have?',
          options: [
            { id: 'a', text: 'They are too expensive for most passengers to afford.' },
            { id: 'b', text: 'They do not run frequently enough during rush hour.' },
            { id: 'c', text: 'Some routes take much longer than driving the same distance.' },
            { id: 'd', text: 'They do not connect to any rail stations in the city.' },
          ],
          correctAnswer: 'c',
          explanation: 'Paragraph 3 says current routes force some passengers to ride for over an hour to reach destinations that are only fifteen minutes away by car.',
          skillTag: 'paraphrase',
          difficulty: 'hard',
        },
        {
          id: 'q26',
          number: 26,
          type: 'single',
          prompt: 'How much of the total project cost will come from federal funding?',
          options: [
            { id: 'a', text: '$700 million' },
            { id: 'b', text: '$900 million' },
            { id: 'c', text: '$2.3 billion' },
            { id: 'd', text: '$1.6 billion' },
          ],
          correctAnswer: 'b',
          explanation: 'Paragraph 4 states the federal government has committed $900 million through the National Transit Investment Fund.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q27',
          number: 27,
          type: 'single',
          prompt: 'What concern do business groups near construction zones have?',
          options: [
            { id: 'a', text: 'That it will permanently reduce their property values' },
            { id: 'b', text: 'That it will cause disruption to foot traffic and parking' },
            { id: 'c', text: 'That it will lead to higher transit fares for their employees' },
            { id: 'd', text: 'That it will eliminate nearby bus stops permanently' },
          ],
          correctAnswer: 'b',
          explanation: 'Paragraph 5 says business groups near proposed construction zones are concerned about disruption to foot traffic and parking.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q28',
          number: 28,
          type: 'single',
          prompt: 'How does the RTA plan to address concerns about cost and transparency?',
          options: [
            { id: 'a', text: 'By reducing the number of new rail lines from three to two' },
            { id: 'b', text: 'By issuing quarterly reports on spending and construction timelines' },
            { id: 'c', text: 'By asking the federal government to cover all additional costs' },
            { id: 'd', text: 'By postponing construction until all funding is confirmed' },
          ],
          correctAnswer: 'b',
          explanation: 'Paragraph 6 says the RTA has committed to quarterly public reporting on spending and construction timelines to maintain accountability.',
          skillTag: 'paraphrase',
          difficulty: 'hard',
        },
      ],
    },

    /* ──────────────────────────────────────────────────────────
       PART 4 — Reading for Viewpoints  (10 questions)
       ────────────────────────────────────────────────────────── */
    {
      id: 'part-4',
      label: 'Part 4',
      title: 'Single-Use Plastics Bylaw Debate',
      context: 'Read the public comments. Answer Questions 29 to 38.',
      passage: [
        paragraph('The city council is considering a bylaw that would ban all single-use plastic items in restaurants, including straws, cutlery, takeout containers, and drink lids. The following statements were submitted during the public comment period.'),
        label('Rachel Simmons, environmental advocate'),
        paragraph('This bylaw is long overdue. Single-use plastics account for a significant portion of the waste found in rivers and parks. Compostable alternatives already exist, and several other Canadian cities have adopted similar bans with measurable results. The inconvenience to businesses is real but temporary. Within a year, most restaurants in those cities adjusted their supply chains without major financial harm. The environmental cost of doing nothing is far greater than the cost of switching materials.'),
        label('Kevin Tran, restaurant owner'),
        paragraph('I am not opposed to reducing plastic waste, but this bylaw moves too fast. The compostable alternatives Rachel mentions are still two to three times more expensive than plastic, and those costs will fall on small restaurants like mine. A large chain can absorb the price increase, but an independent restaurant operating on thin margins cannot. I would support a phased approach \u2014 start with the largest chains and give smaller businesses two additional years to comply. That way, the environmental goal is still met, but the burden is distributed more fairly.'),
        label('Dr. Amara Osei, public health researcher'),
        paragraph('The conversation around this bylaw tends to focus on either environment or cost, but there is a public health dimension as well. Some compostable materials have not been tested as thoroughly as conventional plastics for food contact safety, especially at high temperatures. Before mandating a switch, the city should require that any approved alternative meets the same food-grade safety standards. I support the environmental goal, but the implementation must account for safety evidence that has not yet been fully established.'),
        label('Martin Fischer, city councillor'),
        paragraph('I voted in favour of introducing the bylaw for debate because I believe the council has a responsibility to act on environmental policy. However, I share some of Kevin\'s concerns about the timeline. I would also add that enforcement is a practical question we have not answered yet. Who inspects restaurants? What are the penalties? Without a clear enforcement framework, the bylaw risks becoming symbolic rather than effective. I believe we should pass the bylaw but attach a one-year transition period and a funded enforcement plan.'),
      ],
      questions: [
        {
          id: 'q29',
          number: 29,
          type: 'single',
          prompt: 'What is Rachel Simmons\' main argument in favour of the bylaw?',
          options: [
            { id: 'a', text: 'Compostable materials are cheaper than single-use plastics.' },
            { id: 'b', text: 'The environmental cost of inaction outweighs the cost of switching.' },
            { id: 'c', text: 'Restaurants will increase profits by using less packaging.' },
            { id: 'd', text: 'Other countries have already eliminated all single-use plastic waste.' },
          ],
          correctAnswer: 'b',
          explanation: 'Rachel says "The environmental cost of doing nothing is far greater than the cost of switching materials."',
          skillTag: 'viewpoint',
          difficulty: 'easy',
        },
        {
          id: 'q30',
          number: 30,
          type: 'single',
          prompt: 'Why does Kevin Tran oppose the current version of the bylaw?',
          options: [
            { id: 'a', text: 'He does not believe plastic waste is an environmental problem.' },
            { id: 'b', text: 'He thinks compostable alternatives are dangerous to public health.' },
            { id: 'c', text: 'He believes it unfairly burdens small businesses due to the cost and timeline.' },
            { id: 'd', text: 'He wants the city to ban all takeout food entirely.' },
          ],
          correctAnswer: 'c',
          explanation: 'Kevin says compostable options are two to three times more expensive and independent restaurants on thin margins cannot absorb the cost. He wants a phased approach.',
          skillTag: 'viewpoint',
          difficulty: 'medium',
        },
        {
          id: 'q31',
          number: 31,
          type: 'single',
          prompt: 'What does Dr. Osei add to the discussion that the other speakers do not address?',
          options: [
            { id: 'a', text: 'The environmental impact of plastics in rivers' },
            { id: 'b', text: 'The cost difference between plastic and compostable alternatives' },
            { id: 'c', text: 'Food contact safety concerns about compostable materials' },
            { id: 'd', text: 'The need for a phased timeline for small businesses' },
          ],
          correctAnswer: 'c',
          explanation: 'Dr. Osei is the only speaker who raises the issue of food contact safety, especially at high temperatures.',
          skillTag: 'viewpoint',
          difficulty: 'hard',
        },
        {
          id: 'q32',
          number: 32,
          type: 'single',
          prompt: 'Which speaker agrees with the environmental goal but raises concerns about enforcement?',
          options: [
            { id: 'a', text: 'Rachel Simmons' },
            { id: 'b', text: 'Kevin Tran' },
            { id: 'c', text: 'Dr. Amara Osei' },
            { id: 'd', text: 'Martin Fischer' },
          ],
          correctAnswer: 'd',
          explanation: 'Martin voted in favour but asks who will inspect restaurants and what penalties exist, calling enforcement an unanswered question.',
          skillTag: 'viewpoint',
          difficulty: 'medium',
        },
        {
          id: 'q33',
          number: 33,
          type: 'single',
          prompt: 'What specific change does Kevin suggest to make the bylaw fairer?',
          options: [
            { id: 'a', text: 'Ban plastics in all restaurants at the same time.' },
            { id: 'b', text: 'Start with large chains and give small businesses more time to comply.' },
            { id: 'c', text: 'Allow all restaurants to opt out of the bylaw if they prefer.' },
            { id: 'd', text: 'Focus only on plastic straws and ignore other items.' },
          ],
          correctAnswer: 'b',
          explanation: 'Kevin suggests a phased approach: start with the largest chains and give smaller businesses two additional years to comply.',
          skillTag: 'detail',
          difficulty: 'easy',
        },
        {
          id: 'q34',
          number: 34,
          type: 'single',
          prompt: 'According to Rachel, what happened in other Canadian cities that adopted similar bans?',
          options: [
            { id: 'a', text: 'Most restaurants closed within the first year.' },
            { id: 'b', text: 'Restaurants adjusted their supply chains without major financial harm.' },
            { id: 'c', text: 'Compostable alternatives became more expensive than expected.' },
            { id: 'd', text: 'Public support for the ban decreased over time.' },
          ],
          correctAnswer: 'b',
          explanation: 'Rachel says within a year, most restaurants in those cities adjusted their supply chains without major financial harm.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q35',
          number: 35,
          type: 'single',
          prompt: 'What specific concern does Dr. Osei raise about compostable food packaging?',
          options: [
            { id: 'a', text: 'It costs too much for small restaurant owners.' },
            { id: 'b', text: 'It has not been fully tested for safety at high temperatures.' },
            { id: 'c', text: 'It produces more greenhouse gas emissions than plastic.' },
            { id: 'd', text: 'It is not available in large enough quantities.' },
          ],
          correctAnswer: 'b',
          explanation: 'Dr. Osei says some compostable materials have not been tested as thoroughly for food contact safety, especially at high temperatures.',
          skillTag: 'detail',
          difficulty: 'medium',
        },
        {
          id: 'q36',
          number: 36,
          type: 'multi',
          selectCount: 2,
          prompt: 'Which TWO speakers explicitly support the bylaw but want changes to the timeline?',
          options: [
            { id: 'a', text: 'Rachel Simmons' },
            { id: 'b', text: 'Kevin Tran' },
            { id: 'c', text: 'Dr. Amara Osei' },
            { id: 'd', text: 'Martin Fischer' },
          ],
          correctAnswer: ['b', 'd'],
          explanation: 'Kevin wants a phased approach giving small businesses more time. Martin wants a one-year transition period. Dr. Osei\'s concern is safety testing, not the timeline specifically.',
          skillTag: 'viewpoint',
          difficulty: 'hard',
        },
        {
          id: 'q37',
          number: 37,
          type: 'single',
          prompt: 'What does Martin Fischer mean when he says the bylaw could become "symbolic rather than effective"?',
          options: [
            { id: 'a', text: 'The bylaw would receive media attention but not actually reduce waste.' },
            { id: 'b', text: 'Restaurants might ignore the ban because there is no enforcement plan.' },
            { id: 'c', text: 'The bylaw would apply only to chain restaurants, not small businesses.' },
            { id: 'd', text: 'Councillors would take credit for the bylaw without providing funding.' },
          ],
          correctAnswer: 'b',
          explanation: 'Martin asks who inspects restaurants and what the penalties are, implying that without enforcement, the ban would exist on paper but not in practice.',
          skillTag: 'inference',
          difficulty: 'hard',
        },
        {
          id: 'q38',
          number: 38,
          type: 'single',
          prompt: 'Which statement best describes the overall relationship between the four viewpoints?',
          options: [
            { id: 'a', text: 'All four speakers completely oppose the bylaw.' },
            { id: 'b', text: 'All four speakers agree on both the goal and the implementation details.' },
            { id: 'c', text: 'All four speakers share the environmental goal, but three raise different concerns about implementation.' },
            { id: 'd', text: 'Only Rachel supports environmental action while the others prioritize business interests.' },
          ],
          correctAnswer: 'c',
          explanation: 'Rachel fully supports the bylaw. Kevin, Dr. Osei, and Martin each support the environmental goal but raise different concerns: cost/timeline, safety, and enforcement.',
          skillTag: 'inference',
          difficulty: 'hard',
        },
      ],
    },
  ],
};

export const CELPIP_READING_TEST_CONTENT = {
  [CELPIP_READING_FREE_TEST.id]: CELPIP_READING_FREE_TEST,
};

export function getReadingTest(testId = CELPIP_READING_FREE_TEST.id) {
  return CELPIP_READING_TEST_CONTENT[testId] || null;
}

export function listPublishedReadingTests() {
  return CELPIP_READING_TEST_CATALOG
    .filter((entry) => entry.status === 'published')
    .map((entry) => ({
      ...entry,
      test: getReadingTest(entry.id),
    }))
    .filter((entry) => Boolean(entry.test));
}

export function listPlayableReadingTestsForViewer(options = {}) {
  const hasPremiumAccess = Boolean(options.hasPremiumAccess);
  return CELPIP_READING_TEST_CATALOG
    .filter((entry) => entry.status === 'published')
    .filter((entry) => entry.access === 'free' || hasPremiumAccess)
    .map((entry) => ({
      ...entry,
      test: getReadingTest(entry.id),
    }))
    .filter((entry) => Boolean(entry.test));
}

export function flattenReadingQuestions(test = CELPIP_READING_FREE_TEST) {
  return test.sections.flatMap((section) =>
    section.questions.map((question) => ({
      ...question,
      sectionId: section.id,
      sectionLabel: section.label,
      sectionTitle: section.title,
    })),
  );
}

export function answersMatch(question, response) {
  if (!question) return false;
  if (question.type === 'multi') {
    const expected = Array.isArray(question.correctAnswer) ? [...question.correctAnswer].sort() : [];
    const received = Array.isArray(response) ? [...response].sort() : [];
    return expected.length === received.length && expected.every((value, index) => value === received[index]);
  }

  return String(response || '') === String(question.correctAnswer || '');
}

export function gradeReadingAttempt(test = CELPIP_READING_FREE_TEST, answers = {}) {
  const questions = flattenReadingQuestions(test);
  const sectionTotals = {};
  const skillTotals = {};
  let correct = 0;
  let answered = 0;

  questions.forEach((question) => {
    const response = answers[question.id];
    const hasAnswer = Array.isArray(response) ? response.length > 0 : Boolean(response);
    if (hasAnswer) answered += 1;

    const isCorrect = answersMatch(question, response);
    if (isCorrect) correct += 1;

    const sectionKey = question.sectionId;
    const skillKey = question.skillTag;

    if (!sectionTotals[sectionKey]) {
      sectionTotals[sectionKey] = {
        label: question.sectionLabel,
        title: question.sectionTitle,
        correct: 0,
        total: 0,
      };
    }
    if (!skillTotals[skillKey]) {
      skillTotals[skillKey] = {
        label: skillKey,
        correct: 0,
        total: 0,
      };
    }

    sectionTotals[sectionKey].total += 1;
    skillTotals[skillKey].total += 1;

    if (isCorrect) {
      sectionTotals[sectionKey].correct += 1;
      skillTotals[skillKey].correct += 1;
    }
  });

  const total = questions.length;
  const ratio = total ? correct / total : 0;
  const level = CELPIP_READING_LEVEL_GUIDE.find((entry) => ratio >= entry.minRatio) || CELPIP_READING_LEVEL_GUIDE.at(-1);

  return {
    answered,
    unanswered: total - answered,
    correct,
    total,
    ratio,
    level,
    sectionTotals: Object.values(sectionTotals),
    skillTotals: Object.values(skillTotals),
  };
}
