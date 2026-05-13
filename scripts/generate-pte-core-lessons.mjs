#!/usr/bin/env node
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const LESSON_DIR = path.resolve("src/content/lessons");
const DEFAULT_DATE = "2026-05-12";

const lessonSpecs = [
  {
    slug: "pte-core-exam-format-and-study-plan",
    title: "PTE Core Exam Format and Study Plan",
    skill: "reading",
    category: "reading",
    level: "B2",
    excerpt: "Understand the PTE Core format, section timing, task types, and a practical weekly study plan.",
    heroTip: "Map the test before you practise: know the task type, time pressure, and response format.",
    focus: "the full PTE Core exam structure",
    context:
      "PTE Core is a computer-based English test for everyday, workplace, and immigration communication. The exam feels fast because every task has a specific response style. A strong candidate does not just study English in general. They learn how each task works, then practise with a routine that protects accuracy under time pressure.",
    examples: [
      ["Too weak", "I will just practise random English questions every day.", "Better", "I will practise speaking and writing on Monday, reading on Tuesday, listening on Wednesday, then review errors on Thursday."],
      ["Too weak", "The simulator is only useful at the end.", "Better", "I will use the simulator early to learn the screen flow, then use it again later for timed practice."],
    ],
    how: [
      "Think of PTE Core as three connected sections: Speaking and Writing, Reading, and Listening. The first section checks how clearly you produce English. The reading section checks how well you understand written meaning and grammar. The listening section checks how accurately you follow one-play audio.",
      "Your study plan should separate task learning from timed performance. First, learn what each question type wants. Next, practise the response pattern slowly. Finally, practise with a timer so your brain learns to work in the exam rhythm.",
      "Do not wait until you feel fully ready to see the interface. The screen layout, countdown pressure, and question navigation are part of the skill. Early interface practice reduces surprise on test day.",
    ],
    bullets: [
      "Study by task type, not only by skill name.",
      "Keep an error log with three columns: task, error, repair.",
      "Mix slow practice with timed practice each week.",
      "Review speaking, writing, reading, and listening every week, even if one skill is your main weakness.",
    ],
    mistakes: [
      ["Studying without a map", "I will practise whatever I find online.", "I will practise two question types per day and record the errors I repeat.", "A clear map prevents scattered practice."],
      ["Only chasing full tests", "I need full mock tests every day.", "I need focused drills first, then full tests after my task routines are stable.", "Full tests show problems; focused drills fix them."],
      ["Ignoring timing", "I can answer well if I take as long as I need.", "I will practise the same answer pattern slowly first, then reduce the time.", "Timing must be trained gradually."],
    ],
    choiceQuestion: "Which study plan is strongest for PTE Core?",
    choiceOptions: [
      "Practise only the easiest section until it feels perfect.",
      "Learn each task type, practise response routines, then add timed simulator work.",
      "Memorize long answers and use them for every question.",
    ],
    choiceAnswer: 1,
    orderChunks: ["Learn the task format.", "Practise the response pattern slowly.", "Add a timer and review repeated errors."],
    sortRows: [
      ["Helpful", "Keep a task-by-task error log after practice."],
      ["Helpful", "Use simulator practice to reduce screen surprise."],
      ["Not helpful", "Study random English videos without connecting them to task types."],
      ["Not helpful", "Take full tests daily but never review the mistakes."],
    ],
  },
  {
    slug: "pte-core-speaking-and-writing-section-strategy",
    title: "PTE Core Speaking and Writing Section Strategy",
    skill: "speaking",
    category: "speaking",
    level: "B2",
    excerpt: "Learn how the integrated Speaking and Writing section works and how to stay organized under pressure.",
    heroTip: "Treat Speaking and Writing as one control section: clear delivery, clear structure, and clean grammar.",
    focus: "the integrated speaking and writing section",
    context:
      "The Speaking and Writing section can feel intense because it asks you to switch between spoken delivery and typed answers. The key is not to use difficult English everywhere. The key is to use clear English for the job in front of you: read aloud clearly, respond directly, summarize accurately, and write an email that covers the task.",
    examples: [
      ["Too weak", "I speak quickly so the answer sounds fluent.", "Better", "I speak at a steady speed so words stay clear and complete."],
      ["Too weak", "I start writing as soon as I see the prompt.", "Better", "I spend a short moment identifying purpose, reader, and required details before I write."],
    ],
    how: [
      "This section rewards control. In speaking tasks, control means clear pronunciation, steady rhythm, and a complete response. In writing tasks, control means task coverage, sentence accuracy, and logical order.",
      "A useful section routine is simple: identify the task, decide the response shape, produce the answer, then do one fast check. You do not need a different personality for every task. You need a small set of dependable routines.",
      "For spoken tasks, avoid rushing. For writing tasks, avoid overbuilding. Many candidates lose points because they try to sound advanced before they make the message complete.",
    ],
    bullets: [
      "Use a steady voice before trying to sound impressive.",
      "Write with a clear purpose line and controlled paragraphs.",
      "Keep one main idea per sentence when time is tight.",
      "Practise switching between speaking and writing so the section feels less abrupt.",
    ],
    mistakes: [
      ["Rushing spoken delivery", "I said more words, so my fluency must be better.", "I spoke clearly at a natural pace, so the response was easier to understand.", "Fluency includes smoothness and clarity, not speed alone."],
      ["Writing without planning", "I typed immediately and fixed the structure later.", "I identified the purpose first, then wrote the answer in a clean order.", "A short plan prevents missing key points."],
      ["Using risky grammar", "I forced complex sentences and made agreement errors.", "I used controlled sentences and checked the main verbs.", "Accuracy protects the score."],
    ],
    choiceQuestion: "What is the safest goal for this section?",
    choiceOptions: [
      "Use the most advanced words possible.",
      "Produce clear, complete answers with controlled language.",
      "Speak as fast as possible in every task.",
    ],
    choiceAnswer: 1,
    orderChunks: ["Identify the task.", "Choose the response shape.", "Answer clearly.", "Do one fast check."],
    sortRows: [
      ["Helpful", "Use a steady speaking pace."],
      ["Helpful", "Check that the email covers every required detail."],
      ["Not helpful", "Ignore pronunciation because content is the only score."],
      ["Not helpful", "Add long background information before answering the prompt."],
    ],
  },
  {
    slug: "pte-core-read-aloud-pronunciation-and-meaning",
    title: "PTE Core Read Aloud Pronunciation and Meaning",
    skill: "speaking",
    category: "speaking",
    level: "B2",
    excerpt: "Improve Read Aloud with chunking, stress, pausing, and meaning-first pronunciation.",
    heroTip: "Read in meaning chunks, not word by word.",
    focus: "Read Aloud delivery",
    context:
      "Read Aloud asks you to turn written text into clear spoken English. Many candidates focus only on individual sounds, but the listener also needs rhythm and meaning. Good delivery groups words together, stresses important information, and keeps the voice moving without panic.",
    examples: [
      ["Too weak", "Community / libraries / are / changing / quickly.", "Better", "Community libraries / are changing quickly."],
      ["Too weak", "Every word has the same stress.", "Better", "The key words carry stronger stress: libraries, changing, quickly."],
    ],
    how: [
      "Before you speak, scan the sentence for meaning groups. A meaning group is a small set of words that belong together, such as a noun phrase, verb phrase, or time phrase.",
      "Pause lightly between groups. Do not pause after every word. Small pauses help pronunciation because your mouth has time to reset and the listener can follow the sentence.",
      "Stress content words: nouns, main verbs, adjectives, adverbs, numbers, and names. Grammar words like articles and prepositions are usually lighter unless they carry contrast.",
    ],
    bullets: [
      "Mark natural chunks during preparation.",
      "Keep your voice steady at punctuation.",
      "Do not restart the whole sentence after one small mistake.",
      "Use meaning to guide stress and rhythm.",
    ],
    mistakes: [
      ["Word-by-word reading", "The / centre / offers / free / classes.", "The centre / offers free classes.", "Chunk words that work together."],
      ["Flat stress", "All words sound equally important.", "Main information words are slightly stronger.", "Stress guides the listener."],
      ["Overcorrecting", "I stopped and restarted after one small sound error.", "I continued smoothly after the small error.", "Smooth recovery is better than panic."],
    ],
    choiceQuestion: "Which Read Aloud habit is strongest?",
    choiceOptions: [
      "Pause after every word.",
      "Group words by meaning and keep the rhythm steady.",
      "Speak faster whenever the sentence is long.",
    ],
    choiceAnswer: 1,
    orderChunks: ["Scan for meaning groups.", "Mark the natural pauses.", "Read with steady stress and rhythm."],
    sortRows: [
      ["Helpful", "Stress the main nouns and verbs."],
      ["Helpful", "Continue smoothly after a small pronunciation slip."],
      ["Not helpful", "Restart the full text after every tiny mistake."],
      ["Not helpful", "Make every word equally loud."],
    ],
  },
  {
    slug: "pte-core-repeat-sentence-memory-chunking",
    title: "PTE Core Repeat Sentence Memory Chunking",
    skill: "listening",
    category: "listening",
    level: "B2",
    excerpt: "Use meaning chunks, grammar patterns, and recovery strategy for Repeat Sentence.",
    heroTip: "Remember the sentence in chunks, not as a long string of separate words.",
    focus: "Repeat Sentence accuracy",
    context:
      "Repeat Sentence tests listening, short-term memory, and spoken control at the same time. You hear the sentence once, then repeat it. The best approach is to hold the sentence as meaning chunks. If you try to memorize every word separately, the sentence often disappears before you speak.",
    examples: [
      ["Too weak", "The registration deadline... extended... Friday... maybe.", "Better", "The registration deadline / has been extended / until Friday afternoon."],
      ["Too weak", "I repeat only the words I remember, with no grammar frame.", "Better", "I keep the grammar frame, then fill in the key details."],
    ],
    how: [
      "Listen for the sentence skeleton first. The skeleton is the subject, verb, and final detail. For example: the deadline has been extended until Friday.",
      "Use grammar to help memory. If you hear has been extended, your brain can expect a time phrase after it. Grammar patterns make the sentence easier to rebuild.",
      "If you miss one word, do not freeze. Repeat the parts you know clearly and keep the sentence moving. A smooth partial sentence is better than silence.",
    ],
    bullets: [
      "Catch subject, verb, and final detail.",
      "Use grammar patterns to predict missing pieces.",
      "Speak soon after the audio ends.",
      "Recover smoothly if one word disappears.",
    ],
    mistakes: [
      ["Memorizing isolated words", "deadline, Friday, registration, afternoon", "The registration deadline has been extended until Friday afternoon.", "Keep the grammar frame."],
      ["Waiting too long", "I tried to remember perfectly and delayed speaking.", "I started with the first chunk and kept moving.", "Delay weakens memory."],
      ["Panic after one missing word", "I stopped because I missed one adjective.", "I repeated the sentence frame clearly and continued.", "Recovery matters."],
    ],
    choiceQuestion: "What should you remember first in Repeat Sentence?",
    choiceOptions: ["Only the last word", "The subject, verb, and key detail", "A random list of sounds"],
    choiceAnswer: 1,
    orderChunks: ["Catch the sentence skeleton.", "Hold the sentence in meaning chunks.", "Repeat promptly with clear rhythm."],
    sortRows: [
      ["Helpful", "Use the grammar frame to rebuild the sentence."],
      ["Helpful", "Start speaking soon after the audio ends."],
      ["Not helpful", "Wait until every word feels perfect."],
      ["Not helpful", "Say disconnected words with no sentence structure."],
    ],
  },
  {
    slug: "pte-core-describe-image-response-structure",
    title: "PTE Core Describe Image Response Structure",
    skill: "speaking",
    category: "speaking",
    level: "B2",
    excerpt: "Build a clear Describe Image response with overview, key features, and a controlled conclusion.",
    heroTip: "Describe the image like a quick report: topic, main trend, key detail, closing.",
    focus: "Describe Image organization",
    context:
      "Describe Image is not a race to mention everything. It is a short spoken report. You need to identify what the image shows, select the most important features, and speak in a clear order. A simple structure is more reliable than a long list of disconnected details.",
    examples: [
      ["Too weak", "There is a chart and many numbers and some lines go up.", "Better", "The line chart shows online course enrolment rising steadily, with the fastest growth after 2022."],
      ["Too weak", "I describe every small label one by one.", "Better", "I describe the overall pattern first, then add one or two key details."],
    ],
    how: [
      "Start with the type and topic: the chart shows, the map compares, the image illustrates. This gives the listener a frame immediately.",
      "Next, describe the main pattern. Is something increasing, decreasing, stable, different, or concentrated in one area? The main pattern is usually more important than small details.",
      "Finally, add one specific detail and a closing sentence. The closing does not need to be creative. It should simply summarize the most important meaning.",
    ],
    bullets: [
      "Name the image type and topic first.",
      "Choose the biggest pattern before small details.",
      "Use comparison language when the image has groups.",
      "Finish with a clean overall statement.",
    ],
    mistakes: [
      ["Listing without structure", "Blue, red, 2020, 2021, high, low.", "The chart compares two groups and shows stronger growth in the blue group after 2021.", "Group details into meaning."],
      ["Ignoring the overview", "The first number is 15 and the second number is 18.", "Overall, the numbers increase over the period.", "Start with the big picture."],
      ["Overexplaining", "I try to mention every label and run out of time.", "I select the main trend and one supporting detail.", "Selection is part of the skill."],
    ],
    choiceQuestion: "What should a Describe Image answer do first?",
    choiceOptions: ["List every number", "Name the image type and topic", "Apologize for missing details"],
    choiceAnswer: 1,
    orderChunks: ["Name the image type and topic.", "Describe the main pattern.", "Add one key detail and close."],
    sortRows: [
      ["Helpful", "Overall, the chart shows steady growth."],
      ["Helpful", "The map compares public transport access in two neighbourhoods."],
      ["Not helpful", "There are many things and I cannot explain all of them."],
      ["Not helpful", "The first label is blue and then there is red and then a number."],
    ],
  },
  {
    slug: "pte-core-respond-to-a-situation-practical-answers",
    title: "PTE Core Respond to a Situation Practical Answers",
    skill: "speaking",
    category: "speaking",
    level: "B2",
    excerpt: "Learn a simple response frame for PTE Core Respond to a Situation prompts.",
    heroTip: "Use a real-life response frame: greet, explain, request or offer, close.",
    focus: "Respond to a Situation structure",
    context:
      "Respond to a Situation asks you to speak for a practical purpose. You might need to apologize, ask for help, give advice, or leave a message. The task is not about sounding dramatic. It is about sounding clear, polite, and complete in a real-life situation.",
    examples: [
      ["Too weak", "Hi. I have problem. Please tell me.", "Better", "Hello, I borrowed a laptop yesterday, but the charger was missing. Could you let me know whether I should return to the desk or fill out a form?"],
      ["Too weak", "I talk around the topic before making the request.", "Better", "I explain the situation first, then make one clear request."],
    ],
    how: [
      "Most situation responses can use a four-part frame: greeting, situation, action, closing. The action may be a request, apology, explanation, offer, or suggestion.",
      "Tone matters. If you are speaking to a manager, teacher, service worker, or neighbour, use polite language. If you are speaking to a friend, sound warm but still clear.",
      "Do not add a long story. The listener needs to know what happened and what should happen next. Specific details are useful only when they support that purpose.",
    ],
    bullets: [
      "Identify who you are speaking to.",
      "Name the problem or purpose quickly.",
      "Use one clear request, offer, or suggestion.",
      "Close politely so the response feels complete.",
    ],
    mistakes: [
      ["No clear action", "I have an issue with the laptop and it is confusing.", "Could you please tell me whether I should return it today or visit the help desk first?", "The listener needs the next step."],
      ["Wrong tone", "Fix this for me now.", "Could you please help me resolve this today?", "Polite tone fits most practical prompts."],
      ["Too much background", "Yesterday I was busy and then I walked to many places before I noticed the problem.", "I noticed the charger was missing when I opened the laptop bag.", "Keep only useful context."],
    ],
    choiceQuestion: "Which response frame is most useful?",
    choiceOptions: ["Greeting, situation, action, closing", "Long story, apology, unrelated detail", "Rare vocabulary, fast ending"],
    choiceAnswer: 0,
    orderChunks: ["Greet the listener.", "Explain the situation briefly.", "Make one clear request or offer.", "Close politely."],
    sortRows: [
      ["Helpful", "Could you please let me know what I should do next?"],
      ["Helpful", "I am calling because the charger was missing from the laptop bag."],
      ["Not helpful", "This is bad and somebody should solve it somehow."],
      ["Not helpful", "Before I explain, I want to tell you everything I did yesterday."],
    ],
  },
  {
    slug: "pte-core-summarize-written-text-one-sentence-control",
    title: "PTE Core Summarize Written Text One-Sentence Control",
    skill: "writing",
    category: "writing",
    level: "B2",
    excerpt: "Write stronger Summarize Written Text answers with main idea control and one-sentence grammar.",
    heroTip: "Build one complete sentence: main idea plus one important supporting detail.",
    focus: "Summarize Written Text",
    context:
      "Summarize Written Text asks you to compress a passage into one clear sentence. The challenge is not only understanding the passage. The challenge is choosing the main idea and writing one grammatically complete sentence that does not become too long or confusing.",
    examples: [
      ["Too weak", "Remote work is good and people use computers and companies changed.", "Better", "Remote work has changed where employees live and how companies organize communication."],
      ["Too weak", "I copy one sentence from the passage.", "Better", "I combine the main point with one important supporting idea in my own words."],
    ],
    how: [
      "First, identify the topic. Then ask: what is the writer mainly saying about this topic? That answer becomes the core of your summary sentence.",
      "A useful sentence pattern is: main idea + because/while/and + key supporting detail. Do not add every example. Select the detail that explains or completes the main point.",
      "Check that the sentence has one subject and one main verb. Many weak summaries become fragments because the candidate writes a long noun phrase but no complete sentence.",
    ],
    bullets: [
      "Do not copy a full sentence from the passage.",
      "Avoid listing every small detail.",
      "Use one complete sentence with a clear main verb.",
      "Keep the sentence controlled enough to check quickly.",
    ],
    mistakes: [
      ["Fragment summary", "The growth of remote work and communication changes in companies.", "Remote work has changed both employee location and company communication habits.", "Add a main verb."],
      ["Detail overload", "The passage mentions remote work, documents, meetings, cities, homes, and workers.", "The passage explains that remote work changes location and communication patterns.", "Select, do not list."],
      ["Copying", "Companies now rely more on written updates.", "Companies depend more on written communication as remote work becomes common.", "Paraphrase the main idea."],
    ],
    choiceQuestion: "What makes a strong Summarize Written Text answer?",
    choiceOptions: ["One complete sentence with the main idea", "A list of every detail", "A copied sentence from the passage"],
    choiceAnswer: 0,
    orderChunks: ["Find the topic.", "Choose the main idea.", "Add one key supporting detail.", "Check the sentence grammar."],
    sortRows: [
      ["Helpful", "The passage explains that remote work changes both location and communication."],
      ["Helpful", "Use one complete sentence with a main verb."],
      ["Not helpful", "Copy the longest sentence because it sounds academic."],
      ["Not helpful", "List six details without connecting them."],
    ],
  },
  {
    slug: "pte-core-write-email-purpose-tone-and-coverage",
    title: "PTE Core Write Email Purpose Tone and Coverage",
    skill: "writing",
    category: "writing",
    level: "B2",
    excerpt: "Write complete PTE Core emails with clear purpose, correct tone, and full prompt coverage.",
    heroTip: "Before typing, mark the reader, purpose, tone, and required details.",
    focus: "Write Email task control",
    context:
      "Write Email is a practical communication task. You need to understand who you are writing to, why you are writing, and what details must be included. A good email does not need rare vocabulary. It needs a clear purpose, organized details, and a tone that fits the situation.",
    examples: [
      ["Too weak", "Hi, I want English class information. Tell me.", "Better", "Hello, I am writing to ask about evening English classes at your community centre."],
      ["Too weak", "I ask about many things and finish suddenly.", "Better", "Could you please let me know the schedule, cost, and registration process? Thank you for your help."],
    ],
    how: [
      "Use a simple email frame: greeting, purpose, details, request or action, closing. This frame works for requests, complaints, apologies, and information emails.",
      "Prompt coverage is essential. If the task asks for schedule, cost, and registration, your email should clearly mention all three. Fluency cannot fully repair a missing requirement.",
      "Tone depends on the reader. To a service office, school, manager, or community centre, use polite neutral language. To a friend, you can sound warmer, but the answer still needs structure.",
    ],
    bullets: [
      "Open with the reason for writing.",
      "Turn each prompt bullet into a message block.",
      "Use polite request language when asking for information.",
      "End with a closing that matches the relationship.",
    ],
    mistakes: [
      ["Missing details", "Please send me information about classes.", "Could you please send me the class schedule, fees, and registration steps?", "Cover every required point."],
      ["Too direct", "Send the price today.", "I would appreciate it if you could send the price information today.", "Use polite request language."],
      ["Unclear purpose", "I saw your centre and have some questions.", "I am writing to ask about your evening English classes.", "State the purpose early."],
    ],
    choiceQuestion: "What should you identify before writing the email?",
    choiceOptions: ["Reader, purpose, tone, and required details", "Only the word count", "Only advanced vocabulary"],
    choiceAnswer: 0,
    orderChunks: ["Identify the reader and purpose.", "List the required details.", "Write the email in a clear order.", "Check tone and missing points."],
    sortRows: [
      ["Helpful", "I am writing to ask about your evening English classes."],
      ["Helpful", "Could you please let me know the schedule and registration process?"],
      ["Not helpful", "Tell me everything quickly."],
      ["Not helpful", "I forgot to mention the cost, but the email sounds polite."],
    ],
  },
  {
    slug: "pte-core-reading-fill-in-the-blanks-grammar-and-collocation",
    title: "PTE Core Reading Fill in the Blanks Grammar and Collocation",
    skill: "reading",
    category: "reading",
    level: "B2",
    excerpt: "Choose stronger fill-in-the-blanks answers by checking grammar, collocation, and meaning together.",
    heroTip: "Do not choose by meaning alone. Check grammar, collocation, and sentence logic.",
    focus: "Reading fill-in-the-blanks",
    context:
      "PTE Core fill-in-the-blanks tasks test more than vocabulary. A word may have the right general meaning but still fail because the grammar or collocation is wrong. Strong candidates check the words before and after the blank, then choose the option that fits the whole sentence.",
    examples: [
      ["Too weak", "Students can complete the course at a private pace.", "Better", "Students can complete the course at their own pace."],
      ["Too weak", "I choose the word that sounds familiar.", "Better", "I check whether the word fits the grammar and common word partnership."],
    ],
    how: [
      "Start with grammar. Ask what kind of word the blank needs: noun, verb, adjective, adverb, or preposition. This removes options quickly.",
      "Next, check collocation. Collocation means words that naturally go together, such as make a decision, strong evidence, or own pace.",
      "Finally, check meaning in the full sentence. The correct answer must fit the local grammar and the wider message.",
    ],
    bullets: [
      "Look left and right of the blank before choosing.",
      "Decide the word form first.",
      "Check common word partnerships.",
      "Read the full sentence again after choosing.",
    ],
    mistakes: [
      ["Meaning-only choice", "The word has a similar meaning, so it must be correct.", "The word has the right meaning and fits the grammar.", "Meaning is only one check."],
      ["Ignoring collocation", "make homework", "do homework", "Some word partnerships are fixed."],
      ["Not rereading", "I choose and move on immediately.", "I reread the sentence to test the answer.", "The full sentence confirms the choice."],
    ],
    choiceQuestion: "What should you check first in a blank?",
    choiceOptions: ["The needed word form", "The longest option", "The rarest vocabulary"],
    choiceAnswer: 0,
    orderChunks: ["Check the words around the blank.", "Decide the word form.", "Test collocation and meaning.", "Reread the full sentence."],
    sortRows: [
      ["Helpful", "Complete the task at your own pace."],
      ["Helpful", "Look at the preposition after the blank."],
      ["Not helpful", "Choose the most advanced-looking word."],
      ["Not helpful", "Ignore the sentence after the blank."],
    ],
  },
  {
    slug: "pte-core-reorder-paragraphs-cohesion-clues",
    title: "PTE Core Reorder Paragraphs Cohesion Clues",
    skill: "reading",
    category: "reading",
    level: "B2",
    excerpt: "Use pronouns, sequence words, topic sentences, and logic to solve Reorder Paragraphs.",
    heroTip: "Find the sentence that can stand alone, then connect the dependent sentences around it.",
    focus: "Reorder Paragraphs",
    context:
      "Reorder Paragraphs asks you to rebuild a short text. The answer is not random. Sentences connect through topic introduction, pronouns, repeated ideas, cause and effect, and time order. If you learn to see these links, the task becomes a logic puzzle instead of a guessing game.",
    examples: [
      ["Too weak", "This option looks first because it is short.", "Better", "This option looks first because it introduces the topic without depending on another sentence."],
      ["Too weak", "This refers to nothing before it.", "Better", "This refers back to the online profile mentioned in the previous sentence."],
    ],
    how: [
      "Find the independent opening sentence. It usually introduces the topic and does not begin with this, these, however, therefore, or another dependent reference.",
      "Then track reference words. Pronouns and phrases like this process, these documents, or the result often point back to an earlier sentence.",
      "Use sequence and logic clues. Words like first, next, finally, because, however, and as a result show how ideas move.",
    ],
    bullets: [
      "Start with the sentence that introduces the topic.",
      "Match pronouns to the nouns they refer to.",
      "Use sequence words to confirm order.",
      "Read your final order as one paragraph before moving on.",
    ],
    mistakes: [
      ["Choosing by length", "The shortest sentence must be first.", "The sentence that introduces the topic should be first.", "Function matters more than length."],
      ["Ignoring pronouns", "This method can start the paragraph.", "This method needs an earlier sentence that names the method.", "References need anchors."],
      ["Skipping final read", "I arranged the letters but did not test the flow.", "I read the final order to check cohesion.", "The paragraph should sound connected."],
    ],
    choiceQuestion: "Which sentence is most likely to come first?",
    choiceOptions: ["This process is now faster.", "Online applications have changed how many residents access city services.", "As a result, it became popular."],
    choiceAnswer: 1,
    orderChunks: ["Find the independent opening sentence.", "Match reference words to earlier ideas.", "Use sequence and logic clues.", "Read the full paragraph."],
    sortRows: [
      ["Helpful", "This service refers back to a service already named."],
      ["Helpful", "Finally signals an ending step."],
      ["Not helpful", "Choose the shortest sentence first every time."],
      ["Not helpful", "Ignore pronouns because they are small words."],
    ],
  },
  {
    slug: "pte-core-summarize-spoken-text-note-taking",
    title: "PTE Core Summarize Spoken Text Note Taking",
    skill: "listening",
    category: "listening",
    level: "B2",
    excerpt: "Take better notes and write clearer summaries for PTE Core Summarize Spoken Text.",
    heroTip: "Listen for the speaker's main message first, then collect only the details that support it.",
    focus: "Summarize Spoken Text",
    context:
      "Summarize Spoken Text combines listening and writing. You need to understand the lecture or talk, keep useful notes, and write a clear summary. The goal is not to write every word. The goal is to capture the main message and the most important supporting points.",
    examples: [
      ["Too weak", "Garden, food, people, skills, community, fresh.", "Better", "The speaker explains that community gardens improve food access, social connection, and practical growing skills."],
      ["Too weak", "I write notes in full sentences and miss the next idea.", "Better", "I use short notes and symbols so I can keep listening."],
    ],
    how: [
      "Use short notes. Write nouns, verbs, numbers, and cause-effect links. Do not try to write full sentences while the audio continues.",
      "Listen for structure. Speakers often introduce a topic, give two or three supporting points, then end with a result or benefit.",
      "After the audio, turn notes into a clear written summary. Use complete sentences, not bullet points. Connect ideas with simple linking words.",
    ],
    bullets: [
      "Capture the main topic early.",
      "Write short notes, not full transcripts.",
      "Mark cause, result, contrast, and examples.",
      "Use your notes to write a complete summary after listening.",
    ],
    mistakes: [
      ["Transcribing", "I tried to write every sentence while listening.", "I wrote keywords and relationships, then built the summary later.", "Transcribing causes missed ideas."],
      ["No main idea", "The talk mentioned gardens and people.", "The talk explained how community gardens support health and connection.", "A summary needs the main message."],
      ["Disconnected notes", "food / neighbours / learning", "gardens -> fresh food + neighbours + growing skills", "Show relationships in notes."],
    ],
    choiceQuestion: "What should notes capture first?",
    choiceOptions: ["The main topic and message", "Every article and preposition", "Only the final word"],
    choiceAnswer: 0,
    orderChunks: ["Catch the main topic.", "Note key supporting points.", "Mark relationships between ideas.", "Write a complete summary."],
    sortRows: [
      ["Helpful", "gardens -> food access + community connection"],
      ["Helpful", "The speaker argues that local gardens have social and health benefits."],
      ["Not helpful", "Try to write the full audio word for word."],
      ["Not helpful", "List random nouns with no relationship."],
    ],
  },
  {
    slug: "pte-core-write-from-dictation-accuracy-system",
    title: "PTE Core Write from Dictation Accuracy System",
    skill: "listening",
    category: "listening",
    level: "B2",
    excerpt: "Improve Write from Dictation with chunk memory, grammar checking, spelling control, and final review.",
    heroTip: "Hold the sentence in chunks, then use grammar to check what your ear heard.",
    focus: "Write from Dictation",
    context:
      "Write from Dictation looks simple, but it punishes small errors. You hear a sentence and must type it accurately. The best approach combines listening memory with grammar checking. If a sentence sounds unclear, grammar often helps you decide the correct word form.",
    examples: [
      ["Too weak", "The final report must submit before end week.", "Better", "The final report must be submitted before the end of the week."],
      ["Too weak", "I type sounds without checking grammar.", "Better", "I type what I heard, then check verbs, articles, plurals, and prepositions."],
    ],
    how: [
      "Listen for chunks. A sentence like the final report / must be submitted / before the end of the week is easier to remember than nine separate words.",
      "Type quickly but not carelessly. Get the full sentence down, then use the final seconds to check grammar words and spelling.",
      "Pay special attention to weak sounds: articles, plural -s, past participles, prepositions, and endings. These small pieces often decide accuracy.",
    ],
    bullets: [
      "Repeat the sentence silently in chunks before typing.",
      "Use grammar to confirm missing words.",
      "Check verb forms and endings.",
      "Read the final sentence once before submitting.",
    ],
    mistakes: [
      ["Missing grammar words", "Report must submitted before end week.", "The report must be submitted before the end of the week.", "Small grammar words matter."],
      ["No final check", "I typed fast and submitted immediately.", "I checked articles, plurals, and verb forms before submitting.", "Final review catches small errors."],
      ["Sound-only typing", "I typed the word that sounded close.", "I checked whether the word fit the sentence grammar.", "Grammar supports listening."],
    ],
    choiceQuestion: "What should you check before submitting Write from Dictation?",
    choiceOptions: ["Only whether the sentence is long", "Articles, verb forms, endings, and spelling", "Whether you used advanced vocabulary"],
    choiceAnswer: 1,
    orderChunks: ["Listen for sentence chunks.", "Type the full sentence.", "Check grammar words and endings.", "Submit after one final read."],
    sortRows: [
      ["Helpful", "The final report must be submitted before Friday."],
      ["Helpful", "Check whether the verb needs be before a past participle."],
      ["Not helpful", "Submit immediately without checking small words."],
      ["Not helpful", "Ignore plural endings because they are hard to hear."],
    ],
  },
];

const parseArgs = (argv) => ({
  dryRun: argv.includes("--dry-run"),
  overwrite: argv.includes("--overwrite"),
  date: argv.find((arg) => arg.startsWith("--date="))?.split("=")[1] || DEFAULT_DATE,
});

const yamlString = (value) => JSON.stringify(String(value));
const yamlArray = (items) => `[${items.map((item) => yamlString(item)).join(", ")}]`;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function renderQuiz(spec) {
  const questions = [
    {
      prompt: `What is the main goal of ${spec.focus}?`,
      options: ["Clear task control", "Random memorization", "Long answers every time"],
      correctIndex: 0,
      explanation: "PTE Core rewards controlled responses that fit the task.",
    },
    {
      prompt: "What should you do after practice?",
      options: ["Ignore mistakes", "Record repeated errors and repair them", "Only count the number of tasks finished"],
      correctIndex: 1,
      explanation: "An error log turns practice into score growth.",
    },
    {
      prompt: "Which habit is safest under PTE Core time pressure?",
      options: ["Use a repeatable routine", "Change strategy every question", "Wait until the answer feels perfect"],
      correctIndex: 0,
      explanation: "A repeatable routine reduces panic and protects accuracy.",
    },
  ];

  return questions
    .map(
      (question) => `  - prompt: ${yamlString(question.prompt)}
    options: ${yamlArray(question.options)}
    correctIndex: ${question.correctIndex}
    explanation: ${yamlString(question.explanation)}`
    )
    .join("\n");
}

function renderPracticeLab(spec) {
  const orderAnswer = spec.orderChunks.join("||");
  const shuffled = [...spec.orderChunks].reverse();
  const sortRows = spec.sortRows
    .map(
      ([target, sentence], index) => `<div class="practice-sort-row" data-sort-target="${target}" data-sort-row="${index}">
  <p>${sentence}</p>
  <div class="practice-sort-actions">
    <button type="button" class="practice-sort-btn" data-sort-choice="Helpful">Helpful</button>
    <button type="button" class="practice-sort-btn" data-sort-choice="Not helpful">Not helpful</button>
  </div>
</div>`
    )
    .join("\n");

  const choiceButtons = spec.choiceOptions
    .map(
      (option, index) => `<button type="button" class="practice-choice" data-choice-index="${index}">
  ${option}
</button>`
    )
    .join("\n");

  const chips = shuffled
    .map(
      (chunk, index) => `<button type="button" class="practice-chip" data-chip-value="${chunk}" data-chip-id="2-${index}">
  ${chunk}
</button>`
    )
    .join("\n");

  return `## Practice Lab
<div class="practice-lab" data-practice-lab>
  <div class="practice-lab-head">
    <div>
      <h3>Practice</h3>
      <p class="practice-lab-intro">Self-mark each task. You can retry until every answer is correct.</p>
    </div>
    <div class="practice-lab-status">
      <p class="practice-lab-score" data-practice-score>Score: 0/3</p>
      <button type="button" class="practice-reset-btn" data-practice-reset>Reset</button>
    </div>
  </div>
  <div class="practice-lab-grid">
<article class="practice-task" data-task-type="choice" data-task-answer="${spec.choiceAnswer}" data-task-id="1" data-correct-feedback="Correct. This answer matches the task goal." data-wrong-feedback="Not yet. Choose the option that gives the clearest PTE Core control.">
  <p class="practice-task-label">1. Quick pick</p>
  <h3>${spec.choiceQuestion}</h3>
  <div class="practice-choice-grid">
${choiceButtons}
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
<article class="practice-task" data-task-type="order" data-task-answer="${orderAnswer}" data-task-id="2" data-correct-feedback="Correct. This order builds the response from understanding to final check." data-wrong-feedback="Not yet. Start with understanding the task, then move toward production and review.">
  <p class="practice-task-label">2. Build it</p>
  <h3>Put the steps in the best order.</h3>
  <p class="practice-task-note">Tap a chunk to move it between the bank and answer area.</p>
  <div class="practice-chip-bank" data-order-bank>
${chips}
  </div>
  <div class="practice-chip-answer" data-order-answer></div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
    <button type="button" class="practice-clear-btn" data-task-clear>Clear</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
<article class="practice-task" data-task-type="sort" data-task-id="3" data-correct-feedback="Correct. These habits are now sorted by usefulness." data-wrong-feedback="Some rows are in the wrong column. Try again.">
  <p class="practice-task-label">3. Sort it</p>
  <h3>Sort each habit into helpful or not helpful.</h3>
  <div class="practice-sort-list">
${sortRows}
  </div>
  <div class="practice-task-actions">
    <button type="button" class="practice-check-btn" data-task-check>Check</button>
  </div>
  <p class="practice-task-feedback" data-task-feedback aria-live="polite"></p>
</article>
  </div>
</div>`;
}

function renderLesson(spec, date) {
  const examples = spec.examples
    .map(
      ([weakLabel, weak, strongLabel, strong]) => `<article class="lesson-example-card">
  <p class="lesson-card-label">${weakLabel} / ${strongLabel}</p>
  <p class="lesson-line lesson-line-weak"><span>${weakLabel}</span>${weak}</p>
  <p class="lesson-line lesson-line-strong"><span>${strongLabel}</span>${strong}</p>
</article>`
    )
    .join("\n");

  const howParagraphs = spec.how.map((paragraph) => `  <p>${paragraph}</p>`).join("\n");
  const bulletList = spec.bullets.map((item) => `      <li>${item}</li>`).join("\n");
  const mistakes = spec.mistakes
    .map(
      ([title, weak, strong, fix]) => `<article class="lesson-error-card">
  <p class="lesson-card-label">${title}</p>
  <p class="lesson-line lesson-line-weak"><span>Weak</span>${weak}</p>
  <p class="lesson-line lesson-line-strong"><span>Strong</span>${strong}</p>
  <p class="lesson-fix-line"><strong>Fix:</strong> ${fix}</p>
</article>`
    )
    .join("\n");

  return `---
test: "PTE_CORE"
skill: "${spec.skill}"
title: ${yamlString(spec.title)}
description: ${yamlString(spec.excerpt)}
category: "${spec.category}"
level: "${spec.level}"
ieltsBand: "6.0-7.0"
clb: "7-9"
exam: ["PTE_CORE"]
excerpt: ${yamlString(spec.excerpt)}
date: "${date}"
tags: ${yamlArray(["pte core", spec.skill, spec.category, "exam strategy", "canada immigration"])}
heroTip: ${yamlString(spec.heroTip)}
visualAids: ${yamlArray(["Task routine checklist", "Weak versus strong answer cards", "Self-marking practice lab"])}
quiz:
${renderQuiz(spec)}
premium: false
priceCAD: 0
draft: false
---
${spec.context}

## Examples
<div class="lesson-example-grid">
${examples}
</div>

<nav class="lesson-map" aria-label="Lesson map">
  <a href="#examples">Examples</a>
  <a href="#how-it-works">How It Works</a>
  <a href="#common-mistakes">Common Mistakes</a>
  <a href="#practice-lab">Practice Lab</a>
  <a href="#why-it-matters">Why It Matters</a>
  <a href="#get-feedback">Get Feedback</a>
</nav>

## How It Works
<div class="lesson-teach-grid">
  <section class="lesson-panel lesson-panel-core">
    <p class="lesson-panel-label">Main idea</p>
${howParagraphs}
  </section>
  <section class="lesson-panel lesson-panel-remember">
    <p class="lesson-panel-label">Score-safe habits</p>
    <ul>
${bulletList}
    </ul>
  </section>
</div>

## Common Mistakes
<div class="lesson-error-grid">
${mistakes}
</div>

${renderPracticeLab(spec)}

## Why It Matters
PTE Core is scored through computer-delivered tasks, but the human skill underneath is still clear communication. When you understand ${spec.focus}, you waste less time guessing what the task wants. You can focus on meaning, structure, grammar, pronunciation, or listening accuracy in the exact way the task requires. This makes practice more efficient and makes the simulator feel less intimidating.

## Get Feedback
<div class="lesson-support-callout">
  <p>Use the PTE Core simulator to test this skill under exam-style timing, then review your saved errors before the next practice round.</p>
  <ul>
    <li><a href="/pte-core/simulator">Open the PTE Core Simulator</a></li>
    <li><a href="/pte-core/question-types">Review all PTE Core question types</a></li>
    <li><a href="/pte-core/${spec.skill}">Return to the ${spec.skill} path</a></li>
  </ul>
</div>
`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await mkdir(LESSON_DIR, { recursive: true });

  const created = [];
  const skipped = [];

  for (const spec of lessonSpecs) {
    const filePath = path.join(LESSON_DIR, `${spec.slug}.md`);
    if ((await exists(filePath)) && !opts.overwrite) {
      skipped.push(filePath);
      continue;
    }

    if (!opts.dryRun) {
      await writeFile(filePath, renderLesson(spec, opts.date), "utf8");
    }
    created.push(filePath);
  }

  console.log(`PTE Core lesson generation complete. Created/updated: ${created.length}. Skipped: ${skipped.length}.`);
  for (const filePath of created) console.log(`  + ${filePath}`);
  for (const filePath of skipped) console.log(`  - skipped ${filePath}`);
  if (opts.dryRun) console.log("Dry run only: no files were written.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
