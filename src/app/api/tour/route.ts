import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";

const ALLOWED_ENDPOINTS = new Set([
  "locationBasedList2",
  "areaBasedList2",
  "areaCode2",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint 파라미터가 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: "허용되지 않은 엔드포인트입니다." }, { status: 400 });
  }

  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const params = new URLSearchParams({
    MobileOS: "ETC",
    MobileApp: "MatjipRoulette",
    _type: "json",
    numOfRows: "8",
    pageNo: "1",
    contentTypeId: "39",
  });

  for (const [key, value] of searchParams.entries()) {
    if (key !== "endpoint") {
      params.set(key, value);
    }
  }

  const url = `${BASE_URL}/${endpoint}?serviceKey=${apiKey}&${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return NextResponse.json({ error: `API 오류: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "요청 시간이 초과되었습니다." }, { status: 504 });
    }
    return NextResponse.json({ error: `요청 실패: ${String(err)}` }, { status: 500 });
  }
}
