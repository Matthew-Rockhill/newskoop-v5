# Supabase Setup Guide for NewsKoop v5

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a database password and region
3. Wait for the project to be created (usually takes 2-3 minutes)

## 2. Database Configuration

### Get Connection Details

From your Supabase dashboard:

1. Go to **Settings** → **Database**
2. Copy the **Connection string** (URI format)
3. It will look like: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### Configure Prisma

Update your `.env` file with the Supabase database URL:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1"
```

**Important**: Add `?pgbouncer=true&connection_limit=1` for connection pooling.

### Run Migrations

```bash
npx prisma migrate deploy
npx prisma db seed
```

## 3. Storage Configuration

### Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Create a new bucket named `audio-files`
3. Set it to **Public** (for serving audio files)

### Configure Storage Policies

Go to **Storage** → **Policies** and create these policies:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'audio-files'
);
```

#### Policy 2: Allow public access to read files
```sql
CREATE POLICY "Allow public read access to audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-files');
```

#### Policy 3: Allow authenticated users to delete their files
```sql
CREATE POLICY "Allow authenticated users to delete audio files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'audio-files'
);
```

## 4. Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database URL (already configured above)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1"
```

### Get API Keys

From Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy the **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

## 5. Vercel Deployment Configuration

When deploying to Vercel, add these environment variables:

1. Go to your Vercel project settings
2. Add **Environment Variables**:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

## 6. Update Audio Upload Implementation

The codebase now includes Supabase storage integration. Audio files will be:

1. **Uploaded to Supabase Storage** instead of local filesystem
2. **Served via CDN** for better performance
3. **Automatically managed** with proper cleanup

## 7. Testing the Setup

1. **Test Database Connection**:
   ```bash
   npx prisma db pull
   ```

2. **Test File Upload**:
   - Try uploading an audio file through the story creation form
   - Check that it appears in Supabase Storage

3. **Test File Serving**:
   - Verify audio files play correctly in the story view

## 8. Security Considerations

### Row Level Security (RLS)

Supabase has RLS enabled by default. For additional security:

1. Go to **Authentication** → **Settings**
2. Configure **Site URL** to your production domain
3. Add **Redirect URLs** for authentication flows

### API Rate Limiting

Consider implementing rate limiting for file uploads:

```typescript
// In your API routes
const MAX_UPLOADS_PER_HOUR = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

## 9. Monitoring and Maintenance

### Storage Usage

Monitor storage usage in Supabase dashboard:
- **Storage** → **Usage** 
- Set up alerts for storage limits

### Database Performance

Monitor database performance:
- **Settings** → **Database** → **Query performance**
- Add indexes for frequently queried fields

### Backup Strategy

Supabase provides automatic daily backups. For additional protection:
- Set up point-in-time recovery
- Consider exporting critical data regularly

## 10. Cost Optimization

### Free Tier Limits

Supabase free tier includes:
- 500MB database storage
- 1GB file storage
- 50MB file uploads
- 2 million Edge Function invocations

### Paid Plan Benefits

When you exceed free tier:
- Unlimited API requests
- 8GB database storage
- 100GB file storage
- No pausing of inactive projects

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Add connection pooling parameters to DATABASE_URL
2. **File Upload Fails**: Check storage bucket policies
3. **Authentication Issues**: Verify NEXTAUTH_URL matches your domain
4. **Migration Fails**: Ensure database user has proper permissions

### Getting Help

- Supabase Documentation: [docs.supabase.com](https://docs.supabase.com)
- Community Support: [github.com/supabase/supabase](https://github.com/supabase/supabase)
- Discord: [discord.supabase.com](https://discord.supabase.com)