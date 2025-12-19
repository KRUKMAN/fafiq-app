export type MemberRow = {
  id: string;
  name: string;
  email: string;
  userId: string;
  roles: string;
  status: string;
};

export type ContactRow = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  roles: string;
  linked: string;
};

export type ContactDraft = {
  kind: 'person' | 'home';
  display_name: string;
  email: string;
  phone: string;
  roles: string[];
};


