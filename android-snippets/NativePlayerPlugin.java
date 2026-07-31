package com.futbolike.tv;

import android.graphics.Color;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {
  private ExoPlayer player;
  private PlayerView playerView;

  @PluginMethod
  public void play(PluginCall call) {
    String url = call.getString("url", "").trim();
    String streamType = call.getString("streamType", "").trim().toLowerCase();
    if (url.isEmpty()) {
      call.reject("La URL del canal está vacía.");
      return;
    }

    getActivity().runOnUiThread(() -> {
      ensurePlayer();

      MediaItem.Builder item = new MediaItem.Builder().setUri(url);
      if (streamType.equals("m3u8") || url.toLowerCase().contains(".m3u8")) {
        item.setMimeType(MimeTypes.APPLICATION_M3U8);
      }

      player.setMediaItem(item.build());
      player.prepare();
      player.play();
      playerView.setVisibility(PlayerView.VISIBLE);
      playerView.bringToFront();
      call.resolve();
    });
  }

  @PluginMethod
  public void stop(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (player != null) player.stop();
      if (playerView != null) playerView.setVisibility(PlayerView.GONE);
      call.resolve();
    });
  }

  private void ensurePlayer() {
    if (player != null) return;

    playerView = new PlayerView(getContext());
    playerView.setBackgroundColor(Color.BLACK);
    playerView.setUseController(true);
    playerView.setKeepScreenOn(true);
    playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS);

    FrameLayout root = getActivity().findViewById(android.R.id.content);
    root.addView(playerView, new FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    ));

    player = new ExoPlayer.Builder(getContext()).build();
    playerView.setPlayer(player);
    player.addListener(new Player.Listener() {
      @Override
      public void onPlayerError(@NonNull PlaybackException error) {
        JSObject data = new JSObject();
        data.put("message", error.getErrorCodeName());
        notifyListeners("playerError", data);
      }
    });
  }

  @Override
  protected void handleOnDestroy() {
    if (player != null) {
      player.release();
      player = null;
    }
    playerView = null;
    super.handleOnDestroy();
  }
}
