// Session routine, 1 hour 45 minutes. Blocks and timings from the Teacher's Manual standard routine (page 2).
// Age 3 to 4 column carried over from the earlier session plan; "Same" where the plan said so.
export type Block = { time: string; name: string; what: string; age2: string; age34: string };

export const sessionBlocks: Block[] = [
  { time: "0:00 to 0:05", name: "Arrival", what: "A warm greeting at your child's height, a quick word with you, and an invitation tray of toys to explore.", age2: "Same", age34: "Same" },
  { time: "0:05 to 0:15", name: "Hello circle", what: "Hello song, a photo timetable of the day, a feelings check and a mystery bag reveal.", age2: "Song and actions", age34: "Recall last sound and number" },
  { time: "0:15 to 0:25", name: "Story", what: "The week's picture book, read slowly with time to point, predict and join in.", age2: "Point and name", age34: "Retell and predict" },
  { time: "0:25 to 0:35", name: "Sounds and rhymes", what: "The week's rhyme, then a listening game. Phonics starts here, with sounds from the approved progression.", age2: "Stage 0 listening games, first sounds", age34: "Stages 1 to 3: new sound, blending, reading" },
  { time: "0:35 to 0:45", name: "Move", what: "A gross motor game: running, stopping, balancing, action songs.", age2: "Same", age34: "Same" },
  { time: "0:45 to 0:55", name: "Maths", what: "Hands-on maths: matching, sorting, counting, shape, pattern and measuring.", age2: "Matching, sorting, counting to 5", age34: "Counting, number recognition, simple adding" },
  { time: "0:55 to 1:05", name: "Snack and chat", what: "Handwashing song, snack, pouring practice and conversation.", age2: "Same", age34: "Same" },
  { time: "1:05 to 1:15", name: "Discover", what: "Science or social studies: our bodies, our senses, our feelings and the world around us.", age2: "Same", age34: "Same" },
  { time: "1:15 to 1:25", name: "Create", what: "Art, dough, mark making or role play. A different activity each day.", age2: "Sensory, scribbling", age34: "Mark-making, letter formation, crafts" },
  { time: "1:25 to 1:35", name: "Music", what: "Instruments and songs. Families who opt in add a short Faith Moment; everyone else does a kindness activity.", age2: "Same, shorter", age34: "Plus clapping syllables" },
  { time: "1:35 to 1:45", name: "Goodbye", what: "Tidy-up song, a recap of the day and a short handover note for you.", age2: "Same", age34: "Same" },
];
