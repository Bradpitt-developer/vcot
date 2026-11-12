import { Platform } from "react-native";
import * as MailComposer from "expo-mail-composer";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { WorkEntry } from "../types";
import {
  reportDepartmentLabel,
  reportFileName,
  reportSummary,
  workEntriesToCsv,
  type ReportDepartment,
  type ReportDay,
} from "../utils/report";

export type ReportAction = "whatsapp" | "email" | "download";

export type ReportDelivery = {
  day: ReportDay;
  department: ReportDepartment;
  entries: WorkEntry[];
};

function reportText(delivery: ReportDelivery) {
  const label = reportDepartmentLabel(delivery.department);
  const summary = reportSummary(delivery.entries);

  return [
    "Silai Saathi production report",
    `Date: ${delivery.day.dateLabel}`,
    `Section: ${label}`,
    `Entries: ${summary.entries}`,
    `Pieces: ${summary.pieces}`,
  ].join("\n");
}

function webDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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
  filename: string,
  csv: string,
  text: string,
): Promise<string> {
  const browserFile = new File([csv], filename, {
    type: "text/csv;charset=utf-8",
  });

  if (action !== "download" && canShareWebFile(browserFile)) {
    await navigator.share({
      files: [browserFile],
      title: `Silai Saathi report ${filename}`,
      text,
    });
    return `Report shared with ${action === "whatsapp" ? "WhatsApp or your chosen app" : "email or your chosen app"}.`;
  }

  webDownload(filename, csv);

  if (action === "whatsapp") {
    const message = `${text}\n\nThe CSV report has been downloaded. Attach it to this WhatsApp message.`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return "CSV downloaded. Attach it in WhatsApp.";
  }

  if (action === "email") {
    const subject = `Silai Saathi report | ${text.split("\n")[1]?.replace(/^Date:\s*/, "") || "Production"}`;
    const body = `${text}\n\nThe CSV report has been downloaded. Attach it to this email.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return "CSV downloaded. Attach it in your email app.";
  }

  return "CSV downloaded.";
}

async function createCacheCsvFile(filename: string, csv: string): Promise<string> {
  if (!FileSystem.cacheDirectory) {
    throw new Error("The app could not create a temporary file for the report.");
  }

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: "utf8" });
  return fileUri;
}

async function downloadAndroidCsv(filename: string, csv: string): Promise<string> {
  const saf = FileSystem.StorageAccessFramework;
  const initialUri = saf.getUriForDirectoryInRoot("Download");
  const permission = await saf.requestDirectoryPermissionsAsync(initialUri);

  if (!permission.granted) {
    throw new Error("Choose the Downloads folder to save the CSV report.");
  }

  const fileNameWithoutExtension = filename.replace(/\.csv$/i, "");
  const fileUri = await saf.createFileAsync(
    permission.directoryUri,
    fileNameWithoutExtension,
    "text/csv",
  );
  await saf.writeAsStringAsync(fileUri, csv, { encoding: "utf8" });

  return "CSV saved to the selected folder.";
}

export async function deliverReport(
  action: ReportAction,
  delivery: ReportDelivery,
): Promise<string> {
  const csv = workEntriesToCsv(delivery.entries);
  const filename = reportFileName(delivery.day, delivery.department);
  const text = reportText(delivery);

  if (Platform.OS === "web") {
    return deliverWebReport(action, filename, csv, text);
  }

  if (action === "download" && Platform.OS === "android") {
    return downloadAndroidCsv(filename, csv);
  }

  const fileUri = await createCacheCsvFile(filename, csv);

  if (action === "whatsapp") {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
      dialogTitle: "Send CSV report on WhatsApp",
    });
    return "Choose WhatsApp to attach and send the CSV report.";
  }

  if (action === "email") {
    if (await MailComposer.isAvailableAsync()) {
      const result = await MailComposer.composeAsync({
        subject: `Silai Saathi report | ${delivery.day.dateLabel}`,
        body: text,
        attachments: [fileUri],
      });

      return result.status === "cancelled"
        ? "Email draft cancelled."
        : "Email draft opened with the CSV attached.";
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("No email app or sharing option is available on this device.");
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
      dialogTitle: "Send CSV report by email",
    });
    return "Choose your email app to attach and send the CSV report.";
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Save CSV report",
  });
  return "Choose Save to Files or another app to keep the CSV report.";
}
