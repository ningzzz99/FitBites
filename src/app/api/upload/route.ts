import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 400 });

    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `${userId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (e) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
