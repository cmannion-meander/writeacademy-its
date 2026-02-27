import type { Course } from "./types";

export const mockCourses: Course[] = [
  {
    id: "1",
    slug: "write-storybooks-for-children",
    title: "WRITE STORYBOOKS FOR CHILDREN",
    description:
      "Inspire the next generation as you uncover the secrets to writing and publishing successful children's stories.",
    heroImage: "/images/screenshot-202025-12-12-20at-203.png",
    progress: 4,
    totalSteps: 18,
    enrollmentStatus: "enrolled",
    sections: [
      {
        id: "s1",
        title: "Module One: Introduction",
        lessons: [
          {
            id: "l1",
            title: "Learning Outcomes",
            type: "article",
            isComplete: true,
            craftTechnique: "purposeful structure",
            craftContext: "children's picture book writing",
            content: `Welcome to Write Storybooks for Children. In this module you'll discover what separates a story that gets put down after two pages from one that gets read at bedtime every night for a year.

By the end of this course you will be able to identify your target age group and understand exactly what that reader needs; craft a story with a clear beginning, middle, and end that satisfies young readers; write with economy — using fewer, more powerful words; understand the relationship between text and illustration; and navigate the publishing landscape with confidence.

Children's books are deceptively simple. That simplicity is the craft.`,
          },
          {
            id: "l2",
            title: "9 More Reasons to Write Storybooks for Children",
            type: "article",
            isComplete: true,
            craftTechnique: "persuasive writing",
            craftContext: "motivating aspiring children's book authors",
            content: `You already know the obvious reasons — the joy of seeing a child's face light up, the chance to spark a love of reading. But here are nine more that might surprise you.

Children's books have enormous shelf life. A picture book published in 1969 ('The Very Hungry Caterpillar') still sells millions of copies every year. Adult novels become dated; children's books become classics.

The market is genuinely global. A well-crafted story translates across cultures. A child in Tokyo and a child in Lagos both respond to the same universal truths: fear of the dark, the need to belong, the thrill of a caterpillar becoming a butterfly.

Word counts are low. A picture book for ages 3–6 might be 500 words. That's a single lunch break of writing — but a lifetime of reading.

The craft is transferable. Every discipline you develop writing for children — economy, clarity, emotional honesty — makes you a better writer in every other form.

You can work alone. No expensive equipment. No studio. A notebook and a quiet hour is all you need to draft your first story.`,
          },
          {
            id: "l3",
            title: "Who are you writing for?",
            type: "article",
            isComplete: false,
            craftTechnique: "audience awareness",
            craftContext: "defining the child reader for a picture book",
            content: `Before you write a single word, you need to answer one question with complete clarity: who is reading this?

Not in a demographic sense. Not "girls aged 4–7." In a human sense. Picture a specific child. What do they find funny? What do they find frightening? What do they desperately want that they can't yet have?

Children are not small adults. They don't read to escape from complexity — they read to make sense of a world that is still very new and often confusing. Your story needs to meet them exactly where they are.

The biggest mistake new children's authors make is writing for the adult who buys the book, rather than the child who reads it. Resist the urge to be clever. Resist the urge to teach. Trust the story.`,
          },
          {
            id: "l4",
            title: "Module One Test",
            type: "quiz",
            isComplete: false,
          },
          {
            id: "l5",
            title: "Ages 0 to 3 — Baby and Board Books",
            type: "article",
            isComplete: false,
            craftTechnique: "simplicity and repetition",
            craftContext: "board book for babies and toddlers ages 0-3",
            content: `Ages 0 to 3 — Baby or Board Books. These are usually made from stiff board or fabric. They often have interactive lift-the-flap or sound elements and can have as few as 8 or 12 pages. Word counts are very low and can be limited to two or three per page. In-house editorial teams often produce these books so they aren't an easy market to crack unless you have an extremely unique offering.

Think 'The Very Hungry Caterpillar' by Eric Carle and 'Dear Zoo' by Rod Campbell.

The hallmarks of a great board book are: immediate, bold visual contrast; a single concept per page (colour, shape, animal, sound); repetition that invites the child to predict what comes next; and language that is musical when read aloud.

At this age, the adult is reading aloud. Your text is a performance script. Read every word out loud as you write it.`,
          },
          {
            id: "l6",
            title: "Ages 3 to 6 — Picture Books",
            type: "article",
            isComplete: false,
            craftTechnique: "show don't tell",
            craftContext: "picture book for ages 3-6 where illustrations carry half the story",
            content: `The picture book is the jewel of children's publishing. Ages 3–6 is where the magic happens — children are old enough to follow a narrative arc, young enough to believe entirely in dragons and talking foxes.

A standard picture book is 32 pages and approximately 500–800 words. Every page turn is a decision. Every sentence competes for its place.

The critical skill here is understanding what the pictures will do. You are not writing a story; you are writing half a story. The illustrator writes the other half. Write the emotion. Write the action. Write what only words can do — the interior world, the sound, the smell — and trust the image to carry the rest.

A common beginner mistake: describing what the illustration will obviously show. 'The big red apple fell from the tall green tree.' If the illustration shows it, you don't need to say it. Use your words for what can't be drawn.`,
          },
        ],
      },
      {
        id: "s2",
        title: "Age Groups and Genres",
        lessons: [
          {
            id: "l7",
            title: "Ages 6 to 8 — Early Readers",
            type: "article",
            isComplete: false,
            craftTechnique: "chapter hooks",
            craftContext: "early reader chapter book for ages 6-8",
            content: `Early readers bridge the gap between picture books and chapter books. The child is reading independently for the first time — a fragile, thrilling new skill. Your job is to reward that effort on every page.

Chapters are short (400–600 words each). Sentences are short. Vocabulary is accessible but not dumbed-down. The plot moves quickly. There is usually one central problem and one central character.

What makes an early reader irresistible is the same thing that makes any great story irresistible: a character the reader cares about, facing a problem that feels real and urgent. The reading level is simple. The emotional stakes are not.`,
          },
          {
            id: "l8",
            title: "Age Groups and Genres Test",
            type: "quiz",
            isComplete: false,
          },
        ],
      },
      {
        id: "s3",
        title: "Story Structure",
        lessons: [
          {
            id: "l9",
            title: "The Three-Act Structure for Children",
            type: "article",
            isComplete: false,
            craftTechnique: "story structure",
            craftContext: "three-act structure applied to a children's picture book",
            content: `Every satisfying story — whether it's a 500-word picture book or a 500-page novel — follows the same basic shape: something disrupts an ordinary world, the disruption is faced and struggled with, and then resolved.

For a picture book, this might look like: A little bear loses his favourite hat (disruption). He searches everywhere, asking everyone, growing increasingly worried (struggle). He finds it — or doesn't find it, but finds something better (resolution).

The resolution doesn't always mean the problem is solved. Sometimes it means the character has changed. Sometimes it means they've accepted something new. But it must feel earned.`,
          },
        ],
      },
    ],
  },
];
