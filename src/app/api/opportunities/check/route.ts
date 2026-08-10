import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// POST /api/opportunities/check - Run the python browser crawler manually in the background
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profile = searchParams.get('profile') || 'all'; // 'all', 'user', 'friend'

    const scriptPath = path.join(process.cwd(), 'agent', 'browser_worker.py');
    const venvPythonPath = path.join(process.cwd(), 'agent', '.venv', 'Scripts', 'python.exe');

    console.log(`[Next.js] Starting python crawler in background: ${venvPythonPath} ${scriptPath} --profile ${profile}`);

    // Spawn the python process in the background and inherit stdio so we see logs in the server console
    const child = spawn(venvPythonPath, [scriptPath, '--profile', profile], {
      stdio: 'inherit',
      detached: true,
    });

    // Unreference the child process to allow Node to return the response immediately
    child.unref();

    return NextResponse.json({
      message: 'Discovery scan started in the background.',
      summary: {
        totalChecked: profile === 'all' ? 13 : (profile === 'user' ? 8 : 5),
        status: 'running',
      },
    });
  } catch (err: any) {
    console.error('Error starting automated check:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

