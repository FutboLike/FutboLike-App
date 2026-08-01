package com.futbolike.tv;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "NotificationTopics")
public class NotificationTopicsPlugin extends Plugin {
  @PluginMethod
  public void subscribe(PluginCall call) {
    String rawTopic = call.getString("topic", "futbolike");
    String topic = rawTopic == null ? "futbolike" : rawTopic.trim();
    if (!topic.matches("[a-zA-Z0-9-_.~%]+")) {
      call.reject("El nombre del tema de notificaciones no es válido.");
      return;
    }

    FirebaseMessaging.getInstance().subscribeToTopic(topic).addOnCompleteListener(task -> {
      if (!task.isSuccessful()) {
        call.reject("No fue posible activar las notificaciones.", task.getException());
        return;
      }
      JSObject result = new JSObject();
      result.put("topic", topic);
      call.resolve(result);
    });
  }
}
