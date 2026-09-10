package com.a9inedev.sushijam;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GameServicesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
