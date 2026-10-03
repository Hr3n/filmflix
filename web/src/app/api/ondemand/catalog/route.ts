import { NextResponse } from "next/server";
import { getAllOnDemandItems, getGoogleDriveConfig } from "@/lib/onDemandStore";

export async function GET() {
  const items = getAllOnDemandItems();
  const config = getGoogleDriveConfig();

  return NextResponse.json({
    success: true,
    items,
    config,
  });
}
