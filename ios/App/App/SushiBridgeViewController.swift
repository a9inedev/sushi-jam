import UIKit
import Capacitor

/// The app's bridge controller (Main.storyboard points here). Registers the plugins that live in this
/// target rather than in an npm package.
class SushiBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameServicesPlugin())
    }
}
