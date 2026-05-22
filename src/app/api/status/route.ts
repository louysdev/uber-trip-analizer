import { NextResponse } from 'next/server';
import { isBraveReady, launchBrave, checkStatus } from '@/lib/brave';

export async function GET() {
  try {
    // Auto-launch Brave if not ready
    if (!(await isBraveReady())) {
      const launched = await launchBrave();
      if (!launched) {
        return NextResponse.json(
          { status: 'error', message: 'No se pudo iniciar Brave. Asegurate de que esté instalado en la ruta por defecto.' },
          { status: 503 }
        );
      }
    }

    const result = await checkStatus();
    return NextResponse.json({ ...result, brave_launched: true });
  } catch (err: any) {
    console.error('Status check error:', err.message);
    return NextResponse.json(
      { status: 'error', message: err.message.includes('ECONNREFUSED')
        ? 'Brave no está corriendo con CDP. Intentando lanzar automáticamente...'
        : err.message },
      { status: 503 }
    );
  }
}
