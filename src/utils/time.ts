import type { ExifDateTime } from "exiftool-vendored";

export const calculateDuration = (startDate: string, endDate: string | null) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffInMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const years = Math.floor(diffInMonths / 12);
  const months = diffInMonths % 12;
  return { years, months };
};

export const formatPhotoDateTime = (dateTime: ExifDateTime) => {
  if (!dateTime) return undefined;

  if (typeof dateTime === "object" && dateTime.year) {
    const { year, month, day, hour, minute, second, zoneName } = dateTime;
    const date = new Date(year, month - 1, day, hour, minute, second);

    const formatted = date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    return zoneName && zoneName !== "UTC" ? `${formatted} (${zoneName})` : formatted;
  }

  if (typeof dateTime === "string") {
    return new Date(dateTime).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  return undefined;
};
