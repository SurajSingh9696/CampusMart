import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { MediaAsset } from "@/models/MediaAsset";
import { WishlistItem } from "@/models/WishlistItem";
import { Notification } from "@/models/Notification";
import { SupportMessage } from "@/models/SupportMessage";
import { EventRegistration } from "@/models/EventRegistration";
import { Listing } from "@/models/Listing";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";
import { Order } from "@/models/Order";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("name email phone campus accountNumber idCardNumber notificationEmailOptIn profileImageId")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      campus: user.campus,
      accountNumber: user.accountNumber,
      idCardNumber: user.idCardNumber || "",
      notificationEmailOptIn: Boolean(user.notificationEmailOptIn),
      profileImageId: user.profileImageId ? user.profileImageId.toString() : "",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { name, phone, idCardNumber, notificationEmailOptIn, campus, profileImageId } = await req.json();

  const existingUser = await User.findById(session.user.id).select("profileImageId").lean();
  if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const previousProfileImageId = existingUser.profileImageId?.toString() || "";

  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (typeof name === "string") {
    const trimmedName = name.trim();
    if (trimmedName) set.name = trimmedName;
  }
  if (typeof campus === "string") {
    const trimmedCampus = campus.trim();
    if (trimmedCampus) {
      set.campus = trimmedCampus;
    } else {
      return NextResponse.json({ error: "Campus is required" }, { status: 400 });
    }
  }
  if (phone !== undefined) set.phone = typeof phone === "string" ? phone.trim() : "";
  if (idCardNumber !== undefined) {
    set.idCardNumber = typeof idCardNumber === "string" ? idCardNumber.trim() : "";
  }
  if (notificationEmailOptIn !== undefined) {
    set.notificationEmailOptIn = Boolean(notificationEmailOptIn);
  }
  if (profileImageId !== undefined) {
    if (profileImageId === "" || profileImageId === null) {
      unset.profileImageId = 1;
    } else if (typeof profileImageId === "string" && Types.ObjectId.isValid(profileImageId)) {
      set.profileImageId = new Types.ObjectId(profileImageId);
    } else {
      return NextResponse.json({ error: "Invalid profile image id" }, { status: 400 });
    }
  }

  const updateDoc: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) updateDoc.$set = set;
  if (Object.keys(unset).length > 0) updateDoc.$unset = unset;

  if (Object.keys(updateDoc).length === 0) {
    return NextResponse.json({ error: "No profile changes provided" }, { status: 400 });
  }

  const user = await User.findByIdAndUpdate(session.user.id, updateDoc, { new: true, runValidators: true });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const nextProfileImageId = user.profileImageId?.toString() || "";
  if (previousProfileImageId && previousProfileImageId !== nextProfileImageId) {
    await MediaAsset.findByIdAndDelete(previousProfileImageId);
  }

  return NextResponse.json({
    success: true,
    profile: {
      name: user.name,
      campus: user.campus,
      phone: user.phone || "",
      idCardNumber: user.idCardNumber || "",
      notificationEmailOptIn: Boolean(user.notificationEmailOptIn),
      profileImageId: nextProfileImageId,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const confirmationText = typeof body.confirmationText === "string" ? body.confirmationText.trim().toUpperCase() : "";
  const acknowledge = body.acknowledge === true;

  if (!currentPassword) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }
  if (!acknowledge || confirmationText !== "DELETE") {
    return NextResponse.json({ error: "Double confirmation required" }, { status: 400 });
  }

  const user = await User.findById(session.user.id)
    .select("_id role passwordHash profileImageId")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "admin") {
    return NextResponse.json({ error: "Admin account deletion is not supported here" }, { status: 403 });
  }

  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const userId = user._id;
  const cleanup: Promise<unknown>[] = [
    WishlistItem.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    SupportMessage.deleteMany({ userId }),
    EventRegistration.deleteMany({ customerId: userId }),
    Order.deleteMany({ buyerId: userId }),
  ];

  if (user.role === "seller") {
    cleanup.push(
      Listing.deleteMany({ sellerId: userId }),
      Product.deleteMany({ sellerId: userId }),
      Project.deleteMany({ sellerId: userId }),
      Note.deleteMany({ sellerId: userId }),
      Event.deleteMany({ sellerId: userId }),
      Order.deleteMany({ sellerId: userId })
    );
  }

  if (user.profileImageId) {
    cleanup.push(MediaAsset.findByIdAndDelete(user.profileImageId));
  }

  await Promise.all(cleanup);
  await User.findByIdAndDelete(userId);

  return NextResponse.json({ success: true });
}
