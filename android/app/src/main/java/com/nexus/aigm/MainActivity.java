package com.nexus.aigm;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SaveFilePlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        installRenderProcessGoneHandler();
    }

    /**
     * The on-device embedding model (especially the 768-dim "high" model) keeps the
     * WebView under heavy memory pressure. When Android reclaims or crashes the
     * WebView renderer process, the default BridgeActivity has no handler, so the
     * renderer death escalates into a full app crash (crashpad:
     * "Render process's crash wasn't handled by all associated webviews").
     *
     * Override onRenderProcessGone to recover instead: campaign state is persisted
     * in IndexedDB, so recreating the activity rebuilds a fresh WebView/renderer and
     * the app resumes where it left off rather than crashing to the launcher.
     */
    private void installRenderProcessGoneHandler() {
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }
        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                boolean didCrash = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && detail.didCrash();
                Log.e(TAG, "WebView renderer gone (didCrash=" + didCrash
                        + ", reclaimed for memory=" + (!didCrash) + "); recovering by recreating activity.");
                // We must not touch `view` again after returning true. Rebuild the
                // activity (and with it a fresh WebView) so the app survives.
                if (!isFinishing()) {
                    recreate();
                }
                return true;
            }
        });
    }
}
