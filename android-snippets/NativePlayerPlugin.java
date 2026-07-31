package com.futbolike.tv;

import android.graphics.Color;
import android.net.Uri;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {
  private LibVLC libVLC;
  private MediaPlayer mediaPlayer;
  private VLCVideoLayout videoLayout;

  @PluginMethod
  public void play(PluginCall call) {
    String rawUrl = call.getString("url", "");
    String url = rawUrl == null ? "" : rawUrl.trim();
    if (url.isEmpty()) {
      call.reject("La URL del canal está vacía.");
      return;
    }

    getActivity().runOnUiThread(() -> {
      try {
        ensurePlayer();

        Media media = new Media(libVLC, Uri.parse(url));
        media.addOption(":network-caching=2000");
        media.addOption(":live-caching=2000");
        media.addOption(":http-reconnect");
        media.addOption(":http-user-agent=VLC/3.0.21 LibVLC/3.6.5");
        mediaPlayer.setMedia(media);
        media.release();

        videoLayout.setVisibility(VLCVideoLayout.VISIBLE);
        videoLayout.bringToFront();
        mediaPlayer.play();
        call.resolve();
      } catch (Exception error) {
        call.reject("libVLC no pudo iniciar la transmisión.", error);
      }
    });
  }

  @PluginMethod
  public void stop(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (mediaPlayer != null) mediaPlayer.stop();
      if (videoLayout != null) videoLayout.setVisibility(VLCVideoLayout.GONE);
      call.resolve();
    });
  }

  private void ensurePlayer() {
    if (mediaPlayer != null) return;

    ArrayList<String> options = new ArrayList<>();
    options.add("--network-caching=2000");
    options.add("--live-caching=2000");
    options.add("--http-reconnect");
    options.add("--clock-jitter=0");

    libVLC = new LibVLC(getContext(), options);
    mediaPlayer = new MediaPlayer(libVLC);

    videoLayout = new VLCVideoLayout(getContext());
    videoLayout.setBackgroundColor(Color.BLACK);
    videoLayout.setKeepScreenOn(true);

    FrameLayout root = getActivity().findViewById(android.R.id.content);
    root.addView(videoLayout, new FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    ));
    mediaPlayer.attachViews(videoLayout, null, false, false);

    mediaPlayer.setEventListener(event -> {
      if (event.type == MediaPlayer.Event.EncounteredError) {
        getActivity().runOnUiThread(() -> videoLayout.setVisibility(VLCVideoLayout.GONE));
        JSObject data = new JSObject();
        data.put("message", "VLC encontró un error al abrir o decodificar la señal");
        notifyListeners("playerError", data);
      }
    });
  }

  @Override
  protected void handleOnDestroy() {
    if (mediaPlayer != null) {
      mediaPlayer.stop();
      mediaPlayer.detachViews();
      mediaPlayer.release();
      mediaPlayer = null;
    }
    if (libVLC != null) {
      libVLC.release();
      libVLC = null;
    }
    videoLayout = null;
    super.handleOnDestroy();
  }
}
