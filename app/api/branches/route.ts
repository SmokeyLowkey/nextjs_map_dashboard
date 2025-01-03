import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';

// GET all branches
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get role from public metadata
    let role = user.publicMetadata?.role as string;

    // If no role is set, default to demo
    if (!role) {
      role = 'demo';
    }

    // First test database connection
    await prisma.$connect();
    
    const branches = await prisma.branch.findMany({
      include: {
        departments: {
          include: {
            contacts: true
          }
        }
      }
    });

    // Parse JSON notes
    branches.forEach(branch => {
      branch.departments.forEach(dept => {
        // Parse department notes
        if (dept.notes) {
          try {
            dept.notes = typeof dept.notes === 'string' 
              ? JSON.parse(dept.notes) 
              : dept.notes;
          } catch (e) {
            console.error('Error parsing department notes:', e);
            dept.notes = {};
          }
        }

        // Parse contact notes
        dept.contacts.forEach(contact => {
          if (contact.notes) {
            try {
              contact.notes = typeof contact.notes === 'string'
                ? JSON.parse(contact.notes)
                : contact.notes;
            } catch (e) {
              console.error('Error parsing contact notes:', e);
              contact.notes = {};
            }
          }
        });
      });
    });

    // If user has demo role, mask sensitive information
    if (role === 'demo') {
      branches.forEach(branch => {
        // Mask branch phone numbers
        branch.phone = branch.phone ? '***-***-****' : null;
        branch.fax = branch.fax ? '***-***-****' : null;
        branch.toll = branch.toll ? '***-***-****' : null;
        branch.itPhone = branch.itPhone ? '***-***-****' : null;

        // Mask department contacts and notes
        branch.departments.forEach(dept => {
          // Censor department notes
          if (dept.notes) {
            dept.notes = { content: '[Content hidden for demo users]' };
          }
          
          dept.contacts.forEach(contact => {
            contact.email = contact.email ? '****@****.***' : null;
            contact.phone = contact.phone ? '***-***-****' : null;
            // Censor contact notes
            if (contact.notes) {
              contact.notes = { content: '[Content hidden for demo users]' };
            }
          });
        });
      });
    }

    // Return the response with explicit headers
    return new NextResponse(
      JSON.stringify(branches),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('Error in GET /api/branches:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST new branch
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get role from public metadata
    const role = user.publicMetadata?.role as string;

    // Check permissions
    if (!role || ['employee', 'demo'].includes(role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await req.json();
    
    // Ensure coordinates are numbers
    const latitude = typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude;
    const longitude = typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude;

    const branch = await prisma.branch.create({
      data: {
        branchId: data.branchId,
        branchName: data.branchName,
        latitude,
        longitude,
        address: data.address,
        phone: data.phone,
        fax: data.fax,
        toll: data.toll,
        itPhone: data.itPhone,
        timezone: data.timezone || 'America/Toronto',
        departments: {
          create: data.departments.map((dept: any) => ({
            name: dept.name,
            notes: dept.notes ? { content: dept.notes.content || '' } : { content: '' },
            mondayHours: dept.mondayHours,
            tuesdayHours: dept.tuesdayHours,
            wednesdayHours: dept.wednesdayHours,
            thursdayHours: dept.thursdayHours,
            fridayHours: dept.fridayHours,
            saturdayHours: dept.saturdayHours,
            sundayHours: dept.sundayHours,
            contacts: {
              create: dept.contacts.map((contact: any) => ({
                jobTitle: contact.jobTitle,
                phone: contact.phone,
                email: contact.email,
                name: contact.name,
                notes: contact.notes ? { content: contact.notes.content || '' } : { content: '' }
              }))
            }
          }))
        }
      },
      include: {
        departments: {
          include: {
            contacts: true
          }
        }
      }
    });

    return new NextResponse(
      JSON.stringify(branch),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in POST /api/branches:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
