import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

// GET single branch
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Log the role check
    console.log('API Auth Check:', {
      userId: user.id,
      role: role || 'undefined',
      publicMetadata: user.publicMetadata,
      timestamp: new Date().toISOString()
    });

    // If no role is set, default to demo
    if (!role) {
      role = 'demo';
    }

    const branch = await prisma.branch.findUnique({
      where: {
        id: params.id,
      },
      include: {
        departments: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!branch) {
      return new NextResponse(
        JSON.stringify({ error: 'Branch not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If user has demo role, mask sensitive information
    if (role === 'demo') {
      // Mask branch phone numbers
      branch.phone = branch.phone ? '***-***-****' : null;
      branch.fax = branch.fax ? '***-***-****' : null;
      branch.toll = branch.toll ? '***-***-****' : null;
      branch.itPhone = branch.itPhone ? '***-***-****' : null;

      // Mask department contacts
      branch.departments.forEach(dept => {
        dept.contacts.forEach(contact => {
          contact.email = contact.email ? '****@****.***' : null;
          contact.phone = contact.phone ? '***-***-****' : null;
        });
      });
    }

    return new NextResponse(
      JSON.stringify(branch),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching branch:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error fetching branch',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PUT update branch
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    console.log('Role check:', {
      userId: user.id,
      role: role || 'undefined',
      publicMetadata: user.publicMetadata,
      timestamp: new Date().toISOString()
    });

    // If no role is set, default to demo
    if (!role) {
      role = 'demo';
    }

    // Demo users cannot modify branches
    if (['employee', 'demo'].includes(role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await request.json();
    
    // Ensure coordinates are numbers
    const latitude = typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude;
    const longitude = typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude;

    // Delete existing departments and contacts
    await prisma.contact.deleteMany({
      where: {
        department: {
          branchId: params.id
        }
      }
    });

    await prisma.department.deleteMany({
      where: {
        branchId: params.id
      }
    });

    // Update branch with new data
    const branch = await prisma.branch.update({
      where: {
        id: params.id,
      },
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
            notes: dept.notes,
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
                name: contact.name
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
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating branch:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error updating branch',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// DELETE branch
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    console.log('Role check:', {
      userId: user.id,
      role: role || 'undefined',
      publicMetadata: user.publicMetadata,
      timestamp: new Date().toISOString()
    });

    // If no role is set, default to demo
    if (!role) {
      role = 'demo';
    }

    // Demo users cannot delete branches
    if (['employee', 'demo'].includes(role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete branch (this will cascade delete departments and contacts)
    await prisma.branch.delete({
      where: {
        id: params.id,
      },
    });

    return new NextResponse(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting branch:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error deleting branch',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
