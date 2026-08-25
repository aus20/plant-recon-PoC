# Running this

Three ways to see it work, cheapest first. The first needs no phone and no `npm install`.

## What you need

- **Node 24 or newer.** It runs TypeScript directly and reads `.env` itself, so the
  identification engine has no npm dependencies at all.
- **An EachLabs API key**, in a `.env` file at the repository root:

  ```bash
  echo "EACHLABS_API_KEY=your-key" > .env
  ```

- **For the app only:** an iPhone or Android phone with **Expo Go** from the app store,
  on the same Wi-Fi as your machine. No Xcode, no Android Studio.

## 1. Identify a plant from the terminal (30 seconds)

The fastest proof that the whole pipeline works. No install step.

```bash
npm run identify -- path/to/a-plant-photo.jpg
```

You get the species, family, calibrated confidence, care advice, a graded toxicity
verdict, the runner-up species, and what the call cost:

```
Forget-me-not  (Myosotis sylvatica)
family      Boraginaceae
confidence  95%
severity    mild
predict_time  2.96 s
cost          $0.001284   -> 778 identifications per $1
```

Useful flags:

```bash
npm run identify -- photo.jpg --think    # turn Gemini's reasoning on, to compare
npm run identify -- photo.jpg --raw      # print every API response
```

Try it with a photo that has no plant in it. You should get `NOT A PLANT` rather than an
invented species.

## 2. Run the tests

```bash
npm test
```

Eight tests over the parser, driven by real API responses captured from the live service.
No network access needed.

## 3. Run the app on your phone

```bash
cd app
npm install
echo "EXPO_PUBLIC_EACHLABS_API_KEY=your-key" > .env
npx expo start
```

Scan the QR code with your phone's camera. The app opens in Expo Go. The phone and the machine should be on the same Wi-Fi network!!

Point the camera at a plant, or pick one from your photos. Identifications are saved on
the device, so the home screen fills up as you go.

**If the phone is on a different network:**

```bash
npx expo start --tunnel
```

## If something goes wrong

**"Project is incompatible with this version of Expo Go"**
The project is pinned to Expo SDK 54 because that is what Expo Go on the App Store still
is. If your Expo Go is older, update it from the store.

**The QR code connects but the app never loads**
The phone and the machine are probably on different networks. Use `npx expo start --tunnel`.

**"No API key"**
The app reads `app/.env` and the terminal script reads the root `.env`. They are two
separate files, and neither is in git.

**Metro behaves strangely after pulling changes**
```bash
npx expo start -c
```

## Where things are

```
shared/     The identification engine and the types both sides share
scripts/    The terminal tool from step 1
tests/      Parser tests with captured API responses
app/        The Expo app
```

`README.md` covers why it is built this way, what was measured, and what was deliberately
left out. `AD_CONCEPTS.md` is the second half of the case study.
