"""CareCircle — shared memory for families caring for an elderly parent."""

import truststore

# Verify TLS against the OS trust store (macOS Keychain / Windows cert store) instead of
# Python's bundled CAs. Fixes CERTIFICATE_VERIFY_FAILED on python.org builds and behind
# corporate TLS-inspecting proxies, without disabling verification.
# This must run before aiohttp is imported: aiohttp builds its default SSL context once, at
# import time, and the Hindsight SDK uses that default for some calls (e.g. create_bank).
truststore.inject_into_ssl()

__version__ = "0.1.0"
