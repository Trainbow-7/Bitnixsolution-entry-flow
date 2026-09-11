import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Bitnoxsolution VMS database...');

  // 1. Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.systemSettings.deleteMany();

  // 2. System Settings
  const settings = await prisma.systemSettings.create({
    data: {
      id: 'default',
      data_retention_months: 24,
      auto_archive_enabled: false,
      office_name: 'Bitnoxsolution Shared Office',
      tech_institute_name: 'Bitnox Technology Institute',
      dry_cleaning_name: 'Bitnox Premium Dry Cleaners',
    },
  });

  // 3. Staff Directory
  const staffCeo = await prisma.staff.create({
    data: {
      name: 'Engr Oluwafemi Faleye',
      department: 'Tech Institute',
      role_title: 'CEO & Managing Director',
    },
  });

  const staff1 = await prisma.staff.create({
    data: {
      name: 'Mr. Ben Sam',
      department: 'Tech Institute',
      role_title: 'AI/ML Instructor',
    },
  });

  const staffUsman = await prisma.staff.create({
    data: {
      name: 'Mr. Oyeboade Usman O.',
      department: 'Tech Institute',
      role_title: 'Data Analytics Instructor',
    },
  });

  const staff2 = await prisma.staff.create({
    data: {
      name: 'Sarah Jenkins',
      department: 'Tech Institute',
      role_title: 'Web Dev Instructor & Career Coach',
    },
  });

  const staff3 = await prisma.staff.create({
    data: {
      name: 'Marcus Brody',
      department: 'Tech Institute',
      role_title: 'Admissions & Enrollment Advisor',
    },
  });

  const staff4 = await prisma.staff.create({
    data: {
      name: 'Elena Gomez',
      department: 'Dry Cleaning',
      role_title: 'Head Garment Specialist & Quality Lead',
    },
  });

  const staff5 = await prisma.staff.create({
    data: {
      name: 'David Chen',
      department: 'Dry Cleaning',
      role_title: 'Operations & Laundry Facility Manager',
    },
  });

  // 4. Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);
  const recepHash = await bcrypt.hash('recep123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Engr Oluwafemi Faleye',
      email: 'admin@bitnox.com',
      password_hash: adminHash,
      role: 'Admin',
    },
  });

  const receptionistUser = await prisma.user.create({
    data: {
      name: 'Kikelomo Oluwanishola',
      email: 'receptionist@bitnox.com',
      password_hash: recepHash,
      role: 'Receptionist',
    },
  });

  const staffUser1 = await prisma.user.create({
    data: {
      name: 'Mr. Ben Sam',
      email: 'ben.sam@bitnox.com',
      password_hash: staffHash,
      role: 'Staff',
      linked_staff_id: staff1.id,
    },
  });

  const staffUserUsman = await prisma.user.create({
    data: {
      name: 'Mr. Oyeboade Usman O.',
      email: 'usman.oyeboade@bitnox.com',
      password_hash: staffHash,
      role: 'Staff',
      linked_staff_id: staffUsman.id,
    },
  });

  const staffUser2 = await prisma.user.create({
    data: {
      name: 'Elena Gomez',
      email: 'elena.gomez@bitnox.com',
      password_hash: staffHash,
      role: 'Staff',
      linked_staff_id: staff4.id,
    },
  });

  console.log('Created users and staff.');

  // 5. Visitors generator for realistic analytics (past 30 days)
  const now = new Date();
  const sampleVisitorsData = [];

  // Currently In Office (In Progress)
  sampleVisitorsData.push(
    {
      full_name: 'Jonathan Miller',
      phone_number: '+1 (555) 234-5678',
      email: 'j.miller@example.com',
      arrival_datetime: new Date(now.getTime() - 28 * 60 * 1000), // 28 mins ago
      purpose_of_visit: 'Prospective Student',
      department: 'Tech Institute',
      staff_to_see_id: staff3.id, // Marcus Brody
      services_requested: 'Full-Stack Software Bootcamp inquiry & syllabus review',
      expected_duration: '30-60 min',
      status: 'In Progress',
      remarks: 'Interested in Fall 2026 cohort. Brought academic transcripts.',
      created_by_user_id: receptionistUser.id,
    },
    {
      full_name: 'Sophia Williams',
      phone_number: '+1 (555) 345-6789',
      email: 'sophia.w@luxuryliving.com',
      arrival_datetime: new Date(now.getTime() - 14 * 60 * 1000), // 14 mins ago
      purpose_of_visit: 'Dry Cleaning Customer',
      department: 'Dry Cleaning',
      staff_to_see_id: staff4.id, // Elena Gomez
      services_requested: 'Express silk dress and wool coat dry cleaning',
      expected_duration: '<15 min',
      status: 'In Progress',
      remarks: 'Drop-off order: 2 silk evening gowns, delicate stain removal required.',
      created_by_user_id: receptionistUser.id,
    },
    {
      full_name: 'Carlos Mendez',
      phone_number: '+1 (555) 456-7890',
      email: 'cmendez@techventures.io',
      arrival_datetime: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
      purpose_of_visit: 'Business Partner',
      department: 'Tech Institute',
      staff_to_see_id: staffCeo.id, // Engr Oluwafemi Faleye (CEO)
      services_requested: 'Corporate internship partnership & executive discussion',
      expected_duration: '1hr+',
      status: 'In Progress',
      remarks: 'Quarterly hiring syndicate meeting in Executive Boardroom.',
      created_by_user_id: receptionistUser.id,
    }
  );

  // Completed today
  sampleVisitorsData.push(
    {
      full_name: 'Amanda Hayes',
      phone_number: '+1 (555) 567-8901',
      email: 'amanda.h@gmail.com',
      arrival_datetime: new Date(now.getTime() - 3 * 3600 * 1000),
      checkout_datetime: new Date(now.getTime() - 2 * 3600 * 1000 + 15 * 60 * 1000),
      purpose_of_visit: 'Existing Trainee',
      department: 'Tech Institute',
      staff_to_see_id: staff2.id, // Sarah Jenkins
      services_requested: 'Code review and capstone project milestone sign-off',
      expected_duration: '30-60 min',
      status: 'Completed',
      remarks: 'Successfully submitted portfolio project.',
      created_by_user_id: receptionistUser.id,
    },
    {
      full_name: 'Robert Fox',
      phone_number: '+1 (555) 678-9012',
      email: 'robert.fox@outlook.com',
      arrival_datetime: new Date(now.getTime() - 4 * 3600 * 1000),
      checkout_datetime: new Date(now.getTime() - 3 * 3600 * 1000 - 40 * 60 * 1000),
      purpose_of_visit: 'Dry Cleaning Customer',
      department: 'Dry Cleaning',
      staff_to_see_id: staff5.id, // David Chen
      services_requested: 'Pickup order #4421 (3 two-piece suits)',
      expected_duration: '<15 min',
      status: 'Completed',
      remarks: 'Paid via contactless terminal. Tag #4421 released.',
      created_by_user_id: receptionistUser.id,
    },
    {
      full_name: 'Linda Campbell',
      phone_number: '+1 (555) 789-0123',
      email: 'linda.c@cablesupply.net',
      arrival_datetime: new Date(now.getTime() - 5 * 3600 * 1000),
      checkout_datetime: new Date(now.getTime() - 4 * 3600 * 1000 - 30 * 60 * 1000),
      purpose_of_visit: 'Vendor',
      department: 'Tech Institute',
      staff_to_see_id: staff1.id,
      services_requested: 'Delivery of lab hardware & networking switches',
      expected_duration: '15-30 min',
      status: 'Completed',
      remarks: 'Delivered to Lab 3.',
      created_by_user_id: receptionistUser.id,
    },
    {
      full_name: 'Daniel White',
      phone_number: '+1 (555) 890-1234',
      email: 'd.white@gmail.com',
      arrival_datetime: new Date(now.getTime() - 2 * 3600 * 1000),
      checkout_datetime: new Date(now.getTime() - 1 * 3600 * 1000 - 50 * 60 * 1000),
      purpose_of_visit: 'Job Applicant',
      department: 'Dry Cleaning',
      staff_to_see_id: staff5.id,
      services_requested: 'Interview for Pressing Operator position',
      expected_duration: '30-60 min',
      status: 'Cancelled',
      remarks: 'Candidate called in requesting reschedule for tomorrow.',
      created_by_user_id: receptionistUser.id,
    }
  );

  // Past 28 days mock visitors for rich analytics
  const purposesTech = ['Prospective Student', 'Existing Trainee', 'Business Partner', 'Job Applicant', 'Vendor', 'Other'];
  const purposesClean = ['Dry Cleaning Customer', 'Dry Cleaning Customer', 'Vendor', 'Other'];
  const names = [
    'Emma Watson', 'James Bond', 'Olivia Smith', 'Noah Johnson', 'Liam Brown', 'Lucas Jones',
    'Mia Garcia', 'Benjamin Miller', 'Charlotte Davis', 'Henry Rodriguez', 'Amelia Martinez',
    'Alexander Hernandez', 'Evelyn Lopez', 'Michael Gonzalez', 'Harper Wilson', 'Ethan Anderson',
    'Abigail Thomas', 'Daniel Taylor', 'Emily Moore', 'Matthew Jackson', 'Elizabeth Martin',
    'Jackson Lee', 'Mila Perez', 'David Thompson', 'Ella White', 'Joseph Harris', 'Avery Sanchez',
    'Samuel Clark', 'Sofia Ramirez', 'Sebastian Lewis', 'Camila Robinson', 'Logan Walker',
  ];

  for (let i = 1; i <= 28; i++) {
    const dayDate = new Date(now.getTime() - i * 24 * 3600 * 1000);
    // 2 to 5 visits per day
    const visitsCount = 2 + (i % 4);
    for (let j = 0; j < visitsCount; j++) {
      const isTech = (i + j) % 2 === 0;
      const dept = isTech ? 'Tech Institute' : 'Dry Cleaning';
      const purpose = isTech
        ? purposesTech[(i + j) % purposesTech.length]
        : purposesClean[(i + j) % purposesClean.length];
      
      const staffList = isTech ? [staff1.id, staff2.id, staff3.id] : [staff4.id, staff5.id];
      const staffId = staffList[(i + j) % staffList.length];
      const personName = names[(i * 3 + j) % names.length];
      const hour = 9 + ((i * 2 + j * 3) % 8); // Between 9am and 5pm
      
      const arrival = new Date(dayDate);
      arrival.setHours(hour, (j * 17) % 60, 0, 0);

      const durationMinutes = 15 + ((i * 7 + j * 13) % 65);
      const checkout = new Date(arrival.getTime() + durationMinutes * 60 * 1000);

      sampleVisitorsData.push({
        full_name: personName,
        phone_number: `+1 (555) ${100 + (i * 10 + j)}-${1000 + (i * 111 + j)}`,
        email: `${personName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        arrival_datetime: arrival,
        checkout_datetime: checkout,
        purpose_of_visit: purpose,
        department: dept,
        staff_to_see_id: staffId,
        services_requested: isTech ? 'Course consultation / training session' : 'Standard dry cleaning & garment pressing',
        expected_duration: durationMinutes < 20 ? '<15 min' : durationMinutes < 35 ? '15-30 min' : durationMinutes < 60 ? '30-60 min' : '1hr+',
        status: (i + j) % 15 === 0 ? 'Cancelled' : 'Completed',
        remarks: `Historical record logged automatically.`,
        created_by_user_id: receptionistUser.id,
      });
    }
  }

  // Insert visitors and create audit logs
  for (const vData of sampleVisitorsData) {
    const visitor = await prisma.visitor.create({ data: vData });

    // Audit log for check_in
    await prisma.auditLog.create({
      data: {
        user_id: receptionistUser.id,
        action: 'check_in',
        target_visitor_id: visitor.id,
        details: JSON.stringify({
          full_name: visitor.full_name,
          department: visitor.department,
          purpose: visitor.purpose_of_visit,
        }),
        created_at: visitor.arrival_datetime,
      },
    });

    // Audit log for check_out if completed
    if (visitor.checkout_datetime) {
      await prisma.auditLog.create({
        data: {
          user_id: receptionistUser.id,
          action: visitor.status === 'Cancelled' ? 'cancel_visit' : 'check_out',
          target_visitor_id: visitor.id,
          details: JSON.stringify({
            status: visitor.status,
            duration_minutes: Math.round(
              (visitor.checkout_datetime.getTime() - visitor.arrival_datetime.getTime()) / 60000
            ),
          }),
          created_at: visitor.checkout_datetime,
        },
      });
    }
  }

  console.log(`Database seeded successfully! Generated ${sampleVisitorsData.length} visitor records and audit entries.`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
