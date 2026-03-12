# FitBites

FitBites is now structured as:

- Web app and API: Next.js in the repository root
- Mobile app: Expo React Native app in `mobile/`

## Web App

Run the existing Next.js app and API:

In `./` directory:
Run
```bash
npm install
npm run dev
```

Web runs at `http://localhost:3000`.

## Mobile App (React Native)

The mobile client lives in `mobile/` and calls the same API routes used by the web app.

### 1. Install mobile dependencies

```bash
npm run mobile:install
```

### 2. Configure backend URL for your phone

Copy `mobile/.env.example` to `mobile/.env` and set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000
```
**Eduroam firewall is highly restricted that this may not work under Eduroam connection. Instead launch a personal hotspot on your phone and connect to it on computer, and follow the instructions below.**

Use your computer's LAN IP so a physical device can reach the Next.js API server. To find the IP, run `ipconfig` in command line and look for the IPv4 address.


### 3. Start mobile development

In `./mobile/` directory:
Run
```bash
npx expo start --tunnel --clear
```
OR
In `./` directory:
Run
```bash
npm run mobile:start
```


Then scan the Expo QR code with Expo Go on your phone.

## Notes on Session/Auth

The mobile app uses the same session-backed auth endpoints:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Make sure the backend server is running before opening the mobile app.
