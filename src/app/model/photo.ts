import mongoose, { Schema } from "mongoose";
import { Tags } from "exiftool-vendored";

export interface ImageAnalysisResult {
  dimensions: {
    width: number;
    height: number;
  };
  brightness: {
    average: number;
    min: number;
    max: number;
    histogram: number[];
    rgbHistograms: {
      red: number[];
      green: number[];
      blue: number[];
    };
  };
  toneAnalysis: {
    type: string;
    confidence: number;
    shadowRatio: number;
    midtoneRatio: number;
    highlightRatio: number;
    factors: string[];
    notation: string;
    zones: {
      low: number;
      mid: number;
      high: number;
    };
  };
}

export interface IPhoto {
  _id?: string;
  type?: "image" | "video";
  src: string;
  width: number;
  height: number;
  title: string;
  location: string;
  date: string;
  thumbnail?: string;
  duration?: number;
  exif?: Tags & {
    ExposureCompensation?: number;
  };
  imageAnalysis?: ImageAnalysisResult;
  createdAt?: string;
  updatedAt?: string;
}

const photoSchema = new Schema<IPhoto>(
  {
    type: { type: String, enum: ["image", "video"], default: "image" },
    src: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: String, required: true },
    thumbnail: { type: String },
    duration: { type: Number },
    exif: { type: Schema.Types.Mixed },
    imageAnalysis: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const Photo =
  (mongoose.models && mongoose.models.Photo) ||
  mongoose.model<IPhoto>("Photo", photoSchema);
