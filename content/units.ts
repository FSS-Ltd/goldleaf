// First unit for new children, "All About Me" (Teacher's Manual, Unit A, pages 3 to 40). Parent-facing summary only.
// Book titles are named, not reproduced. Lesson plans, assessment sheets and Bible stories stay out of the public site.
export type Week = { id: string; title: string; book: string; rhyme: string; goal: string };

export const unitA = {
  name: "All About Me",
  intro:
    "Every new child starts here. Six weeks of settling in while they learn to name themselves, their body, their senses and their feelings.",
  weeks: [
    { id: "A1", title: "Hello, Me!", book: "Where's Spot? by Eric Hill", rhyme: "Clap Your Hands", goal: "Turns to their own name, names eyes, nose and mouth, and settles after the goodbye routine." },
    { id: "A2", title: "My Body", book: "Ten Little Fingers and Ten Little Toes by Mem Fox", rhyme: "Head, Shoulders, Knees and Toes", goal: "Names six or more body parts, counts fingers to five and starts two-footed jumps." },
    { id: "A3", title: "Seeing and Hearing", book: "Peepo! by Janet and Allan Ahlberg", rhyme: "Sleeping Bunnies", goal: "Tells sound bottles apart by shaking, spots which object is missing and knows we see with eyes and hear with ears." },
    { id: "A4", title: "Touch, Taste, Smell", book: "The Tiger Who Came to Tea by Judith Kerr", rhyme: "Pat-a-cake", goal: "Uses words like soft, hard and sweet, shares one for you and one for me, and links each sense to the body part." },
    { id: "A5", title: "My Feelings", book: "The Colour Monster by Anna Llenas", rhyme: "If You're Happy and You Know It", goal: "Names happy and sad, sorts by colour and uses a calm-down breath." },
    { id: "A6", title: "Review and Observe", book: "The child's choice from Unit A", rhyme: "Every Unit A rhyme", goal: "Revisits favourites while the tutor checks what your child can now do alone and in new settings. You join for the last 20 minutes of the final session." },
  ] satisfies Week[],
  next: "My Family and Home",
};

// How progress is tracked (Manual: assessment records, new-context checks, end-of-unit checks).
export const progressSteps = [
  { t: "Start with a baseline", d: "A short play-based check tells us where your child is today." },
  { t: "Watch every session", d: "The tutor notes what your child does alone, with help, or not yet, with dated observations and photos kept in a portfolio." },
  { t: "Check it carries over", d: "Each goal is marked Not yet, Developing, Secure or Mastered. Mastered needs proof in a new setting, such as naming body parts on a different doll." },
  { t: "Keep you in the loop", d: "A short handover note after each session with one highlight and one idea for home, plus a weekly home card." },
  { t: "Review at the end of each unit", d: "A chat with you: two strengths, one thing to work on and what comes next." },
];
