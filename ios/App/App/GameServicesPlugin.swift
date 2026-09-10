import Foundation
import Capacitor
import GameKit

/// Game Center for the web layer: sign-in, score submission, reading a board and the native leaderboard
/// sheet. The JavaScript side (src/platform/game-services.ts) defines the contract. Registered by
/// SushiBridgeViewController.
@objc(GameServicesPlugin)
public class GameServicesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameServicesPlugin"
    public let jsName = "GameServices"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadScores", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
    ]

    private var authHandlerInstalled = false
    private var pendingSignIn: [CAPPluginCall] = []
    private var sheetDelegate: CenterSheetDelegate?

    private func authResult() -> JSObject {
        let p = GKLocalPlayer.local
        var r: JSObject = ["signedIn": p.isAuthenticated]
        if p.isAuthenticated {
            r["playerId"] = p.gamePlayerID
            r["displayName"] = p.displayName
        }
        return r
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(authResult())
    }

    @objc func signIn(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        if player.isAuthenticated {
            call.resolve(authResult())
            return
        }
        pendingSignIn.append(call)
        if authHandlerInstalled { return }
        authHandlerInstalled = true
        player.authenticateHandler = { [weak self] viewController, _ in
            guard let self = self else { return }
            if let vc = viewController {
                DispatchQueue.main.async { self.bridge?.viewController?.present(vc, animated: true) }
                return
            }
            let calls = self.pendingSignIn
            self.pendingSignIn = []
            let result = self.authResult()
            for c in calls { c.resolve(result) }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let id = call.getString("leaderboardId"), let score = call.getInt("score") else {
            call.reject("leaderboardId and score are required")
            return
        }
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("not signed in")
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }

    private func entry(_ e: GKLeaderboard.Entry) -> JSObject {
        return [
            "rank": e.rank,
            "score": e.score,
            "name": e.player.displayName,
            "playerId": e.player.gamePlayerID,
        ]
    }

    @objc func loadScores(_ call: CAPPluginCall) {
        guard let id = call.getString("leaderboardId") else {
            call.reject("leaderboardId is required")
            return
        }
        let limit = max(1, min(25, call.getInt("limit") ?? 10))
        let span = call.getString("span") ?? "alltime"
        GKLeaderboard.loadLeaderboards(IDs: [id]) { boards, error in
            guard let board = boards?.first else {
                call.reject(error?.localizedDescription ?? "leaderboard not found")
                return
            }
            let scope: GKLeaderboard.TimeScope = span == "weekly" ? .week : .allTime
            board.loadEntries(for: .global, timeScope: scope, range: NSRange(location: 1, length: limit)) { local, entries, _, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                var rows: JSArray = []
                for e in entries ?? [] { rows.append(self.entry(e)) }
                var r: JSObject = ["entries": rows]
                if let me = local { r["player"] = self.entry(me) }
                call.resolve(r)
            }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        let id = call.getString("leaderboardId") ?? ""
        DispatchQueue.main.async {
            let vc = GKGameCenterViewController(leaderboardID: id, playerScope: .global, timeScope: .allTime)
            let delegate = CenterSheetDelegate { [weak self] in
                self?.sheetDelegate = nil
                call.resolve()
            }
            self.sheetDelegate = delegate
            vc.gameCenterDelegate = delegate
            self.bridge?.viewController?.present(vc, animated: true)
        }
    }
}

final class CenterSheetDelegate: NSObject, GKGameCenterControllerDelegate {
    private let onDone: () -> Void

    init(onDone: @escaping () -> Void) {
        self.onDone = onDone
    }

    func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true) { self.onDone() }
    }
}
