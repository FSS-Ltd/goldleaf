// Session template, 1 hour 45 minutes (client PDF, pages 5 and 6).
export type Block = { time: string; name: string; what: string; age2: string; age34: string };

export const sessionBlocks: Block[] = [
  { time: "0:00 to 0:05", name: "Arrive and settle", what: "Handover and free play with a set-out activity.", age2: "Same", age34: "Same" },
  { time: "0:05 to 0:15", name: "Welcome circle", what: "Hello song, day and weather, recall from last session.", age2: "Song and actions", age34: "Recall last sound and number" },
  { time: "0:15 to 0:30", name: "Phonics", what: "Sound of the day from the approved progression.", age2: "Stage 0 listening games, first sounds", age34: "Stages 1 to 3: new sound, blending, reading" },
  { time: "0:30 to 0:40", name: "Move", what: "Gross motor play linked to the theme.", age2: "Same", age34: "Same" },
  { time: "0:40 to 0:50", name: "Snack and story", what: "Shared book, new vocabulary, talk.", age2: "Point and name", age34: "Retell and predict" },
  { time: "0:50 to 1:05", name: "Maths through play", what: "Number, counting, shape, pattern, measuring.", age2: "Counting to 5, sorting", age34: "Counting, number recognition, simple adding" },
  { time: "1:05 to 1:20", name: "Singing and music", what: "Rhymes, rhythm, pitch, action songs.", age2: "Same, shorter", age34: "Plus clapping syllables" },
  { time: "1:20 to 1:38", name: "Make and explore", what: "Fine motor, art, sensory or theme activity. The tutor observes and notes progress.", age2: "Sensory, scribbling", age34: "Mark-making, letter formation, crafts" },
  { time: "1:38 to 1:45", name: "Review and goodbye", what: "What we learned, goodbye song, a one-minute parent update.", age2: "Same", age34: "Same" },
];
