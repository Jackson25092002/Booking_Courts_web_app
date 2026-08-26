import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL chưa được cấu hình");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  customer1: "00000000-0000-4000-8000-000000000002",
  customer2: "00000000-0000-4000-8000-000000000003",
  courts: [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
    "10000000-0000-4000-8000-000000000004",
    "10000000-0000-4000-8000-000000000005",
    "10000000-0000-4000-8000-000000000006",
  ],
  fields: [
    "20000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
    "20000000-0000-4000-8000-000000000003",
    "20000000-0000-4000-8000-000000000004",
    "20000000-0000-4000-8000-000000000005",
    "20000000-0000-4000-8000-000000000006",
    "20000000-0000-4000-8000-000000000007",
    "20000000-0000-4000-8000-000000000008",
    "20000000-0000-4000-8000-000000000009",
    "20000000-0000-4000-8000-000000000010",
    "20000000-0000-4000-8000-000000000011",
    "20000000-0000-4000-8000-000000000012",
  ],
};

const courtData = [
  {
    id: ids.courts[0],
    slug: "san-cau-long-sky-sport",
    name: "Sân Cầu Lông Sky Sport",
    district: "Quận Phú Nhuận",
    address: "123 Phan Xích Long, TP. Hồ Chí Minh",
    latitude: 10.7997,
    longitude: 106.6836,
    description: "Sân trong nhà, mặt sân tiêu chuẩn và có khu vực nghỉ ngơi.",
    pricePerHour: 85000,
  },
  {
    id: ids.courts[1],
    slug: "clb-cau-long-dao-duy-anh",
    name: "CLB Cầu Lông Đào Duy Anh",
    district: "Quận Phú Nhuận",
    address: "25 Đào Duy Anh, TP. Hồ Chí Minh",
    latitude: 10.8032,
    longitude: 106.6747,
    description: "Câu lạc bộ cầu lông thuận tiện cho người chơi khu vực trung tâm.",
    pricePerHour: 70000,
  },
  {
    id: ids.courts[2],
    slug: "san-badminton-pro-max",
    name: "Sân Badminton Pro-Max",
    district: "Thành phố Thủ Đức",
    address: "45 Thảo Điền, TP. Hồ Chí Minh",
    latitude: 10.8026,
    longitude: 106.7335,
    description: "Sân hiện đại, ánh sáng tốt và có phòng thay đồ.",
    pricePerHour: 110000,
  },
  {
    id: ids.courts[3],
    slug: "san-cau-long-tan-phu",
    name: "Sân Cầu Lông Tân Phú",
    district: "Quận Tân Phú",
    address: "128 Tân Kỳ Tân Quý, TP. Hồ Chí Minh",
    latitude: 10.7933,
    longitude: 106.6258,
    description: "Cụm sân rộng, có bãi giữ xe và lịch trống linh hoạt.",
    pricePerHour: 80000,
  },
  {
    id: ids.courts[4],
    slug: "san-cau-long-celadon",
    name: "Sân Cầu Lông Celadon",
    district: "Quận Tân Phú",
    address: "Đường N1, Sơn Kỳ, TP. Hồ Chí Minh",
    latitude: 10.8018,
    longitude: 106.6177,
    description: "Sân chất lượng cao trong khu đô thị Celadon.",
    pricePerHour: 100000,
  },
  {
    id: ids.courts[5],
    slug: "san-cau-long-ky-hoa",
    name: "Sân Cầu Lông Kỳ Hòa",
    district: "Quận 10",
    address: "238 Đường 3 Tháng 2, TP. Hồ Chí Minh",
    latitude: 10.7741,
    longitude: 106.6652,
    description: "Vị trí dễ tìm, phù hợp cho nhóm chơi sau giờ làm.",
    pricePerHour: 90000,
  },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash("Demo@123", 12);
  const users = [
    {
      id: ids.owner,
      fullName: "Chủ sân Lên Kèo",
      email: "owner@lenkeothoi.vn",
      phone: "0900000001",
      role: "OWNER" as const,
    },
    {
      id: ids.customer1,
      fullName: "Nguyễn Minh Anh",
      email: "customer1@lenkeothoi.vn",
      phone: "0900000002",
      role: "CUSTOMER" as const,
    },
    {
      id: ids.customer2,
      fullName: "Trần Quốc Bảo",
      email: "customer2@lenkeothoi.vn",
      phone: "0900000003",
      role: "CUSTOMER" as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        phone: user.phone,
        passwordHash,
        role: user.role,
      },
      create: { ...user, passwordHash },
    });
  }
}

async function seedCourtsAndFields() {
  for (let courtIndex = 0; courtIndex < courtData.length; courtIndex += 1) {
    const court = courtData[courtIndex];

    await prisma.court.upsert({
      where: { slug: court.slug },
      update: {
        ownerId: ids.owner,
        name: court.name,
        district: court.district,
        address: court.address,
        latitude: court.latitude,
        longitude: court.longitude,
        description: court.description,
        pricePerHour: court.pricePerHour,
        openTime: "06:00",
        closeTime: "23:00",
        isActive: true,
      },
      create: {
        ...court,
        ownerId: ids.owner,
        openTime: "06:00",
        closeTime: "23:00",
      },
    });

    for (let fieldOffset = 0; fieldOffset < 2; fieldOffset += 1) {
      const name = `Sân số ${fieldOffset + 1}`;
      const fieldId = ids.fields[courtIndex * 2 + fieldOffset];

      await prisma.courtField.upsert({
        where: {
          courtId_name: {
            courtId: court.id,
            name,
          },
        },
        update: { isActive: true },
        create: {
          id: fieldId,
          courtId: court.id,
          name,
        },
      });
    }
  }
}

async function seedReviews() {
  const reviews = [
    {
      id: "40000000-0000-4000-8000-000000000001",
      userId: ids.customer1,
      courtId: ids.courts[0],
      rating: 5,
      comment: "Sân sạch, ánh sáng tốt và nhân viên hỗ trợ nhanh.",
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      userId: ids.customer2,
      courtId: ids.courts[0],
      rating: 4,
      comment: "Vị trí thuận tiện, giá hợp lý.",
    },
    {
      id: "40000000-0000-4000-8000-000000000003",
      userId: ids.customer1,
      courtId: ids.courts[3],
      rating: 5,
      comment: "Nhiều sân con và còn lịch vào buổi tối.",
    },
  ];

  for (const review of reviews) {
    await prisma.review.upsert({
      where: {
        userId_courtId: {
          userId: review.userId,
          courtId: review.courtId,
        },
      },
      update: {
        rating: review.rating,
        comment: review.comment,
      },
      create: review,
    });
  }
}

async function seedBookings() {
  const bookings = [
    {
      id: "30000000-0000-4000-8000-000000000001",
      userId: ids.customer1,
      courtId: ids.courts[0],
      status: "PAID" as const,
      totalAmount: 170000,
      note: "Đặt sân giao lưu buổi tối",
      fieldId: ids.fields[0],
      startsAt: new Date("2026-08-08T18:00:00+07:00"),
      endsAt: new Date("2026-08-08T20:00:00+07:00"),
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      userId: ids.customer2,
      courtId: ids.courts[3],
      status: "CONFIRMED" as const,
      totalAmount: 120000,
      note: "Đặt sân 90 phút",
      fieldId: ids.fields[6],
      startsAt: new Date("2026-08-09T19:00:00+07:00"),
      endsAt: new Date("2026-08-09T20:30:00+07:00"),
    },
  ];

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      update: {
        userId: booking.userId,
        courtId: booking.courtId,
        status: booking.status,
        totalAmount: booking.totalAmount,
        note: booking.note,
      },
      create: {
        id: booking.id,
        userId: booking.userId,
        courtId: booking.courtId,
        status: booking.status,
        totalAmount: booking.totalAmount,
        note: booking.note,
      },
    });

    await prisma.bookingSlot.upsert({
      where: {
        courtFieldId_startsAt: {
          courtFieldId: booking.fieldId,
          startsAt: booking.startsAt,
        },
      },
      update: {
        bookingId: booking.id,
        endsAt: booking.endsAt,
        price: booking.totalAmount,
      },
      create: {
        bookingId: booking.id,
        courtFieldId: booking.fieldId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        price: booking.totalAmount,
      },
    });
  }
}

async function seedMatches() {
  const matches = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      organizerId: ids.customer1,
      courtId: ids.courts[0],
      title: "Kèo cầu lông tối thứ Bảy",
      description: "Tìm thêm hai bạn giao lưu vui vẻ, đúng giờ.",
      level: "Trung bình",
      startsAt: new Date("2026-08-28T18:00:00+07:00"),
      maxPlayers: 4,
      currentPlayers: 2,
      status: "OPEN" as const,
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      organizerId: ids.customer2,
      courtId: ids.courts[3],
      title: "Lên kèo cuối tuần Tân Phú",
      description: "Ưu tiên người chơi trình độ khá.",
      level: "Khá",
      startsAt: new Date("2026-08-29T19:00:00+07:00"),
      maxPlayers: 4,
      currentPlayers: 3,
      status: "OPEN" as const,
    },
  ];

  for (const match of matches) {
    await prisma.match.upsert({
      where: { id: match.id },
      update: match,
      create: match,
    });
  }
}

async function main() {
  await seedUsers();
  await seedCourtsAndFields();
  await seedReviews();
  await seedBookings();
  await seedMatches();

  const [userCount, courtCount, fieldCount, bookingCount, reviewCount, matchCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.court.count(),
      prisma.courtField.count(),
      prisma.booking.count(),
      prisma.review.count(),
      prisma.match.count(),
    ]);

  console.log("Seed hoàn tất:", {
    users: userCount,
    courts: courtCount,
    courtFields: fieldCount,
    bookings: bookingCount,
    reviews: reviewCount,
    matches: matchCount,
  });
  console.log("Tài khoản demo dùng mật khẩu: Demo@123");
}

main()
  .catch((error) => {
    console.error("Seed thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
