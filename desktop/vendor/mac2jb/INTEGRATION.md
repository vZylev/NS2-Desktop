# USB sender integration

The sender, command sender and macOS libusbd sources are an unmodified subset
of cpypwn/mac2jb at the revision recorded in UPSTREAM.json. SHA-256 hashes cover
each imported file. Original MIT and APSL notices remain in the source and packages.

NS2 Desktop builds Apple Silicon helpers with MAC2JB_GUI progress events and
a local libusbd dylib. The bootstrap operation types our bundled bootstrap.bas
without running it. A separate, explicitly confirmed connection operation sends
LOAD, its confirmation, RUN, REMOVE and the current host's START command.

During the build, desktop/build-autotyper.cjs replaces the command sender's
five-argument record loader with desktop/native-src/active-command.h. This
adapter validates our nine-argument authenticated pairing command and live host
PID from a private record. No arbitrary command or path is accepted from the UI.
The record is removed after use. A host session can attempt command typing once.
Stopping signals the entire helper process group, including discovery workers.
Interrupted command typing requires restarting the console before another attempt.

The application does not install drivers or alter SIP/startup security. USB
checks report driver loading, available controller names and SIP status.

Credits: cpypwn, shinyquagsire23 and the authors credited in the imported source.
Native compilation, dry runs, command parsing and timing protocol tests do not
establish successful USB typing or console execution on physical hardware.
