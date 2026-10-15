# Mouse back and forward

The mouse back and forward buttons step through zoom levels first, then through notes.

## How it works

Obsidian navigates on these buttons through an Electron app command that calls `window.history.back()` and `window.history.forward()`. Cancelling the DOM mouse events does not stop it (checked in Obsidian 1.14.4 on Linux). So the plugin wraps those two methods on every window, including pop-out windows, and restores them on unload.

The wrapper asks the zoom history of the active editor in that window to move. If it moved, the call ends there. If the zoom history cannot move, or the setting is off, the original method runs and Obsidian navigates as usual.

If a window has no usable `history.back` and `history.forward`, the wrapper is not installed. The zoom history commands and the breadcrumbs keep working.

## Setting

**Use mouse back and forward for zoom** is on by default.

## Tests

The end-to-end tests press the real side buttons with `xdotool` (button 8 is back, button 9 is forward) in the main window and in a pop-out window.
