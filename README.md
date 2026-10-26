# NS2 Desktop

A **user-friendly version of ns2jb**, modified to make its tools easier to use
and reduce repetitive setup. NS2 Desktop brings connection, file browsing,
game extraction and exports together in one graphical interface, allowing
multiple operations in the same session.

**Builds are available for Windows x64, Linux x64, and macOS Intel / Apple Silicon.**
The application includes its runtime and provides setup and usage instructions directly in the interface.
The interface supports English and Spanish.

| Platform | Downloads |
| --- | --- |
| Windows x64 | Portable `.exe` |
| Linux x64 | AppImage, `.deb`, `.rpm`, portable `.tar.gz` |
| macOS Intel / Apple Silicon | `.app.zip` and `.dmg` for each architecture |

Downloads are available in [Releases](https://github.com/vZylev/NS2-Desktop/releases).
macOS builds are ad-hoc signed, without Apple notarization. Automated checks
cover startup on each platform; console compatibility depends on the setup below.

## Features

- Optional USB bootstrap autotyping on Apple Silicon Macs using [mac2jb](https://github.com/cpypwn/mac2jb), with a separately installed and approved USB gadget driver.
- Multiple tools in one session, without repeating the connection process for each operation.
- File browsing across accessible SD, USER and SYSTEM storage, with filenames, folders and sizes.
- Individual file downloads and OunceCake-based RomFS / ExeFS extraction to the PC.
- Extraction choices for the updated game, base only, a specific mounted update, a specific DLC, or all versions.
- File structure exports with paths, sizes and available title metadata.
- Game content inventory and export, plus system-program code capture.
- Retry controls for recoverable errors, session history and export reports.

## Compatibility

Designed for Switch 2 with SmileBASIC 4.4.9 and system software 23.0.1.
The PC and console need to be on the same reachable network. File availability
depends on the console's accessible storage and permissions. Exports are saved
to the PC.

## Credits

Credit for the development of the underlying tools goes to **vZyle**, **Hexa**,
**pepsipu**, **kurumuz**, and all original authors and contributors to **ns2jb**,
**OunceCake** and the other integrated tools. This project builds on their work
and focuses on making those tools easier to use together.

USB typing builds on **cpypwn**’s mac2jb and **shinyquagsire23**’s libusbd / USB gadget work.
Their original MIT and APSL notices are included with the source and packages.

Special thanks to **Aster** for **testing, suggestions and feedback**.

Original licenses and attribution are preserved with the included source.
OunceCake is included under [GPLv2](engine/switch2/ouncecake/LICENSE).
