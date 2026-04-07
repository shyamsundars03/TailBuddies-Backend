import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../enums/user-role.enum';
import { Gender } from '../enums/gender.enum';

export interface IUser extends Document {
  username: string;
  email: string;
  phone?: string;
  password?: string;
  gender?: Gender;
  role: UserRole;
  profilePic?: string;
  googleId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isBlocked: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: false,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number'],
    },
    password: {
      type: String,
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.OWNER,
    },
    profilePic: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    pincode: {
      type: String,
      default: '',
      match: [/^\d{6}$/, "Pincode must be exactly 6 digits"],
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      transform: function (doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: unknown) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.post('init', function (doc) {
  // Handle legacy userName field by mapping it to username
  if ((doc as any).userName && !doc.username) {
    doc.username = (doc as any).userName;
  }
});

export const User = mongoose.model<IUser>('User', userSchema);
export default User;