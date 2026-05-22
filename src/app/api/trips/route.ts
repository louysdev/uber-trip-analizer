import { NextRequest, NextResponse } from 'next/server';
import { searchTrips } from '@/lib/brave';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Se requieren los campos "from" y "to" (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const result = await searchTrips(from, to);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Trips search error:', err.message);

    if (err.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'No se pudo conectar a Brave. Asegurate de que esté corriendo con --remote-debugging-port=9222', detail: err.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Error al buscar viajes', detail: err.message },
      { status: 500 }
    );
  }
}
