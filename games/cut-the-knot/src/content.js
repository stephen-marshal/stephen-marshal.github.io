// All words and items for Cut the Knot. Data only (REQ-CONTENT-1).
// Written in my own words, inspired by ideas in Adlerian psychology (REQ-ORIG-1).

export const META = {
  title: "Cut the Knot",
  subtitle: "A five-night mind game about excuses, approval and living in the now.",
  url: "https://stephen-marshal.github.io/games/cut-the-knot/",
  credit:
    "Inspired by ideas from The Courage to Be Disliked by Ichiro Kishimi and Fumitake Koga, and from Alfred Adler's individual psychology. All words here are my own. This game is not affiliated with the authors or publisher.",
  disclaimer:
    "This is a thinking game, not therapy or a personality test. Feelings are real, and this is just one lens to look through. If things feel heavy, talk to someone you trust or a professional.",
  knotIntro:
    "You arrive with five tangled threads. Each night straightens one. Untangle all five and the knot can be cut.",
};

export const NIGHTS = [
  {
    id: "n1",
    num: 1,
    title: "Cause or Goal",
    short: "Find the goal hiding behind an excuse.",
    idea:
      "We usually explain ourselves with the past: I can't, because… Try the other lens. What is this behaviour quietly getting me, or protecting me from, right now?",
    howTo: "Read each excuse and pick the goal it might be serving. Then the card flips from because… to so that….",
    objection: "But my past really did shape who I am.",
    reply:
      "It did. The past is the raw material. The meaning you give it today is still your choice, and that's the hopeful part: a goal can change this afternoon.",
    takeaway: "Ask “what for?” as often as you ask “why?”.",
    tryToday: "Catch one “I can't, because…” today and finish it honestly with “so that…”.",
    items: [
      {
        id: "n1-side-project",
        excuse: "I can't start my side project because I'm not experienced enough yet.",
        options: [
          "Experience really is required before starting anything worthwhile.",
          "An unstarted project can never be judged, so I stay safe as someone who could do it.",
          "I need to save my energy for more important work first.",
        ],
        correct: 1,
        reframe:
          "So that I keep the story of “I could, if I tried”. Ship something small and let it be seen. Then you learn something real.",
      },
      {
        id: "n1-waiter",
        excuse: "I shouted at the waiter because the coffee spill made me so angry.",
        options: [
          "Shouting got him to back down faster than calm words would.",
          "Anger takes over, so nothing was really chosen.",
          "Shouting helped the café improve its service for everyone.",
        ],
        correct: 0,
        reframe:
          "So that I could win quickly. Anger was a tool picked up for a purpose, and calm words would have fixed the jacket too.",
      },
      {
        id: "n1-meetings",
        excuse: "I'd speak up in meetings if I weren't such a nervous person.",
        options: [
          "Nervous people are simply built to stay quiet.",
          "Staying quiet leaves more space for others, which is kind.",
          "Staying quiet means I never risk saying something wrong in front of people.",
        ],
        correct: 2,
        reframe:
          "So that I avoid being wrong in public. The nerves are real, but they also hand me a perfect reason to stay safe.",
      },
      {
        id: "n1-novel",
        excuse: "I never finish my novel because work keeps me far too busy.",
        options: [
          "An unfinished book can stay brilliant in my head, safe from rejection.",
          "Some jobs truly leave no time at all for anything else.",
          "I'm waiting for the right inspiration to arrive.",
        ],
        correct: 0,
        reframe:
          "So that it stays “potentially brilliant”. Submitting it and getting a no would hurt, but it would also move you forward.",
      },
      {
        id: "n1-promotion",
        excuse: "I can't ask for the promotion because my manager doesn't like me.",
        options: [
          "Managers decide everything, so asking changes nothing.",
          "If I never ask, I never have to find out, and I always have someone to blame.",
          "It's polite to wait until promotions are offered.",
        ],
        correct: 1,
        reframe:
          "So that the unkind manager protects me from a straight answer. Ask anyway. Their reaction is their task.",
      },
      {
        id: "n1-gym",
        excuse: "I'll get fit once things calm down at work.",
        options: [
          "Bodies need a calm schedule before exercise can help.",
          "Being busy is proof that I'm doing the important things.",
          "Waiting lets me feel like a future fit person without the discomfort of starting.",
        ],
        correct: 2,
        reframe:
          "So that I can postpone the hard first week forever. Things rarely calm down. A ten-minute walk today counts.",
      },
      {
        id: "n1-dislike",
        excuse: "I don't go to team socials because I'm just not likeable.",
        options: [
          "Staying away means nobody can ever reject me in person.",
          "Some people are born unlikeable and that's that.",
          "Socials are a waste of time anyway.",
        ],
        correct: 0,
        reframe:
          "So that I never risk being snubbed. Hunting for my own flaws gives me a reason to stay out of reach.",
      },
    ],
  },

  {
    id: "n2",
    num: 2,
    title: "Fuel or Excuse",
    short: "Sort feelings of not-good-enough into fuel, excuse or mask.",
    idea:
      "Feeling behind is normal, and it can be fuel. It turns into a complex when it becomes an excuse (I'm X, so I can't Y), or a mask when we puff ourselves up to hide it.",
    howTo: "Sort each line into Fuel, Excuse or Mask. You can use the buttons or the keys 1, 2 and 3.",
    objection: "Isn't a bit of competition healthy?",
    reply:
      "A rival who is also a friend can help you grow. But if every win of theirs feels like your loss, the whole world turns into enemies. Walk your own road on flat ground, not up a ladder.",
    takeaway: "Compare yourself with your ideal self, not with someone else's highlight reel.",
    tryToday: "Celebrate a colleague's win today, out loud, without adding a “but”.",
    bins: [
      { id: "fuel", label: "Fuel", hint: "I'm behind, so I'll grow" },
      { id: "excuse", label: "Excuse", hint: "I'm X, so I can't Y" },
      { id: "mask", label: "Mask", hint: "Look how special I am" },
    ],
    items: [
      { id: "n2-kata", bin: "fuel", text: "My Python is weak, so I'm doing a small kata every morning.",
        why: "The gap is real and it's being used to grow. That's a healthy feeling of inferiority." },
      { id: "n2-degree", bin: "excuse", text: "I didn't go to a top university, so I'll never get a senior role.",
        why: "A is the situation, so B is impossible. It sounds like cause and effect, but it works as an excuse not to try." },
      { id: "n2-cto", bin: "mask", text: "Did I mention I had lunch with the CTO once? We're basically close.",
        why: "Borrowing someone else's status to look bigger. It's a mask over a quiet feeling of being less." },
      { id: "n2-talk", bin: "fuel", text: "My first conference talk was rough, so I'm recording practice runs for the next one.",
        why: "Comparing with your ideal self and taking a step. That's exactly what the feeling is for." },
      { id: "n2-too-old", bin: "excuse", text: "I'm too old to learn Kubernetes now.",
        why: "Age becomes the reason, and the real reason (fear of being a beginner) stays hidden." },
      { id: "n2-rough", bin: "mask", text: "Nobody has had it as hard as me, so don't you dare give me advice.",
        why: "Making yourself special through misfortune. It keeps others at a distance and puts you above them." },
      { id: "n2-brand", bin: "mask", text: "I only wear the most expensive brands so people know who they're dealing with.",
        why: "Status on loan from a label. Real confidence doesn't need the logo." },
      { id: "n2-designer", bin: "fuel", text: "She's a better designer than me, so I asked her to review my work.",
        why: "Treating a stronger colleague as a friend, not a threat, and learning from them." },
      { id: "n2-people", bin: "excuse", text: "I'm not a people person, so I could never lead a team.",
        why: "A label used as a wall. Leading is a skill you can practise, one conversation at a time." },
      { id: "n2-glory", bin: "mask", text: "Let me tell you again about the outage I fixed when everyone else gave up.",
        why: "Retelling past glory again and again usually means you aren't sure you're enough today." },
      { id: "n2-shy-blog", bin: "fuel", text: "My writing feels clumsy next to the blogs I read, so I'm publishing one short post a week.",
        why: "Feeling behind turned into practice. Small and regular beats perfect and never." },
    ],
  },

  {
    id: "n3",
    num: 3,
    title: "Whose Task?",
    short: "Separate your tasks from other people's.",
    idea:
      "Most friction in relationships comes from stepping into someone else's task, or letting them step into yours. The test is simple: who ultimately lives with the result of this choice?",
    howTo: "Choose Mine (← key) or Theirs (→ key), or swipe the card. Then a short round about approval.",
    objection: "Isn't this just a cold way of saying “not my problem”?",
    reply:
      "No. Separating tasks is where good relationships start, not where they end. You stay close enough to help when asked, and far enough away not to take over.",
    takeaway: "Before you worry, fix or push, ask: whose task is this?",
    tryToday: "Put down one thing you've been carrying that isn't yours, and offer help instead.",
    items: [
      { id: "n3-homework", owner: "theirs", text: "Whether your teenager does their homework.",
        bearer: "Your teenager lives with the grades.",
        why: "Stay interested and offer help. Forcing it takes away both the task and the learning." },
      { id: "n3-proposal-verdict", owner: "theirs", text: "Whether your manager likes the proposal you sent.",
        bearer: "Your manager owns their judgement.",
        why: "Making the proposal as good as you can is yours. What they think of it is theirs." },
      { id: "n3-tests", owner: "mine", text: "Writing tests for the code you're about to ship.",
        bearer: "You live with the 3 a.m. page if it breaks.",
        why: "Your code, your quality. Nobody else can do this for you." },
      { id: "n3-parents-career", owner: "theirs", text: "How your parents feel about your career choice.",
        bearer: "Your parents live with their own feelings.",
        why: "Choosing the path you believe in is yours. Coming to terms with it is theirs, and you can still be kind." },
      { id: "n3-offer", owner: "mine", text: "Choosing which job offer to accept.",
        bearer: "You live with the job every day.",
        why: "Ask for advice, sure. But if someone else decides, you're living their life." },
      { id: "n3-blog-review", owner: "theirs", text: "Whether a stranger online thinks your blog post is any good.",
        bearer: "The stranger owns their opinion.",
        why: "Writing honestly is your task. Being liked by everyone is not, and can't be." },
      { id: "n3-apology", owner: "mine", text: "Apologising after you snapped at a teammate.",
        bearer: "You live with how you showed up.",
        why: "Owning a mistake isn't losing. Whether they accept the apology is then their task." },
      { id: "n3-advice", owner: "theirs", text: "Whether a teammate actually follows the advice you gave.",
        bearer: "Your teammate lives with what they choose.",
        why: "You can show someone the well. Drinking is up to them." },
      { id: "n3-handover", owner: "mine", text: "Turning up prepared for your on-call handover.",
        bearer: "You, and the next person on shift, live with a bad handover.",
        why: "Being prepared is fully in your hands. That makes it squarely yours." },
      { id: "n3-trust", owner: "theirs", text: "Whether your partner keeps the promise you trusted them with.",
        bearer: "Your partner lives with keeping or breaking it.",
        why: "Trusting is your task. What someone does with your trust is theirs." },
    ],
    faces: {
      intro:
        "Ten people. Keep every one of them pleased. Click a face to win back its approval before it fades.",
      stopLabel: "Stop chasing approval",
      stopped:
        "You stepped off the treadmill. Their approval was never yours to control.",
      burnout:
        "Time's up, and you're exhausted. Nobody can keep ten people pleased at once, and nobody is meant to.",
      lesson:
        "Out of any ten people, roughly one will dislike you whatever you do, two will be firmly in your corner, and the other seven won't think about it much. Being disliked by someone is the price, and the proof, of living your own way.",
    },
  },

  {
    id: "n4",
    num: 4,
    title: "Level the Line",
    short: "Encourage instead of praising or blaming.",
    idea:
      "Praise and blame both come from above: one person grading another. Encouragement works sideways, through thanks, respect and help that leaves the task with its owner.",
    howTo: "Pick a reply for each moment. Judging replies tilt the line. Encouraging ones bring it back to level.",
    objection: "But praise motivates people!",
    reply:
      "It does: it motivates them to get more praise. People start working for the judge. Thanks says “you contributed” instead of “you passed my test”, and that's what builds real confidence.",
    takeaway: "Swap “good job” for “thank you, that helped”.",
    tryToday: "Thank someone today for something they'd normally only get graded on.",
    items: [
      {
        id: "n4-flaky-test",
        scene: "A junior engineer fixes the flaky test everyone had been ignoring.",
        options: [
          { kind: "praise", text: "Good job! You're getting really clever at this.",
            note: "Kind, but it grades them from above: you're the judge, they're the pupil." },
          { kind: "rebuke", text: "Finally. That should have been fixed weeks ago.",
            note: "Blame from above. Next time they'll hide what they're working on." },
          { kind: "intervene", text: "Next time check with me before you merge anything.",
            note: "Takes their task away. They learn to wait rather than act." },
          { kind: "encourage", text: "Thank you, that saves all of us a lot of reruns.",
            note: "Gratitude between equals. It tells them they contributed." },
        ],
      },
      {
        id: "n4-table",
        scene: "Your child sets the table without being asked.",
        options: [
          { kind: "intervene", text: "Here, let me redo it, it's quicker.",
            note: "Faster today, but it teaches them that trying isn't worth it." },
          { kind: "encourage", text: "Thanks, that was a real help to me tonight.",
            note: "You'd say this to a friend. Say it to a child too." },
          { kind: "praise", text: "What a good little helper you are!",
            note: "You wouldn't say this to an adult who helped. It talks down." },
          { kind: "rebuke", text: "The forks are on the wrong side again.",
            note: "The lesson they hear: helping gets you criticised." },
        ],
      },
      {
        id: "n4-cv",
        scene: "A friend is stuck on their CV and asks you to take a look.",
        options: [
          { kind: "intervene", text: "Send it over, I'll just rewrite it for you.",
            note: "Generous, but now it's your CV, not theirs." },
          { kind: "praise", text: "You're so talented, I'm sure it's already perfect.",
            note: "Flattery dodges the actual request for help." },
          { kind: "encourage", text: "Happy to. Which part do you most want to improve?",
            note: "Help that leaves the task with them. That's assistance, not takeover." },
          { kind: "rebuke", text: "You left this too late, as usual.",
            note: "True or not, they're less likely to ask again." },
        ],
      },
      {
        id: "n4-demo",
        scene: "A colleague's demo crashes in front of the client.",
        options: [
          { kind: "rebuke", text: "That's what happens when you don't rehearse.",
            note: "Kicks someone who is already down, from above." },
          { kind: "intervene", text: "I'll do the presenting from now on.",
            note: "Solves your worry and takes away their chance to grow." },
          { kind: "praise", text: "Never mind, you're still the smartest one on the team.",
            note: "Comfort through ranking. It keeps everyone on a ladder." },
          { kind: "encourage", text: "Thanks for taking the hard slot. Want to go through it together?",
            note: "Respect for their effort, and help on offer if they want it." },
        ],
      },
      {
        id: "n4-dinner",
        scene: "Your partner cooks dinner after a long day.",
        options: [
          { kind: "encourage", text: "Thank you. This is exactly what I needed tonight.",
            note: "Simple gratitude, from one equal to another." },
          { kind: "praise", text: "Well done, your cooking is really coming along!",
            note: "Sounds nice, but it's a teacher's report card." },
          { kind: "rebuke", text: "It's a bit salty, isn't it?",
            note: "Turns a gift into an exam." },
          { kind: "intervene", text: "Next time just follow my recipe.",
            note: "Their dinner, their way. Taking over says “you can't”." },
        ],
      },
      {
        id: "n4-plan",
        scene: "Your manager shares a plan you think has a real flaw.",
        options: [
          { kind: "defer", text: "Say nothing. It's their call, and their fault if it fails.",
            note: "Looking up at them hands away your responsibility. That's still a vertical line." },
          { kind: "rebuke", text: "Tell them in front of everyone that it won't work.",
            note: "Being right in a way that makes them wrong starts a power struggle." },
          { kind: "encourage", text: "Thank them for sharing it, then raise your concern clearly with an alternative.",
            note: "Equal in spirit and respectful of their role. You say what needs saying." },
          { kind: "praise", text: "Flatter the plan in the meeting, then grumble about it afterwards.",
            note: "Praise used to manage someone. Everyone loses." },
        ],
      },
    ],
  },

  {
    id: "n5",
    num: 5,
    title: "Dance the Dots",
    short: "Live the moment in front of you.",
    idea:
      "If life is a mountain climb, everything before the summit is only “on the way”. Look closely at a line, though, and it's made of dots: moments. A dancer isn't trying to get somewhere; the dancing is the point.",
    howTo:
      "Catch each glowing dot while it's here (tap it, or press Space). Thoughts about the past and the future will drift past. You don't have to chase them.",
    objection: "Without goals, won't I just drift?",
    reply:
      "Goals are fine; postponing your life until the summit isn't. Dance today's steps in earnest (the code, the scales, the reps) and one day you'll look around and notice how far you've come.",
    takeaway: "Shine a bright light on today. Yesterday and someday can sit in the dark.",
    tryToday: "Take the next small step on something you keep postponing. Just today's dot.",
    thoughts: [
      { id: "n5-studied", when: "past", text: "If only I'd studied something else…" },
      { id: "n5-meeting", when: "past", text: "That meeting last year still stings." },
      { id: "n5-started", when: "past", text: "I should have started this years ago." },
      { id: "n5-easier", when: "past", text: "Things were easier back then." },
      { id: "n5-promoted", when: "future", text: "Once I'm promoted, then I'll relax." },
      { id: "n5-quarter", when: "future", text: "What if next quarter goes badly?" },
      { id: "n5-migration", when: "future", text: "I'll be happy when the migration's done." },
      { id: "n5-someday", when: "future", text: "Someday I'll have time for this." },
      { id: "n5-said", when: "past", text: "Why did I say that yesterday?" },
      { id: "n5-ready", when: "future", text: "I'll start when I'm ready." },
    ],
    reveal:
      "Look: the moments you caught have joined into a line. It never needed a summit to count. It was always dots.",
  },
];

export const ARCHETYPES = {
  n1: { name: "The Archivist", line: "You file today under yesterday. Try asking what your habits are for, not only where they came from." },
  n2: { name: "The Comparer", line: "You measure yourself against others. Try measuring against the person you're becoming." },
  n3: { name: "The Approval Collector", line: "You carry other people's tasks and verdicts. Put some down. They were never yours." },
  n4: { name: "The Judge", line: "You see people above and below. Try the sideways view: thanks, not grades." },
  n5: { name: "The Summit Chaser", line: "You live for someday. The dots in front of you are already the real thing." },
  light: { name: "The Light Traveller", line: "Few tangles left. You travel light: your tasks, your pace, your moment." },
};

export const FINALE = {
  title: "The knot is cut",
  body: "Five threads, no longer tangled, lie side by side. Separate, but still connected.",
  star:
    "Your guiding star is contribution. When you feel lost, ask “what can I give here?” rather than “what will they give me?”. Whether you're liked for it is not your task.",
};
