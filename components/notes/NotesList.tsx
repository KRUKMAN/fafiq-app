import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { formatTimestampShort } from '@/lib/formatters/dates';

export type NoteListItem = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  canDelete?: boolean;
};

export function NotesList({
  notes,
  onAddNote,
  onDeleteNote,
  noteStatus,
  notesLoading,
  notesError,
}: {
  notes: NoteListItem[];
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => Promise<void>;
  noteStatus: string | null;
  notesLoading: boolean;
  notesError: unknown;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <View className="gap-3">
      <Button variant="outline" size="sm" onPress={onAddNote} className="self-start">
        Add note
      </Button>
      {noteStatus ? <Typography variant="caption" color="muted">{noteStatus}</Typography> : null}
      {notesError ? (
        <Typography variant="caption" color="error">
          {String((notesError as any)?.message ?? notesError)}
        </Typography>
      ) : null}
      {notesLoading ? (
        <View className="items-center justify-center py-4">
          <ActivityIndicator />
        </View>
      ) : notes.length === 0 ? (
        <Typography variant="body" color="muted">No notes yet.</Typography>
      ) : (
        notes.map((note) => (
          <View key={note.id} className="border border-border rounded-md p-3 bg-surface">
            <View className="flex-row justify-between items-center mb-1">
              <View>
                <Typography variant="body" className="text-sm font-semibold text-foreground">
                  {note.author}
                </Typography>
                <Typography variant="caption" color="muted">
                  {formatTimestampShort(note.createdAt)}
                </Typography>
              </View>
              {note.canDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === note.id}
                  loading={deletingId === note.id}
                  onPress={async () => {
                    if (confirmingId !== note.id) {
                      setConfirmingId(note.id);
                      return;
                    }
                    setDeletingId(note.id);
                    try {
                      await onDeleteNote(note.id);
                    } finally {
                      setDeletingId(null);
                      setConfirmingId(null);
                    }
                  }}>
                  {confirmingId === note.id ? 'Confirm delete' : 'Delete'}
                </Button>
              ) : null}
            </View>
            <Typography variant="body" className="text-sm text-foreground">{note.body}</Typography>
          </View>
        ))
      )}
    </View>
  );
}
