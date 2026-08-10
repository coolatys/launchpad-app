import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/sources - Get list of saved searches
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sources: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/sources - Create a new search config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kind, provider, query, location, active } = body;

    if (!kind || !provider || !query) {
      return NextResponse.json({ error: 'Missing required fields (kind, provider, query)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('sources')
      .insert([{
        kind,
        provider,
        query,
        location: location || '',
        active: active !== undefined ? active : true,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ source: data, message: 'Search source added successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/sources - Update a source (e.g. toggle active state)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, active, query, location, provider, kind } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing source ID' }, { status: 400 });
    }

    const updateFields: any = {};
    if (active !== undefined) updateFields.active = active;
    if (query !== undefined) updateFields.query = query;
    if (location !== undefined) updateFields.location = location;
    if (provider !== undefined) updateFields.provider = provider;
    if (kind !== undefined) updateFields.kind = kind;

    const { data, error } = await supabaseAdmin
      .from('sources')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ source: data, message: 'Source updated successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/sources - Delete a search source
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing source ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('sources')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Source deleted successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
