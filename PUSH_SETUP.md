# Push notifications — setup & testing

Push uses the **FCM HTTP v1 API** via `firebase-admin`. The legacy `FCM_SERVER_KEY`
approach no longer works — Google shut that API down in June 2024, so any guide
mentioning a "server key" is out of date.

---

## 1. The one thing that trips everyone up

**The backend's service account and the app's `google-services.json` must belong
to the same Firebase project.**

| Side | File | Project it names |
|------|------|------------------|
| Backend | service account JSON (not in git) | `project_id` field |
| App | `android/app/google-services.json` (in git) | `project_id` field |

If they differ, the failure is silent and misleading:

- the API boots normally and logs `push to phones is ENABLED`
- the send call returns success
- **nothing arrives on any device**
- the underlying error is `messaging/mismatched-credential`

Before debugging anything else, compare the two `project_id` values.

```bash
# app side
grep -o '"project_id"[^,]*' ../FE/sawtdeen_citizen_app/android/app/google-services.json
# backend side
grep -o '"project_id"[^,]*' <your-service-account>.json
```

---

## 2. Getting a service account

Firebase Console → the project that matches `google-services.json` →
⚙️ Project Settings → **Service accounts** → **Generate new private key**.

The downloaded JSON is a **credential**. It is gitignored on purpose
(`.gitignore`: `*-firebase-adminsdk-*.json`). Never commit it — anyone holding it
can push to every user of the project, and git history keeps it forever even if
it is deleted in a later commit. Share it privately, or set it as an env var.

---

## 3. Configure

**Local development** — put the file anywhere in the repo and point at it:

```
FIREBASE_SERVICE_ACCOUNT_PATH=my-service-account.json
```

**Vercel / CI** — the file cannot be uploaded, so paste its contents as a
single-line string instead:

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"…"}
```

Set exactly one. Leaving both empty is a valid state: the API still runs, in-app
notifications still work, and the log says
`push to phones is DISABLED`.

On boot you should see:

```
[FCM] Firebase Admin initialized (project: <id>) — push to phones is ENABLED.
```

---

## 4. Announcement notifications

Publishing an announcement fans it out automatically — no separate call.

| `privacy` | Audience |
|-----------|----------|
| `everyone` | every member |
| `masjid` | members whose `mosque_affiliation` matches the **author's**, author included |

Every recipient gets an in-app row in `notifications`; those with an
`fcm_token` also get a device push.

The fan-out is intentionally **not awaited** in the request path — the
announcement is already saved, so a slow or failing FCM call must not delay or
fail the publish.

### Known limitations

1. **Announcements do not record a masjid.** There is no masjid column, so
   "that masjid" is resolved from the author's affiliation. A committee member
   posts for the jamaath they belong to.

2. **The publish form's masjid picker is not honoured.** The app sends a
   `masjid` field, but nothing persists it and the backend ignores it. Worse,
   its options (`"Jamia Masjid Makkah"`, …) do not match the values members
   actually hold (`"Jamia Masjid"`, `"Bambila Jamath"`, …), so using it as the
   audience would match nobody. Either hide that picker or unify the two lists
   behind a masjid table with IDs.

3. **Affiliation is matched as free text**, compared with `TRIM(LOWER(...))` on
   both sides. A rename still silently drops members from their own jamaath.

4. **If the author has no affiliation**, a masjid-scoped post goes to the author
   only, with a warning logged — notifying everyone would reach the wrong
   jamaath.

---

## 5. Testing

A device only receives push once it has registered an `fcm_token`. That happens
in the app on login, via `FcmTokenService` — so testers need an app build that
includes it, not an older APK.

Check who can actually be reached:

```sql
SELECT u.phone, p.mosque_affiliation,
       CASE WHEN u.fcm_token IS NULL THEN 'no token' ELSE 'has token' END AS device
FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id;
```

Publish an announcement and watch the server log:

```
[announcement <id>] scope=everyone recipients=3 devices=1 sent=1
[announcement <id>] scope=masjid masjid="Jamia Masjid" recipients=1 devices=1 sent=1
```

- `recipients` — in-app rows written
- `devices` — recipients holding a token
- `sent` — pushes FCM accepted

`devices=0` means nobody has logged in on a build containing the token upload —
not a backend fault.

### Note for device testing

On Android the app targets the deployed API
(`ApiConfig.baseUrl` only uses localhost on Web). Testing a local backend from a
phone therefore requires pointing the app at the machine's LAN address, or
deploying this branch first.
