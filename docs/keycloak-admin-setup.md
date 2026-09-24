# Keycloak setup for the admin panel

What you have to create by hand before the DrinkSaver admin panel lets anyone in. Nothing here
is created by a deploy, and the panel cannot create it for you.

Written against Keycloak 26.0, which is what `compose.yaml` runs and what the cluster serves at
`https://auth.drinksaver.kak.im/auth`.

## What you are building, and why

The panel decides whether to render by reading a `groups` claim out of the access token and
looking for `admin`. The backend rejects `/v1/admin/**` for anyone whose token does not carry it.
So three things have to exist in each realm:

| Thing | Purpose |
| --- | --- |
| A group named `admin` | Who the administrators are |
| A client for the panel | Where the panel logs in, and which redirect URIs are allowed |
| A **Group Membership** mapper on that client | Puts the group into the token. Without it the group exists and the token never mentions it |

The third one is the step people skip, because the first two feel like the whole job. A group
nobody can see in a token grants nothing.

## The settings, per environment

| | Test | Production |
| --- | --- | --- |
| Realm | `test-drinksaver` | `drinksaver` |
| Client ID | `test-drinksaver-admin` | `drinksaver-admin` |
| Panel URL | `https://test.admin.drinksaver.kak.im` | `https://admin.drinksaver.kak.im` |
| Group | `admin` | `admin` |

These values are not arbitrary. They are what `deploy/values/admin-test.yaml` and
`deploy/values/admin-prod.yaml` pass to the container as `KEYCLOAK_CLIENT_ID` and
`KEYCLOAK_REALM`. If you name a client something else, change the values file to match, or the
panel will ask Keycloak for a client that does not exist and fail at startup with an error that
does not name the client.

## Step 1: Create the group

Groups are per realm, so do this once in `test-drinksaver` and once in `drinksaver`.

1. **Groups** in the left menu, then **Create group**.
2. Name: `admin`. Nothing else to set. No attributes, no role mappings, no sub-groups.
3. **Create**.

The panel accepts both `admin` and `/admin`, so it does not matter whether you later turn on full
group paths. It matches the last path segment, so a nested group like `/drinksaver/admin` also
works, and `/administrators` correctly does not.

## Step 2: Add your administrators to the group

1. **Users**, pick the user, **Groups** tab, **Join Group**, choose `admin`, **Join**.
2. Repeat per administrator.

Someone already signed in keeps their old token until it refreshes, which is at most five minutes
given the realm's `accessTokenLifespan` of 300 seconds. If you want the change to land
immediately, have them sign out and back in.

## Step 3: Create the client

**Clients**, then **Create client**.

### General settings

| Field | Value |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `test-drinksaver-admin` or `drinksaver-admin` |
| Name | DrinkSaver admin (test) or DrinkSaver admin |

### Capability config

| Field | Value | Why |
| --- | --- | --- |
| Client authentication | **Off** | This is a browser app. It cannot hold a secret, so it is a public client, exactly like `drinksaver-frontend` |
| Authorization | Off | Not used |
| Standard flow | **On** | Authorization code flow, which is what `keycloak-js` performs |
| Direct access grants | On | Matches the existing web client. Only needed if you ever script a login |
| Implicit flow | **Off** | Deprecated, and unnecessary with PKCE |
| Service accounts roles | Off | No machine-to-machine calls |

### Login settings

Use the panel's own URL, not the web app's.

| Field | Test | Production |
| --- | --- | --- |
| Root URL | `https://test.admin.drinksaver.kak.im` | `https://admin.drinksaver.kak.im` |
| Home URL | same as root | same as root |
| Valid redirect URIs | `https://test.admin.drinksaver.kak.im/*` | `https://admin.drinksaver.kak.im/*` |
| Valid post logout redirect URIs | `https://test.admin.drinksaver.kak.im/*` | `https://admin.drinksaver.kak.im/*` |
| Web origins | `https://test.admin.drinksaver.kak.im` | `https://admin.drinksaver.kak.im` |

Do not use `*` for redirect URIs. It is an open redirect on a public client, and the panel only
ever returns to its own origin.

Web origins is CORS for Keycloak's own endpoints, so it takes the origin with no path and no
trailing slash. It is separate from whatever CORS the backend allows for `/v1/admin/**`, which
you will also need to extend to the admin origin.

### Advanced settings

| Field | Value |
| --- | --- |
| Proof Key for Code Exchange Code Challenge Method | **S256** |

The panel sends `pkceMethod: 'S256'` and the login fails if the client is not configured for it.
This matches `drinksaver-frontend`, which already sets `pkce.code.challenge.method: S256`.

**Save.**

## Step 4: Add the Group Membership mapper

This is the step that actually makes the group visible, and the one worth double checking.

1. Open the client, **Client scopes** tab.
2. Click the dedicated scope, named `test-drinksaver-admin-dedicated` or
   `drinksaver-admin-dedicated`.
3. **Add mapper**, then **By configuration**, then **Group Membership**.

| Field | Value | Why |
| --- | --- | --- |
| Name | `groups` | Any name works. This one matches the claim, which saves a puzzle later |
| Token Claim Name | `groups` | The panel reads `tokenParsed.groups`. A different name here means the panel sees nothing |
| Full group path | On | Emits `/admin`. The backend requires exactly `/admin`, so off locks every admin out of `/v1/admin/**` |
| Add to ID token | On | Harmless, and useful when debugging |
| **Add to access token** | **On** | **Required.** See below |
| Add to userinfo | On | Harmless |

**Add to access token must be on.** `keycloak-js` exposes `tokenParsed` as the parsed *access*
token, so that is the only one the panel reads. It is also the token sent to the backend as the
bearer credential, so it is the only one the backend can authorize from. If you leave only
"Add to ID token" enabled, everything looks configured, the group exists, the user is in it, and
every single administrator is refused. That failure reads like a broken login, which is why it is
worth checking twice now rather than diagnosing later.

**Save.**

## Step 5: Verify before telling anyone it works

Sign in to the panel and confirm you get past the refusal screen. If you want to see the claim
itself:

1. Open the panel, then the browser devtools.
2. Network tab, find the `token` request to Keycloak, copy `access_token` from the response.
3. Decode the payload locally:

```sh
# Replace <token> with the access token. Prints the payload only, no signature check.
printf '%s' '<token>' | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

You are looking for:

```json
"groups": [
  "/admin"
]
```

If `groups` is absent, the mapper is missing, is on the wrong client, or does not have
**Add to access token** enabled. If `groups` is present but does not contain `admin`, the user is
not in the group.

Decode locally rather than pasting into an online decoder. A production access token is a live
credential until it expires.

## Local development

The local stack imports `deploy/local/keycloak-realm.json` on first start, so local setup is a
file edit rather than console clicking. That realm currently has one client, one user and no
groups at all, which is why the admin panel cannot be used locally yet.

Add a `groups` array at the top level of the realm:

```json
"groups": [
  { "name": "admin" }
]
```

Add a second client alongside the existing `drinksaver-frontend`, keeping that one as it is:

```json
{
  "clientId": "drinksaver-admin",
  "name": "DrinkSaver admin (local)",
  "enabled": true,
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "serviceAccountsEnabled": false,
  "rootUrl": "http://localhost:3001",
  "baseUrl": "http://localhost:3001",
  "redirectUris": ["http://localhost:3001/*", "http://localhost:5174/*"],
  "webOrigins": ["http://localhost:3001", "http://localhost:5174"],
  "attributes": {
    "post.logout.redirect.uris": "http://localhost:3001/*",
    "pkce.code.challenge.method": "S256"
  },
  "protocolMappers": [
    {
      "name": "groups",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-group-membership-mapper",
      "config": {
        "claim.name": "groups",
        "full.path": "true",
        "access.token.claim": "true",
        "id.token.claim": "true",
        "userinfo.token.claim": "true"
      }
    }
  ]
}
```

Then put the seeded `dev` user in the group by adding to that user's object:

```json
"groups": ["/admin"]
```

Two ports appear above because the panel runs two ways locally: `3001` if you add it to
`compose.yaml` as a container next to `web` on `3000`, and `5174` for `npm run dev`, which needs
an explicit port because the web app's Vite server already takes the default.

Note that `dev` is also the UUID in `ADMIN_USER_LIST` in `compose.yaml`, which is what currently
makes that user's rows appear as shared reference data. Group membership and that list are
separate mechanisms today. The backend restructure removes the list, at which point the group is
the only thing that matters.

The realm import only runs against an empty database. To pick up realm changes:

```sh
docker compose down -v && docker compose up -d
```

That deletes the Postgres volume, so the seeded drink history is rebuilt with fresh dates and
anything saved locally is gone. That is the intended cost of a realm edit, not a mistake.

## Troubleshooting

| Symptom | Almost always |
| --- | --- |
| Every administrator sees "Not authorised" | The mapper exists but **Add to access token** is off |
| One person sees "Not authorised" | They are not in the group, or their token predates being added. Sign out and back in |
| Redirected to Keycloak and straight back, forever | Redirect URI does not match the panel's origin. Check for a missing `/*`, or `http` against `https` |
| "Invalid parameter: redirect_uri" | Same cause, stated plainly by Keycloak |
| CORS error against the auth host | Web origins does not list the panel's origin, or lists it with a trailing slash |
| Panel loads, every admin request 403s | The token carries the group but the backend does not accept it. That is a backend problem, not Keycloak: check it reads the same claim name |
| "The iss claim is not valid" | The Keycloak hostname is not what the backend expects. The `KC_HOSTNAME` comment in `compose.yaml` documents this exact trap for the local stack |
| Works in test, not production | Different realm, so every step here has to have been done twice, and the client ID differs between them |

## What deliberately is not here

- **No client secret.** The panel is a public client. If you find yourself copying a secret, you
  have created the wrong client type.
- **No realm roles.** The group alone carries the meaning. A role mirroring the group would be a
  second source of truth that can disagree with the first.
- **No separate admin realm.** Administrators are DrinkSaver users who happen to be in a group.
  A separate realm would mean separate accounts and a second directory to keep in step.
- **No changes to `drinksaver-frontend`.** The consumer web app does not need the groups claim,
  and an administrator signed into the consumer app deliberately cannot reach admin endpoints
  from there.
