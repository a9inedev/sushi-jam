package com.a9inedev.sushijam;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.AnnotatedData;
import com.google.android.gms.games.LeaderboardsClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.Player;
import com.google.android.gms.games.leaderboard.LeaderboardScore;
import com.google.android.gms.games.leaderboard.LeaderboardScoreBuffer;
import com.google.android.gms.games.leaderboard.LeaderboardVariant;

/**
 * Play Games Services v2 for the web layer: sign-in, score submission, reading a board and opening the
 * native leaderboard UI. The JavaScript side (src/platform/game-services.ts) defines the contract.
 */
@CapacitorPlugin(name = "GameServices")
public class GameServicesPlugin extends Plugin {

    @Override
    public void load() {
        PlayGamesSdk.initialize(getContext());
    }

    @PluginMethod
    public void status(PluginCall call) {
        PlayGames.getGamesSignInClient(getActivity())
            .isAuthenticated()
            .addOnCompleteListener(task -> {
                boolean ok = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
                if (ok) resolveWithPlayer(call);
                else resolveSignedOut(call);
            });
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        PlayGames.getGamesSignInClient(getActivity())
            .signIn()
            .addOnCompleteListener(task -> {
                boolean ok = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
                if (ok) resolveWithPlayer(call);
                else resolveSignedOut(call);
            });
    }

    private void resolveSignedOut(PluginCall call) {
        JSObject r = new JSObject();
        r.put("signedIn", false);
        call.resolve(r);
    }

    private void resolveWithPlayer(PluginCall call) {
        PlayGames.getPlayersClient(getActivity())
            .getCurrentPlayer()
            .addOnCompleteListener(task -> {
                JSObject r = new JSObject();
                r.put("signedIn", true);
                Player p = task.isSuccessful() ? task.getResult() : null;
                if (p != null) {
                    r.put("playerId", p.getPlayerId());
                    r.put("displayName", p.getDisplayName());
                }
                call.resolve(r);
            });
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        String id = call.getString("leaderboardId");
        Integer score = call.getInt("score");
        if (id == null || score == null) {
            call.reject("leaderboardId and score are required");
            return;
        }
        PlayGames.getLeaderboardsClient(getActivity())
            .submitScoreImmediate(id, score)
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) call.resolve();
                else call.reject(task.getException() != null ? task.getException().getMessage() : "submit failed");
            });
    }

    @PluginMethod
    public void loadScores(PluginCall call) {
        String id = call.getString("leaderboardId");
        if (id == null) {
            call.reject("leaderboardId is required");
            return;
        }
        int span = "weekly".equals(call.getString("span"))
            ? LeaderboardVariant.TIME_SPAN_WEEKLY
            : LeaderboardVariant.TIME_SPAN_ALL_TIME;
        int limit = Math.max(1, Math.min(25, call.getInt("limit", 10)));
        LeaderboardsClient client = PlayGames.getLeaderboardsClient(getActivity());
        client
            .loadTopScores(id, span, LeaderboardVariant.COLLECTION_PUBLIC, limit, true)
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    call.reject(task.getException() != null ? task.getException().getMessage() : "load failed");
                    return;
                }
                JSArray entries = new JSArray();
                AnnotatedData<LeaderboardsClient.LeaderboardScores> data = task.getResult();
                LeaderboardsClient.LeaderboardScores scores = data != null ? data.get() : null;
                if (scores != null) {
                    LeaderboardScoreBuffer buf = scores.getScores();
                    for (LeaderboardScore s : buf) entries.put(entry(s));
                    buf.release();
                    scores.release();
                }
                client
                    .loadCurrentPlayerLeaderboardScore(id, span, LeaderboardVariant.COLLECTION_PUBLIC)
                    .addOnCompleteListener(mine -> {
                        JSObject r = new JSObject();
                        r.put("entries", entries);
                        LeaderboardScore me = mine.isSuccessful() && mine.getResult() != null ? mine.getResult().get() : null;
                        if (me != null) r.put("player", entry(me));
                        call.resolve(r);
                    });
            });
    }

    private JSObject entry(LeaderboardScore s) {
        JSObject e = new JSObject();
        e.put("rank", s.getRank());
        e.put("score", s.getRawScore());
        e.put("name", s.getScoreHolderDisplayName());
        Player holder = s.getScoreHolder();
        e.put("playerId", holder != null ? holder.getPlayerId() : "");
        return e;
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        String id = call.getString("leaderboardId");
        if (id == null) {
            call.reject("leaderboardId is required");
            return;
        }
        PlayGames.getLeaderboardsClient(getActivity())
            .getLeaderboardIntent(id)
            .addOnSuccessListener(intent -> startActivityForResult(call, intent, "onLeaderboardClosed"))
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }

    @ActivityCallback
    private void onLeaderboardClosed(PluginCall call, ActivityResult result) {
        if (call != null) call.resolve();
    }
}
