import UIKit
import WebKit
import Capacitor

// Custom bridge view controller that registers our local plugins
// with Capacitor. Without this, plugins defined in the app target
// (as opposed to SPM packages) aren't discovered automatically.

class NoNoiseViewController: CAPBridgeViewController {

    // Brand cream — matches the CSS --cream (#f1ead8).
    private let cream = UIColor(red: 241/255, green: 234/255, blue: 216/255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()

        // Force the entire app to render with a light userInterfaceStyle
        // regardless of the device's system Dark Mode setting. Without
        // this, WKWebView inherits the host's dark trait, which (a) paints
        // its `underPageBackgroundColor` black under the cream page, and
        // (b) styles native form controls and scrollers dark — both off-
        // brand. The web layer handles its own light/dark via the
        // in-Settings theme toggle, so the iOS appearance is irrelevant
        // to the actual page render.
        overrideUserInterfaceStyle = .light

        // Paint the root view cream so the status bar area and any
        // overscroll region match the app background instead of
        // flashing white.
        view.backgroundColor = cream
    }

    override open func capacitorDidLoad() {
        print("🔌 [NoNoise] capacitorDidLoad — registering plugins")
        let plugin = LiveActivityPlugin()
        bridge?.registerPluginInstance(plugin)
        print("🔌 [NoNoise] LiveActivityPlugin registered: \(plugin.jsName)")

        let widgetPlugin = WidgetBridgePlugin()
        bridge?.registerPluginInstance(widgetPlugin)
        print("🔌 [NoNoise] WidgetBridgePlugin registered: \(widgetPlugin.jsName)")

        // Disable rubber-band bounce and paint the scroll area cream.
        if let wv = webView {
            wv.scrollView.bounces = false
            wv.scrollView.backgroundColor = cream
            wv.backgroundColor = cream
            wv.isOpaque = false

            // The space WKWebView paints *under* the page while it's
            // loading or while overscroll is active. Defaults to black
            // when the host is in dark mode, which is exactly the
            // TestFlight "black screen until paint" symptom. Lock it to
            // cream so even a delayed first paint reads as on-brand.
            if #available(iOS 15.0, *) {
                wv.underPageBackgroundColor = cream
            }

            // Allow Safari's Web Inspector to attach to this WebView in
            // signed Release / TestFlight builds. Without this, only
            // Debug builds are inspectable. Required for diagnosing
            // anything that goes wrong on a TestFlight install. Strip
            // this line for the final App Store build if desired —
            // exposing inspectability ships a small attack surface, but
            // it's invaluable for the launch-window debugging cycle.
            if #available(iOS 16.4, *) {
                wv.isInspectable = true
            }

            print("🔌 [NoNoise] WebView bounce disabled, background set to cream, light style forced, inspectable enabled")
        }
    }
}
