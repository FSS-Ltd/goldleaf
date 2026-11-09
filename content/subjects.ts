// Subjects taught each session. Source: Teacher's Manual for two-year-olds, Unit A "All About Me" goals (client PDF, pages 1 to 8),
// and the session template in session.ts for ages 3 to 4. Faith content is opt-in and deliberately not listed here.
export type Subject = {
  id: string;
  name: string;
  summary: string;
  /** What a 2 year old works towards, in the manual's own terms. */
  age2: string;
  /** Only filled where the session template gives an older-age focus. */
  older?: string;
};

export const subjects: Subject[] = [
  {
    id: "language",
    name: "Talking and listening",
    summary: "Vocabulary, following instructions and first sentences, built by naming everything the child does.",
    age2: "Responds to their own name, names body parts and follows one-step instructions.",
  },
  {
    id: "stories",
    name: "Stories and books",
    summary: "A new picture book each week, read slowly, with pauses to point, predict and join in.",
    age2: "Lifts flaps, turns board-book pages, points to pictures and joins a repeated line.",
    older: "Retells the story and predicts what happens next.",
  },
  {
    id: "phonics",
    name: "Sounds, rhymes and phonics",
    summary: "Listening games and rhymes first, then letter sounds and blending, in the common UK order.",
    age2: "Turns to and names everyday sounds and joins in the actions for five or more rhymes.",
    older: "Stages 1 to 3: new sounds, blending and reading simple words.",
  },
  {
    id: "maths",
    name: "Maths through play",
    summary: "Matching, sorting, counting, shape, pattern and measuring with real objects, never worksheets.",
    age2: "Matches identical pairs, joins finger rhymes with one and two and notices one and two without counting.",
    older: "Counting, number recognition and simple adding.",
  },
  {
    id: "discover",
    name: "Science and the world around us",
    summary: "Hands-on discovery: our senses, our bodies, how things feel, taste, smell and sound.",
    age2: "Recognises themselves in a mirror and photos and names the five senses through using them.",
  },
  {
    id: "create",
    name: "Art, making and fine motor",
    summary: "Paint, dough, mark making and role play that build the hand strength writing needs later.",
    age2: "Explores paint and dough freely and holds a chunky crayon.",
    older: "Mark-making, letter formation and crafts.",
  },
  {
    id: "music",
    name: "Singing and music",
    summary: "Songs, rhythm and instruments. Keeping a beat is early practice for hearing syllables.",
    age2: "Claps and stamps to a beat and joins in the hello and tidy-up songs.",
    older: "Adds clapping syllables.",
  },
  {
    id: "move",
    name: "Movement and coordination",
    summary: "Running, stopping, balancing and action games that teach listening and body control.",
    age2: "Runs and stops on a signal and washes hands with help.",
  },
  {
    id: "feelings",
    name: "Feelings and independence",
    summary: "Settling in, following a visual timetable and naming feelings, so the child is ready to learn.",
    age2: "Separates from a parent using the goodbye routine, follows the photo timetable and names happy and sad.",
  },
];
