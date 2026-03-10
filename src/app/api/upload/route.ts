import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { getErrorMessage } from '@/lib/validation';
import { requireAdmin } from '@/lib/auth/authorize';

const uploadTypeSchema = z
  .enum(['player', 'team', 'banner', 'logo'])
  .or(z.string().min(1));

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const typeEntry = formData.get('type') ?? 'player';

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const typeParsed = uploadTypeSchema.safeParse(String(typeEntry));
    if (!typeParsed.success) {
      return NextResponse.json(
        { error: 'Invalid upload type', details: typeParsed.error.flatten() },
        { status: 400 }
      );
    }

    const file = fileEntry;
    const type = typeParsed.data;

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${type}-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
