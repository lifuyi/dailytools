import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
  }

  try {
    const apiUrl = `https://image.baidu.com/search/acjson?tn=resultjson_com&logid=&ipn=rj&ct=201326592&is=&fp=result&fr=&word=${encodeURIComponent(keyword)}&queryWord=${encodeURIComponent(keyword)}&cl=2&lm=-1&ie=utf-8&oe=utf-8&adpicid=&st=-1&z=&ic=0&hd=&latest=&copyright=&s=&se=&tab=&width=&height=&face=0&istype=0&qc=&nc=1&expermode=&nojc=&isAsync=&pn=30&rn=30&gsm=1e&1639479066986=`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from Baidu');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search images' }, { status: 500 });
  }
}