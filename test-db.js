require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Testing DB Access...');
console.log('URL:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: "postgresql://postgres:jmAm%26%26iJ%2BvzW%3Fu9@db.niuvkqjdhaqxotoqldfb.supabase.co:5432/postgres" // Manually encoded
        },
    },
});

async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connection Successful!');
        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (e) {
        console.error('❌ Connection Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
