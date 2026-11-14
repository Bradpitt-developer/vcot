import { Platform } from "react-native";
import * as MailComposer from "expo-mail-composer";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type ReportAction = "whatsapp" | "email" | "download";

export type ReportFile = {
  filename: string;
  contentType: string;
  base64: string;
};

export type GeneratedReport = {
  file: ReportFile;
  subjectText: string;
  bodyText: string;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function webDownload(filename: string, contentType: string, base64: string) {
  const blob = new Blob([base64ToArrayBuffer(base64)], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function canShareWebFile(file: File): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

async function deliverWebReport(
  action: ReportAction,
  report: GeneratedReport,
): Promise<string> {
  const browserFile = new File(
    [base64ToArrayBuffer(report.file.base64)],
    report.file.filename,
    { type: report.file.contentType },
  );

  if (action !== "download" && canShareWebFile(browserFile)) {
    await navigator.share({
      files: [browserFile],
      title: report.subjectText,
      text: report.bodyText,
    });
    return "Report shared from your browser.";
  }

  webDownload(report.file.filename, report.file.contentType, report.file.base64);

  if (action === "whatsapp") {
    const message = `${report.bodyText}\n\nThe report has been downloaded. Attach it to this WhatsApp message.`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return "Excel report downloaded. Attach it in WhatsApp.";
  }

  if (action === "email") {
    const body = `${report.bodyText}\n\nThe report has been downloaded. Attach it to this email.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(report.subjectText)}&body=${encodeURIComponent(body)}`;
    return "Excel report downloaded. Attach it in your email app.";
  }

  return "Excel report downloaded.";
}

async function createCacheFile(filename: string, base64: string): Promise<string> {
  if (!FileSystem.cacheDirectory) {
    throw new Error("The app could not create a temporary file for the report.");
  }

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: "base64" });
  return fileUri;
}

async function downloadAndroidFile(report: GeneratedReport): Promise<string> {
  const saf = FileSystem.StorageAccessFramework;
  const initialUri = saf.getUriForDirectoryInRoot("Download");
  const permission = await saf.requestDirectoryPermissionsAsync(initialUri);

  if (!permission.granted) {
    throw new Error("Choose the Downloads folder to save the report.");
  }

  const baseName = report.file.filename.replace(/\.xlsx?$/i, "");
  const contentType = report.file.contentType;
  const fileUri = await saf.createFileAsync(
    permission.directoryUri,
    baseName,
    contentType,
  );
  await saf.writeAsStringAsync(fileUri, report.file.base64, {
    encoding: "base64",
  });

  return "Excel report saved to the selected folder.";
}

export async function deliverReport(
  action: ReportAction,
  report: GeneratedReport,
): Promise<string> {
  if (Platform.OS === "web") {
    return deliverWebReport(action, report);
  }

  if (action === "download" && Platform.OS === "android") {
    return downloadAndroidFile(report);
  }

  const fileUri = await createCacheFile(
    report.file.filename,
    report.file.base64,
  );
  const mimeType =
    report.file.contentType ||
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const uti = "org.openxmlformats.spreadsheetml.sheet";

  if (action === "whatsapp") {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }

    await Sharing.shareAsync(fileUri, {
      mimeType,
      UTI: uti,
      dialogTitle: "Send Excel report on WhatsApp",
    });
    return "Choose WhatsApp to attach and send the Excel report.";
  }

  if (action === "email") {
    if (await MailComposer.isAvailableAsync()) {
      const result = await MailComposer.composeAsync({
        subject: report.subjectText,
        body: report.bodyText,
        attachments: [fileUri],
      });

      return result.status === "cancelled"
        ? "Email draft cancelled."
        : "Email draft opened with the Excel report attached.";
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("No email app or sharing option is available on this device.");
    }

    await Sharing.shareAsync(fileUri, {
      mimeType,
      UTI: uti,
      dialogTitle: "Send Excel report by email",
    });
    return "Choose your email app to attach and send the Excel report.";
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    UTI: uti,
    dialogTitle: "Save Excel report",
  });
  return "Choose Save to Files or another app to keep the Excel report.";
}
