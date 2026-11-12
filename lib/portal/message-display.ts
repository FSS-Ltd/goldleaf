import type { FamilyMessage } from "./messages-schemas";
import type { MessageAuthor } from "./message-views";
export type DisplayMessage = Omit<FamilyMessage, "author_id"> & {
  authorName: string;
  own: boolean;
};
export function displayMessages(
  messages: FamilyMessage[],
  authors: MessageAuthor[],
): DisplayMessage[] {
  const names = new Map(authors.map((author) => [author.id, author]));
  return messages.map(({ author_id, ...message }) => {
    const author = names.get(author_id);
    return {
      ...message,
      authorName: author?.name ?? "Member",
      own: author?.own ?? false,
    };
  });
}
