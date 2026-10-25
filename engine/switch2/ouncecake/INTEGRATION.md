# OunceCake integration in NS2 Desktop

Upstream: misshexa66/OunceCake, archive commit
`fab5954ebc9565160ac62999a1e743f34c7fe5dc`, supplied as OunceCake-main.zip.
See UPSTREAM.json for the archive checksum and LICENSE for GPL version 2.
The upstream source, copyright notices, native source and build script are included.

Changes made on 2026-10-25:

- mounts.cjs exposes prepared views and optionally retains DLC storage for direct
  PC reads, rather than deferred opening in the native FTP server. Additional
  size, directory-name, count and short-read validation was added, along with
  checks that installed source content has not changed during preparation.
- mounts.cjs retains native error results so service rejections remain retryable.
  If an additional update returns ES 0x691 or 0x1491 after another update has
  mounted both RomFS and ExeFS, the accessible views are retained and the rejected
  update is listed in skippedSources. Transport and cleanup failures still abort.
  The desktop displays omitted paths and marks extraction and structure reports
  incomplete. This covers the supplied BOTW log sequence (1114112 mounted,
  786432 rejected); it does not repair or bypass the rejected license.
- The desktop adapter releases owned mounts after a recoverable preparation
  failure, before allowing another attempt.
- session.cjs checks attachment identity and rejects failed SM transports.
- content.cjs checks NCM counts, selected versions and application ownership,
  and rejects malformed content paths.
- fs-context.cjs validates NPDM regions, registry traversal bounds and program
  map capacity, and refuses mappings that cannot be restored by this interface.
- program.cjs refuses to overwrite an existing registered patch location.

The parent ouncecake-adapter.cjs uses upstream discovery, title metadata and
mounting. It exposes those files through the authenticated desktop browser.
The parent browser-transfer.cjs transfers mounted bytes over the existing RPC
connection, checks transfer hashes and disk readback, and preserves the game
folder structure. The desktop integration does not launch the upstream native
FTP server, open its network port or require an external FTP client.
The original FTP implementation remains included as upstream source.

Hardware validation of this integration is still pending. The upstream runtime
layout assumptions apply; automated tests cover host-side parsing, adapters,
exports and failure handling, not successful mounting on physical hardware.

Desktop extraction selection (0.4.2): the default export transfers only the
highest-version mounted composed update view and DLC. With no mounted update it
uses the base view. The optional all-versions export retains the separate base
and all mounted updates. Browsing and structure inventories still expose all
mounted views. Extraction reports record mode, selectedRoot and excludedRoots;
intentional exclusions are distinct from skippedSources caused by mount errors.

Desktop extraction selection (0.4.3): base-only and specific mounted update
exports exclude DLC and other versions. The update selector lists mounted
versions and rejects unavailable selections. A specific update exports the
composed base-plus-update view, not a standalone patch; both the UI and report
identify this explicitly. Skipped update failures outside a base-only or
specific-version selection do not mark that selected export incomplete.
