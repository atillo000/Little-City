// The lounge music player is switched off while the song catalog moves to Supabase Storage.
// To turn it back on: serve the files from the storage bucket (see musicFileUrl in src/musicLibrary.js) and set this to true.
// Nothing plays, loads or embeds while it is false; the lounge itself stays open.
export const MUSIC_ENABLED = false;
