# mac2jb USB bootstrap sender

The sender and macOS libusbd build sources are an unmodified subset of
cpypwn/mac2jb at the revision recorded in UPSTREAM.json. SHA-256 hashes cover
each imported file. The MIT and APSL license notices are preserved.

NS2 Desktop builds only the text sender for Apple Silicon, with MAC2JB_GUI
progress messages and a local libusbd dylib. It sends NS2 Desktop's own
bootstrap.bas, not mac2jb's different bootstrap or its post-bootstrap commands.
It does not press Run, install a driver, change SIP, or change startup security.
The user must first install and approve a compatible usbgadget driver using the
upstream documentation: https://github.com/cpypwn/mac2jb#readme

Typing is an explicit operation before starting a console session. The user
confirms an empty SmileBASIC editor and US English USB keyboard layout on the
console. Stop signals the entire sender process group, including the worker
used for controller discovery. A stopped or failed transfer is never resumed
automatically; the user must clear partial text before starting again.

Credits: cpypwn (mac2jb), shinyquagsire23 (libusbd and USB gadget work), and the
original authors credited in the vendored source. Native build and dry-run
checks do not establish successful typing on physical console hardware.
