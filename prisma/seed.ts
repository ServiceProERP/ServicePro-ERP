import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@servicepro.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@servicepro.com',
      password: hashedPassword,
      role: 'admin',
    },
  })

  console.log('✅ Admin user created!')
  console.log('Email: admin@servicepro.com')
  console.log('Password: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())