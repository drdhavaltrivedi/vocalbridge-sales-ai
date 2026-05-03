# Security Specification - VocalBridge Sales AI

## Data Invariants
1. A call record must always be linked to a valid client ID.
2. Only authenticated admins can modify client statuses in bulk (campaign management).
3. Client PII (phone numbers, emails) should only be accessible to authenticated agents/admins.
4. Knowledge base updates are restricted to admins.

## The "Dirty Dozen" Payloads (Deny List)
1. Creating a client without a phoneNumber.
2. Updating a client's status to 'interested' without being the assigned agent or admin.
3. Spoofing call timestamps.
4. Setting a client's `phoneNumber` to a 1MB string (Denial of Wallet).
5. Injecting a `role: 'admin'` field into a user profile during registration.
6. Reading the entire `clients` collection without a filter.
7. Deleting call logs (immutability).
8. Overwriting the `KnowledgeBase` as a non-admin.
9. Injecting script tags into `KnowledgeBase` content.
10. Creating a call for a non-existent client.
11. Updating `createdAt` on an existing client.
12. Parallel writing to a client's `status` to bypass state machine logic.

## Security Controls
- **isValidClient**: Enforces regex on phone numbers and strict key sets.
- **isAdmin**: Uses a lookup in `/users/{userId}` or a predefined list.
- **immutable**: Prevents changing `createdAt` and `clientId` on calls.
- **atomic**: Validates that call creation updates the client status.
