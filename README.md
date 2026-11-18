# People + Pets Matching Game

An interactive game for the Yearbook '26 "People + Pets" page. Readers scan a QR code, then drag each pet photo into the frame beside its owner. Submit highlights correct matches in green and wrong ones in red.

It is a plain static site: no build step, no dependencies.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page |
| `styles.css` | Look and feel, including light and dark themes |
| `game.js` | Game logic (drag and drop, tap to place, scoring) |
| `data/pairs.json` | Who matches with which pet |
| `photos/` | Owner and pet photos |

## Update the pairings

Open `data/pairs.json`. Each entry is one owner with their own pet:

```json
{ "owner": "Maya Chen", "ownerPhoto": "photos/owner-maya-chen.jpg",
  "pet": "Biscuit", "petPhoto": "photos/pet-biscuit.jpg", "type": "Dog" }
```

These match the columns in the "'26 YB Matching Game" Google Sheet:

| Sheet column | `pairs.json` field |
| --- | --- |
| Owner Name | `owner` |
| Owner Photo | `ownerPhoto` |
| Pet Name | `pet` |
| Pet Photo | `petPhoto` |
| Pet Type | `type` |

Notes:
- A pet is correct only beside the owner in its own entry.
- Leave a photo as `""` to show a placeholder tile with initials.
- Order in the file is the order on the page. Pets are shuffled on the shelf every time.
- Keep the commas and quotation marks exactly as in the example. A missing comma stops the game from loading, and the page will say so.

## Add photos

1. Resize photos to about 400 pixels wide so the page loads quickly on phones.
2. Upload them to the `photos/` folder (**Add file > Upload files** on GitHub).
3. Point each entry in `data/pairs.json` at its file, for example `"photos/pet-biscuit.jpg"`. File names are case sensitive.

Photos are cropped to a square (pets) or circle (owners), so faces and animals near the center look best.

## Publish with GitHub Pages

1. Go to **Settings > Pages**.
2. Under "Build and deployment," choose **Deploy from a branch**, then branch **main** and folder **/ (root)**, and click **Save**.
3. After a minute or two the live link appears at the top of that page, in the form `https://OWNER.github.io/REPO-NAME/`.
4. Open the link on a phone and play a full round, then make the QR code from it.

GitHub Pages sites are public. Anyone with the link can see the photos and names.

If you rename the repo, the link changes and the QR code has to be regenerated.

## Run it on your own computer

Browsers block a page from reading `data/pairs.json` when you open `index.html` straight from a folder. Start a small local server instead:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
