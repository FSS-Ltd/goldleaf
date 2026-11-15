import { sessionEndLabel, sessionTimeLabel } from "@/content/site";

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  { q: "Do you follow the same phonics as schools?", a: "We teach sounds in the common UK order, so what your child learns with us matches the phases Reception teaches. Stages are a working name, and they line up with the phases schools already use." },
  { q: "Can I stay during the session?", a: `To help children settle and stay focused, parents do not stay in the session room. There is a café where you are welcome to wait, or you can drop off and collect at ${sessionEndLabel}. If we meet in your home for one to one sessions, a parent or carer stays in the house.` },
  { q: "Where do sessions happen?", a: "Group sessions take place at a local church room in Ashford. One to one sessions can be at the church or in your home." },
  { q: "How many days a week?", a: `From one to five. Sessions run from ${sessionTimeLabel}. Young children learn best through little and often, so 5 days gives the strongest progress. If that is not possible, we recommend 2 to 3 days a week to build routine and consistency. We are happy to talk this through in your introductory conversation. Booking 4 or 5 days at the standard rate brings a discount, shown in the pricing table.` },
  { q: "Is it Christian?", a: "Goldleaf is a Christian-run business. Sessions are faith-neutral by default. Families can opt in, in writing, to a short Faith Moment each session with a Bible story, an action and a prayer. Everyone else does a kindness activity at the same time, so no child is left out." },
  { q: "How will I know how my child is getting on?", a: "You will have access to our parent portal, where you can follow your child's progress and message your child's tutor. You get a short handover note after every session, a weekly home card with an idea to try, and a review at the end of each unit covering two strengths, one thing to work on and what comes next." },
  { q: "What do you need from me before we start?", a: "A short All About Me form (the words your child says, likes, routines, comforters, worries, home languages and health) and six to ten printed photos of your child, family, pets, home and favourite toy." },
  { q: "What happens first?", a: "You send an enquiry, we have a chat, then your child does a short play-based check so we know where to start. There is no test and no pressure." },
  { q: "What about naps?", a: `Sessions run from ${sessionTimeLabel}, so we will chat about your child's routine in your introductory conversation.` },
  { q: "Do you offer one to one?", a: "Yes. Just let us know when you enquire and we will be happy to arrange this." },
];
