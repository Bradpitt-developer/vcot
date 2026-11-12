import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Shows a confirmation dialog on native and the browser on web.
 * React Native Web does not implement Alert.alert, so using it directly
 * makes confirmation buttons do nothing in the web preview.
 */
export function confirmAction({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    const browserConfirm = (
      globalThis as { confirm?: (text: string) => boolean }
    ).confirm;

    if (!browserConfirm) return Promise.resolve(false);
    return Promise.resolve(browserConfirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelLabel,
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
