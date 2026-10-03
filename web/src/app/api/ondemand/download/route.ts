import { NextRequest, NextResponse } from "next/server";
import { requestOnDemandDownload, getOnDemandItem } from "@/lib/onDemandStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, media_type, year, poster, backdrop, plot_overview, season, episode, quality } = body;

    if (!id || !title) {
      return NextResponse.json({ success: false, error: "Missing title or ID" }, { status: 400 });
    }

    const item = requestOnDemandDownload({
      id: String(id),
      title: String(title),
      media_type: media_type === "tv" ? "tv" : "movie",
      year: year ? Number(year) : undefined,
      poster,
      backdrop,
      plot_overview,
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
      quality,
    });

    return NextResponse.json({
      success: true,
      message: `On-demand download for '${title}' initiated into Google Drive.`,
      item,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const s = searchParams.get("s") ? parseInt(searchParams.get("s")!, 10) : undefined;
  const e = searchParams.get("e") ? parseInt(searchParams.get("e")!, 10) : undefined;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
  }

  const item = getOnDemandItem(id, s, e);
  return NextResponse.json({
    success: true,
    item: item || null,
  });
}
