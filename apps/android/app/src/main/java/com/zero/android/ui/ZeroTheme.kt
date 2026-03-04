package com.zero.android.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF2563EB), // Official Tahoe Blue - WCAG AA Safe
    onPrimary = Color.White,
    background = Color(0xFF050505), // Absolute Deep Black
    onBackground = Color(0xFFF8FAFC),
    surface = Color(0xFF0A0A0B), // Tahoe Dark Surface
    onSurface = Color(0xFFF8FAFC),
    surfaceVariant = Color(0xFF121214),
    onSurfaceVariant = Color(0xFFA1B5D1), // High Contrast Muted
    outline = Color(0xFF3F3F46),
    outlineVariant = Color(0xFF202023), // Deeper Dividers
    surfaceContainerLow = Color(0xFF0F0F11),
    surfaceContainerHigh = Color(0xFF18181B)
)

@Composable
fun ZeroTheme(content: @Composable () -> Unit) {
  MaterialTheme(
      colorScheme = DarkColorScheme, 
      content = content
  )
}

@Composable
fun overlayContainerColor(): Color {
  // Forced dark mode unifies to surfaceContainerLow (subtle elevation over deep black)
  return MaterialTheme.colorScheme.surfaceContainerLow
}

@Composable
fun overlayIconColor(): Color {
  return MaterialTheme.colorScheme.onSurfaceVariant
}
