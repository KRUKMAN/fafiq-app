import { Dog } from '@/schemas/dog';

export type DogProfileNote = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  canDelete?: boolean;
};

export type DogProfileMedicalRecord = {
  id: string;
  title: string;
  status: string;
  date: string;
  doctor?: string;
  notes?: string;
};

export type DogProfileFileItem = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  uploadedBy?: string;
  size?: number | null;
};

export type DogProfileView = {
  id: string;
  orgId: string;
  name: string;
  stage: string;
  medicalNotes: string;
  behavioralNotes: string;
  location: string;
  description: string;
  internalId: string;
  photoUrl?: string;
  responsiblePerson: string;
  fosterName: string | null;
  budgetSpent: number;
  budgetLimit?: number | null;
  lastUpdate: string;
  attributes: {
    age?: string;
    sex?: 'Male' | 'Female';
    size?: string;
    breed?: string;
    intakeDate?: string;
  };
  alerts: { type: 'warning' | 'error'; message: string }[];
  notes: DogProfileNote[];
  medicalHistory: DogProfileMedicalRecord[];
  files: DogProfileFileItem[];
};

export function toDogProfileView(dog: Dog): DogProfileView {
  const attributes = dog.extra_fields.attributes ?? {};
  const notes = (dog.extra_fields.notes as DogProfileNote[] | undefined) ?? [];
  const medicalHistory = (dog.extra_fields.medical_history as DogProfileMedicalRecord[] | undefined) ?? [];
  const files = (dog.extra_fields.files as DogProfileFileItem[] | undefined) ?? [];

  return {
    id: dog.id,
    orgId: dog.org_id,
    name: dog.name,
    stage: dog.stage,
    medicalNotes: dog.medical_notes ?? '',
    behavioralNotes: dog.behavioral_notes ?? '',
    location: dog.location,
    description: dog.description,
    internalId: dog.extra_fields.internal_id ?? '',
    photoUrl: dog.extra_fields.photo_url,
    responsiblePerson: dog.extra_fields.responsible_person ?? '',
    fosterName: dog.extra_fields.foster_name ?? null,
    budgetSpent: dog.extra_fields.budget_spent ?? 0,
    budgetLimit: dog.budget_limit ?? null,
    lastUpdate: dog.extra_fields.last_update ?? '',
    attributes: {
      age: attributes.age,
      sex: attributes.sex,
      size: attributes.size,
      breed: attributes.breed,
      intakeDate: attributes.intake_date,
    },
    alerts: dog.extra_fields.alerts ?? [],
    notes,
    medicalHistory,
    files,
  };
}
