Scan the rendered note for all embedded audio elements.

Collect their sources (file paths) and display them in a UI menu (e.g., modal or dropdown).

When the user selects an audio entry, insert a formatted text snippet into the note (e.g., markdown link plus timestamp placeholder).

The user edits the timestamp manually or via your plugin’s UI.

Your plugin parses the note for these markers, extracts audio references and timestamps.

Use these to control playback on user interaction (e.g., clickable links or buttons).