import {
  ContentPageShell,
  H2,
  P,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "How to add No Noise Scores to your iPhone home screen",
  description:
    "Open Safari, tap Share, then Add to Home Screen. Push notifications work after install. Three taps.",
  alternates: {
    canonical:
      "https://nonoisescores.app/guides/how-to-add-to-iphone-home-screen",
  },
};

export default function AddToIPhonePage() {
  return (
    <ContentPageShell
      eyebrow="Guide"
      headline="Add to iPhone home screen."
      intro="Three taps. After install, the app opens full-screen and can send push notifications like a regular app."
    >
      <P>
        No Noise Scores is a Progressive Web App. Once you add it to
        your home screen it behaves like a regular iOS app: full screen,
        app drawer icon, push notifications.
      </P>
      <P>
        Works on iOS 16.4 or later (released 2023). Push notifications
        are why install matters on iPhone. Apple only lets web apps
        send pushes after they&apos;re installed.
      </P>

      <H2>Step 1. Open in your browser</H2>
      <P>
        Open{" "}
        <strong style={{ color: "var(--ink)" }}>nonoisescores.app</strong>{" "}
        in a browser on your phone.
      </P>
      <P>
        On iPhone you have to use Safari for this. Chrome or Firefox
        won&apos;t work. That&apos;s an Apple rule for web apps, not us.
        On Android, Chrome works.
      </P>

      <H2>Step 2. Tap the Share button</H2>
      <P>
        At the bottom of the Safari window, tap the{" "}
        <strong style={{ color: "var(--ink)" }}>Share</strong> button.
        It&apos;s the square icon with an up-arrow coming out of it. If
        you don&apos;t see it, scroll up. Safari hides the bottom bar
        when you scroll down.
      </P>

      <H2>Step 3. Tap Add to Home Screen</H2>
      <P>
        In the share sheet that slides up, scroll down the bottom row
        of options until you see{" "}
        <strong style={{ color: "var(--ink)" }}>Add to Home Screen</strong>.
        Tap it. A confirmation dialog appears with the app icon and
        title. Tap{" "}
        <strong style={{ color: "var(--ink)" }}>Add</strong> in the
        top-right corner.
      </P>

      <H2>Step 4. Open the new icon</H2>
      <P>
        Close Safari and find the No Noise Scores icon on your home
        screen. Tap it to launch the app. The first time it opens, your
        follows and pinned games will load fresh. These don&apos;t
        carry over from Safari because PWAs have their own isolated
        storage.
      </P>

      <H2>Step 5. Enable notifications</H2>
      <P>
        On the Today screen, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Turn on</strong> in the
        notifications card. IOS will ask for permission. Tap{" "}
        <strong style={{ color: "var(--ink)" }}>Allow</strong>. From
        this point forward, your alert tiers will fire push notifications
        to your lock screen.
      </P>

      <CalloutBox eyebrow="Why install matters on iPhone">
        On Android and desktop, websites can send push notifications
        directly from the browser. On iPhone, Apple restricts web push
        to installed PWAs. Safari tabs can&apos;t send pushes. That&apos;s
        not our policy; it&apos;s how iOS works. Install is the
        prerequisite.
      </CalloutBox>

      <H2>Common gotchas</H2>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          I added it but notifications don&apos;t work.
        </strong>{" "}
        Open the app from your home screen (not Safari) and try
        enabling again. Notifications only work in the installed PWA
        context, not in Safari.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          The icon looks weird / generic.
        </strong>{" "}
        Try clearing the icon and re-adding. IOS sometimes caches an
        early-load placeholder. Reload the page in Safari before tapping
        Share.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          I want to update.
        </strong>{" "}
        You don&apos;t need to. PWAs update silently on open. Force-quit
        the app and reopen if you suspect an old version.
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
        Once you&apos;re installed,{" "}
        <a
          href="/guides/follow-vs-pin"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          here&apos;s how Follow and Pin differ
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
