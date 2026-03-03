package com.zero.android.ui

import androidx.compose.runtime.Composable
import com.zero.android.MainViewModel
import com.zero.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
