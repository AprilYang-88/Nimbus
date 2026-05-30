export type RelatedNote = {
  id: number;
  title: string;
  kind: "manual" | "recommended";
};

export type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  relatedNotes: RelatedNote[];
};

