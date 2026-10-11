import {
  ContentPageShell,
  H2,
  H3,
  P,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";
import { APP_STORE_URL } from "../../lib/app-store";

export const metadata = {
  title: "Get No Noise Scores on your iPhone | No Noise Scores",
  description:
    "Get the iPhone app from the App Store, or add the web app to your home screen from Safari. Push notifications work either way.",
  alternates: {
    canonical:
      "https://nonoisescores.app/guides/how-to-add-to-iphone-home-screen",
  },
};

// The iPhone guide. The App Store app leads (live since 2026-06-17, with
// Live Activities and widgets the web app can't have). Add to Home Screen
// stays as the second path. The slug keeps its old name: existing URLs
// keep their slugs.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function AddToIPhonePage() {
  return (
    <ContentPageShell
      eyebrow="Guide"
      headline="Get it on your iPhone."
      intro="Two ways in. The App Store app is the quickest. Adding the web app to your home screen works too."
    >
      <H2>The App Store app</H2>
      <P>
        <a href={APP_STORE_URL} target="_blank" rel="noopener" style={linkStyle}>
          Get No Noise Scores on the App Store
        </a>
        . It&apos;s free. Open it, pick your team, and allow notifications
        when it asks.
      </P>
      <P>
        The iPhone app can also put a live score on your Lock Screen and in
        the Dynamic Island, and it has home screen widgets. The web app
        can&apos;t do those.
      </P>

      <H2>Or add the web app to your home screen</H2>
      <P>
        No Noise Scores also runs in Safari. Added to your home screen, it
        opens full screen and can send push notifications. Web push on
        iPhone needs iOS 16.4 or later (released in 2023).
      </P>

      <H3>Step 1. Open it in Safari</H3>
      <P>
        Open{" "}
        <strong style={{ color: "var(--ink)" }}>nonoisescores.app</strong>{" "}
        in Safari on your iPhone. These steps are for Safari.
      </P>

      <H3>Step 2. Tap the Share button</H3>
      <P>
        At the bottom of the Safari window, tap the{" "}
        <strong style={{ color: "var(--ink)" }}>Share</strong>{" "}
        button.
        It&apos;s the square icon with an up-arrow coming out of it. If
        you don&apos;t see it, scroll up. Safari hides the bottom bar
        when you scroll down.
      </P>

      <H3>Step 3. Tap Add to Home Screen</H3>
      <P>
        In the share sheet that slides up, scroll down the bottom row
        of options until you see{" "}
        <strong style={{ color: "var(--ink)" }}>Add to Home Screen</strong>.
        Tap it. A confirmation dialog appears with the app icon and
        title. Tap{" "}
        <strong style={{ color: "var(--ink)" }}>Add</strong>{" "}
        in the
        top-right corner.
      </P>

      <H3>Step 4. Open the new icon</H3>
      <P>
        Close Safari and find the No Noise Scores icon on your home
        screen. Tap it to open the app. The first time it opens, your
        follows and Watching games start fresh. They don&apos;t carry over
        from Safari, because the home screen app keeps its own storage. To
        bring them over, open Following and tap{" "}
        <strong style={{ color: "var(--ink)" }}>Sync with a code</strong>.
      </P>

      <H3>Step 5. Turn on notifications</H3>
      <P>
        On Today, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Turn on</strong>{" "}
        in the
        notifications card. Your iPhone asks for permission. Tap{" "}
        <strong style={{ color: "var(--ink)" }}>Allow</strong>. From then
        on, your follows&apos; alerts arrive as push notifications.
      </P>

      <CalloutBox eyebrow="Why install matters for the web app">
        On Android and desktop, websites can send push notifications
        directly from the browser. On iPhone, Apple only allows web push
        for web apps on the home screen. A Safari tab can&apos;t send
        pushes. That&apos;s how iOS works, not our policy. The App Store
        app doesn&apos;t need this step.
      </CalloutBox>

      <H2>Common gotchas</H2>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          I added it but notifications don&apos;t work.
        </strong>{" "}
        Open the app from your home screen (not Safari) and try
        turning them on again. Web push only works in the home screen
        app, not in a Safari tab.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          The icon looks generic.
        </strong>{" "}
        Remove the icon and add it again. Your iPhone sometimes keeps an
        early placeholder. Reload the page in Safari before tapping Share.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          How do I update?
        </strong>{" "}
        You don&apos;t need to. The web app updates itself when you open
        it. Force-quit and reopen if something looks out of date. The App
        Store app updates through the App Store.
      </P>

      <H2>Android Chrome</H2>
      <P>
        On Android, Chrome will offer to install No Noise Scores
        automatically when you visit. Either tap the install prompt
        when it appears at the bottom of the screen, or tap the
        three-dot menu and choose{" "}
        <strong style={{ color: "var(--ink)" }}>Install app</strong>.
        Push notifications work without install on Android, but install
        gives you the full-screen experience.
      </P>

      <P>
        Once it&apos;s on your phone,{" "}
        <a href="/guides/follow-vs-pin" style={linkStyle}>
          here&apos;s how Follow and Watching differ
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
