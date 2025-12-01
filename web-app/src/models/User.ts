import { Schema, model, models } from "mongoose";

// Resume schema for customized resumes
const ResumeSchema = new Schema({
  company: {
    type: String,
    required: [true, "Company name is required"],
    trim: true,
  },
  jobTitle: {
    type: String,
    required: [true, "Job title is required"],
    trim: true,
  },
  jobDescription: {
    type: String,
    required: [true, "Job description is required"],
    trim: true,
  },
  resume: {
    type: String, // LaTeX format resume content
    required: [true, "Resume content is required"],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Main user schema
const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    masterResume: {
      type: String,
      trim: true,
    },
    resumes: [ResumeSchema], // Array of custom resumes
  },
  {
    timestamps: true,
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const User = (models.User as any) || model("User", UserSchema);

export default User;
