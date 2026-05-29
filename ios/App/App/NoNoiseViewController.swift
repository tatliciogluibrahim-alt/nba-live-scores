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

        // Paint the root view cream so the status bar area and any
        // overscroll region match the app background instead of
        // flashing white.
        view.backgroundColor = cream
    }

    override open func capacitorDidLoad() {
        print("🔌 [NoNoise] capacitorDidLoad — registering LiveActivityPlugin")
        let plugin = LiveActivityPlugin()
        bridge?.registerPluginInstance(plugin)
        print("🔌 [NoNoise] LiveActivityPlugin registered: \(plugin.jsName)")

        // Disable rubber-band bounce and paint the scroll area cream.
        if let wv = webView {
            wv.scrollView.bounces = false
            wv.scrollView.backgroundColor = cream
            wv.backgroundColor = cream
            wv.isOpaque = false
            print("🔌 [NoNoise] WebView bounce disabled, background set to cream")
        }
    }
}
