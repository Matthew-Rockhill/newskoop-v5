# Neon Database + Cloudinary Storage Setup Guide

## 1. Neon Database Setup

### Create Neon Project

1. Go to [neon.tech](https://neon.tech) and sign up/login
2. Create a new project
3. Choose your region (closest to your users)
4. Neon will automatically create a database named `neondb`

### Get Database Connection String

1. In your Neon dashboard, go to the **Connection Details** tab
2. Copy the **Connection string** 
3. It will look like: `postgresql://neondb_owner:npg_q7N1owMIiWnp@ep-lingering-sun-abx8zkr7-pooler.eu-west-2.aws.neon.tech/newskoopdb?sslmode=require`

### Configure Environment Variables

Update your `.env` file:

```env
# Neon Database
DATABASE_URL="postgresql://neondb_owner:npg_q7N1owMIiWnp@ep-lingering-sun-abx8zkr7-pooler.eu-west-2.aws.neon.tech/newskoopdb?sslmode=require"
```

### Run Database Migrations

**Important**: Neon provides two connection strings:
- **Pooled connection**: For your application (with `-pooler` in the hostname)
- **Direct connection**: For migrations (without `-pooler` in the hostname)

For migrations, you might need to temporarily use the direct connection string. Check your Neon dashboard for both connection strings.

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations (you may need to use the direct connection string)
npx prisma migrate deploy

# Seed the database with initial data
npx prisma db seed
```

## 2. Cloudinary Setup for Audio Files

### Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up
2. You'll get a free tier with:
   - 25 GB storage
   - 25 GB monthly bandwidth
   - 25,000 transformations per month

### Get API Credentials

From your Cloudinary dashboard:

1. Go to **Settings** → **Security** → **Access Keys**
2. Copy these values:
   - **Cloud Name**
   - **API Key** 
   - **API Secret**

### Configure Audio Upload Settings

In Cloudinary dashboard:

1. Go to **Settings** → **Upload**
2. Enable **Auto-tagging** for better organization
3. Set **Upload presets** for audio files:
   - Name: `newsroom_audio`
   - Upload type: `Upload`
   - Resource type: `Raw` (for audio files)
   - Access mode: `Public`

## 3. Environment Variables

Update your `.env` file with all required variables:

```env
# Database - Neon PostgreSQL
DATABASE_URL="postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# NextAuth.js Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (optional)
EMAIL_FROM=noreply@example.com
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
```

## 4. Vercel Deployment Configuration

When deploying to Vercel, add these environment variables:

### Required Variables:
- `DATABASE_URL` (from Neon)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY` 
- `CLOUDINARY_API_SECRET`
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` (your production URL)

### Optional Variables:
- Email configuration if using email features

## 5. Benefits of This Setup

### Neon Database:
- ✅ **Serverless PostgreSQL** - scales to zero when not in use
- ✅ **Automatic backups** and point-in-time recovery
- ✅ **Fast cold starts** - perfect for Vercel
- ✅ **Free tier**: 3 GB storage, 100 hours compute time
- ✅ **Built-in connection pooling**

### Cloudinary Storage:
- ✅ **Optimized for media** - automatic compression and optimization
- ✅ **Global CDN** - fast delivery worldwide
- ✅ **Audio transcoding** - automatic format conversion
- ✅ **Secure uploads** - signed URLs and access control
- ✅ **Free tier**: 25 GB storage, 25 GB bandwidth

## 6. Cost Comparison

### Free Tiers:
- **Neon**: 3 GB storage, 100 hours compute/month
- **Cloudinary**: 25 GB storage, 25 GB bandwidth/month
- **Total Cost**: $0/month for small to medium projects

### Paid Plans (when needed):
- **Neon Pro**: $19/month - 10 GB storage, always available
- **Cloudinary Plus**: $89/month - 75 GB storage, 75 GB bandwidth

## 7. Security Best Practices

### Database Security:
- Neon automatically enables SSL/TLS
- Uses connection pooling for better performance
- Automatic security updates

### File Upload Security:
- Cloudinary provides signed uploads
- File type validation
- Size limits and rate limiting
- Automatic malware scanning

## 8. Monitoring and Maintenance

### Neon Monitoring:
- Dashboard shows CPU, memory, and storage usage
- Query performance metrics
- Automatic scaling based on demand

### Cloudinary Monitoring:
- Usage dashboard for storage and bandwidth
- Transformation analytics
- Delivery performance metrics

## 9. Backup Strategy

### Neon:
- Automatic daily backups
- Point-in-time recovery up to 7 days (free) or 30 days (paid)
- Branch databases for testing

### Cloudinary:
- Files are stored with 99.9% availability
- Automatic redundancy across multiple data centers
- Optional backup to external storage

## 10. Migration from Supabase (if needed)

If you were previously using Supabase:

### Database Migration:
```bash
# Export from Supabase
pg_dump "postgresql://..." > backup.sql

# Import to Neon  
psql "postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" < backup.sql
```

### File Migration:
- Files will need to be re-uploaded to Cloudinary
- Update any hardcoded file URLs in your database

## Troubleshooting

### Common Issues:

1. **Connection Errors**: Ensure `?sslmode=require` is in your DATABASE_URL
2. **File Upload Fails**: Check Cloudinary API credentials
3. **Large Files**: Cloudinary free tier has 10MB upload limit per file
4. **Rate Limiting**: Implement client-side rate limiting for uploads

### Getting Help:

- **Neon**: [neon.tech/docs](https://neon.tech/docs)
- **Cloudinary**: [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **Community**: Both have active Discord communities