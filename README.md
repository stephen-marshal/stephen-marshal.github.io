# Stephen Marshall — CV site

Live at **https://stephen-marshal.github.io**

A personal CV site where the public sees only my name, headline, a quote and my LinkedIn link.
Visitors who sign in see the full CV, and each sign-in is recorded so I know who has viewed it.

Everything runs on free tiers: GitHub Pages hosts the site, and Firebase on the Spark plan handles sign-in and data.

---

## How it works

```
Visitor ──► stephen-marshal.github.io  (GitHub Pages: public login screen only)
               │
               │  "Continue with Google"
               ▼
           Firebase Authentication  ──►  signed-in user
               │
               ├─► Firestore  cv/content        → full CV HTML (readable only when signed in)
               └─► Firestore  visitors/{uid}    → name, email, provider, first/last visit, visit count
                                                  (only the owner can read the list)
```

- **The CV text is not in this repo.** It lives in Firestore and is only sent to signed-in users.
  The master copy is kept locally in `~/dev/repos/personal/cv-private/cv-content.html`. That folder is not in git, so back it up.
- **The Firebase config in `firebase-config.js` is public by design.** Access is enforced by the Firestore security rules, not by keeping the config secret.

### Files

| File | Purpose |
|---|---|
| `index.html` | Public page: header, sign-in buttons, privacy note, and the container the CV loads into |
| `app.js` | Handles sign-in, records the visit, then loads the CV from Firestore |
| `visitors.html` | Owner-only page: visitor table, plus a file picker to publish CV content |
| `firebase-config.js` | Firebase web config and the owner email |
| `style.css` | Styles, including light/dark theme and print layout |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |
| `blog/` | Public blog: `index.html` lists posts, one folder per post (`blog/<slug>/index.html`), shared `blog.css`. Diagrams are inline SVG. |

### Add a blog post
1. Copy an existing `blog/<slug>/` folder and rename it to the new slug, then edit the post.
2. Add it to `blog/index.html`, newest first.
3. Add it to the **Writing** section of `cv-content.html` and publish that through `visitors.html`.
4. Commit and push.

Kept locally in `~/dev/repos/personal/cv-private/` (not published):

| File | Purpose |
|---|---|
| `cv-content.html` | The full CV, which is the content you publish |
| `firestore.rules` | Firestore security rules |
| `firebase.json` | Firebase CLI project file, used to deploy the rules |
| `index-old-backup.html` | The original single-page public CV, kept for reference |

---

## Everyday tasks

### Update the CV
1. Edit `~/dev/repos/personal/cv-private/cv-content.html`.
2. Open https://stephen-marshal.github.io/visitors.html and sign in with the owner Google account.
3. Under **Publish CV content**, choose the edited `cv-content.html`. It goes live immediately.

### See who has viewed the CV
Open https://stephen-marshal.github.io/visitors.html and sign in as the owner.
You can also see the raw records in the Firebase console under **Firestore**, collection `visitors`.

### Change the public page (header, quote, sign-in screen, styling)
```bash
gh auth switch -u stephen-marshal          # this repo belongs to the personal GitHub account
cd ~/dev/repos/personal/cv-site
# edit index.html / style.css / app.js
git add -A && git commit -m "..." && git push
```
GitHub Pages updates about a minute after each push.

### Change the security rules
```bash
cd ~/dev/repos/personal/cv-private
# edit firestore.rules
npx firebase-tools --project stephen-marshall-cv deploy --only firestore:rules
```

### Delete a visitor's data (GDPR request)
In the Firebase console:
1. Delete their document under **Firestore**, collection `visitors`.
2. Delete their account under **Authentication**, on the **Users** tab.

---

## How it was set up (one-off, Nov 2026)

**Firebase** (console.firebase.google.com, signed in as the owner Gmail):
1. Created project `stephen-marshall-cv` on the **Spark (free)** plan, with Google Analytics turned off.
2. In **Authentication**, on the **Sign-in method** tab: enabled **Google**.
3. In **Authentication**, under **Settings** and then **Authorized domains**: added `stephen-marshal.github.io`.
4. Logged the CLI in with `npx firebase-tools login`.
5. Registered the web app: `npx firebase-tools --project stephen-marshall-cv apps:create WEB "CV site"`.
   Then printed its config with `apps:sdkconfig` and copied it into `firebase-config.js`.
6. Created the Firestore database in the console (**Standard edition**, location **europe-west2 (London)**, production mode).
7. Deployed the rules: `npx firebase-tools --project stephen-marshall-cv deploy --only firestore:rules`.

**GitHub** (personal account `stephen-marshal`):
1. Deleted the original public repo, because its history contained the full CV.
2. Recreated `stephen-marshal.github.io` from a fresh history containing only the login version. Pages serves the `main` branch root.
3. Signed in once at `/visitors.html` as the owner and published `cv-content.html`.

### Adding more sign-in options
The buttons are already in `index.html`. Turn them on by setting the provider to `true` in `ENABLED` in `app.js`.

- **GitHub:** create an OAuth App at https://github.com/settings/developers.
  Set the callback URL to `https://stephen-marshall-cv.firebaseapp.com/__/auth/handler`.
  Then paste the Client ID and Secret into Firebase under **Authentication**, **Sign-in method**, **GitHub**.
- **Microsoft:** register an app in the Azure portal (Entra ID), using the same callback URL.
  Then add its Application ID and secret under the Firebase **Microsoft** provider.
  Azure may ask for a card to verify your identity; the app registration itself is free.

---

## Costs and limits

Spark plan, with no card on file, so it cannot be charged:
- Firestore: 50k reads / 20k writes per day free
- Authentication: 50k monthly active users free

A CV site uses a tiny fraction of this. If Firebase ever suggests upgrading to **Blaze**, it isn't needed.

## Privacy

The sign-in screen tells visitors what is recorded (name, email, visit times), why, how long it is kept (up to 12 months), and how to ask for deletion.
Keep that note accurate if anything changes, because it is what UK GDPR requires.
