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
