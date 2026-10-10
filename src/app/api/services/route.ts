import { NextResponse } from "next/server";
import { getServices } from "@/lib/api";

export async function GET() {
  try {
    const services = await getServices();
    return NextResponse.json({ success: true, count: services.length, data: services });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
