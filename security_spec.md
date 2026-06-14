# Security Specification: Popcorn Play Fortress Rules

## 1. Data Invariants
- **Viewer Access Protection**: Standard content is accessible by anyone. Premium video content should be locked to VIP users programmatically, but Firestore data itself must prevent unauthorized tampering.
- **Admin Supremacy**: Administrative configurations (`app_settings`), content inventory edits (`content`), and broadcast notifications (`notifications`) can only be mutated by authenticated administrators (`mdikhlas098@gmail.com`).
- **User PII Isolation**: Users can only query, read, and write their own personal profiles (`users/{userId}`) and support chats (`live_support/{userId}`). No general reading is permitted.
- **Non-Exploitable Upgrades**: Payment requests (`payments`) can be submitted by any signed-in user, but once created, the `status` can only be updated by a validated admin. No standard user can transition their request to `approved` to complete self-upgrade.
- **Identifier Protection**: Document IDs must comply with the secure ID alphanumeric format to block Resource Poisoning attacks.

---

## 2. The Dirty Dozen Payloads
Below are twelve malicious payloads that represent attacks targeting Identity, Integrity, and State boundaries. These must all result in `PERMISSION_DENIED`:

1. **Self-Promote to Admin (Identity Spoofing)**
   - Path: `/users/hacker_uid`
   - Payload: `{ "uid": "hacker_uid", "name": "Hacker", "email": "hacker@evil.com", "isPremium": false, "favorites": [], "isAdmin": true }`
2. **Standard User Updates Settings Config (Privilege Escalation)**
   - Path: `/app_settings/config`
   - Payload: `{ "appName": "Hacked App", "adultPin": "9999", "supportActive": false }`
3. **Ghost Input injection to content (Value Poisoning)**
   - Path: `/content/new_movie_id`
   - Payload: `{ "id": "new_movie_id", "title": "Attack Movie", "coverUrl": "https://attack.com/img.jpg", "videoUrl": "https://attack.com/vid.mp4", "tags": ["illegal"], "category": "Movies", "isPremium": false, "isAdult": false, "schedule": "Released", "description": "LISP Injection attack", "rating": 10, "extraGhostProperty": "maliciousSecret" }`
4. **Adversary Modifying Existing Movie Assets (Catalog Defacement)**
   - Path: `/content/m1`
   - Payload: `{ "id": "m1", "title": "Defaced Movie", "category": "Movies", "isPremium": false, "rating": 1 }`
5. **Standard User Approves Own Invoice (Self-Upgrade Attack)**
   - Path: `/payments/payment_123` (already existing status: 'pending')
   - Payload: `{ "status": "approved" }`
6. **Poisoning Document ID with Extended Characters (ID Poisoning/Denial of Wallet)**
   - Path: `/content/%EF%BF%BD%EF%BF%BDjunk-id%20with%20spaces`
   - Payload: `{ "id": "junk-id", "title": "Poisoned" }`
7. **Reading Other User's Profiles (PII Read Leak)**
   - Path: `/users/another_victim_uid`
   - Operation: `get` by malicious user
8. **Eavesdropping on Private Chat Assistance Threads (Chat Eavesdropping)**
   - Path: `/live_support/another_victim_uid`
   - Operation: `list`/`get` by malicious user
9. **Tampering with Broadcast Alerts (Notification Hijacking)**
   - Path: `/notifications/notif_999`
   - Payload: `{ "id": "notif_999", "msg": "Fake warning: system closing down", "time": "Just now" }`
10. **Admin Bypass Spoof via Unverified Email (Identity Spoofing)**
    - Path: `/content/m1`
    - Operation: `write` by user authenticated with email `mdikhlas098@gmail.com` but `email_verified: false`
11. **Malicious Zero-Payment submission (Financial Bypass)**
    - Path: `/payments/pay_hacked`
    - Payload: `{ "id": "pay_hacked", "amount": -100, "userId": "attacker_id" }`
12. **Tampering with Support Messages by Sibling User (MitM Chat Attack)**
    - Path: `/live_support/victim_id`
    - Payload: `{ "messages": [{ "sender": "admin", "text": "Hacked response" }] }`
