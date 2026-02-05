package com.zero.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class ZeroProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", ZeroCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", ZeroCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", ZeroCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", ZeroCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", ZeroCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", ZeroCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", ZeroCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", ZeroCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", ZeroCapability.Canvas.rawValue)
    assertEquals("camera", ZeroCapability.Camera.rawValue)
    assertEquals("screen", ZeroCapability.Screen.rawValue)
    assertEquals("voiceWake", ZeroCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", ZeroScreenCommand.Record.rawValue)
  }
}
