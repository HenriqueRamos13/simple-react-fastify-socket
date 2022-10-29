import { Schema, Document, model, Model } from "mongoose";
export interface UserAttrs {
  title: string;
  content: string;
  category: string;
}

export interface UserModel extends Model<UserDocument> {
  addOne(doc: UserAttrs): UserDocument;
}
export interface UserDocument extends Document {
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}
export const userSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.statics.addOne = (doc: UserAttrs) => {
  return new User(doc);
};
export const User = model<UserDocument, UserModel>("User", userSchema);
