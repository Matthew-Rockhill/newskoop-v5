# Deployment Guide for NewsKoop v5 on Vercel

## Prerequisites

1. A Vercel account
2. A PostgreSQL database (e.g., Supabase, Neon, or Vercel Postgres)
3. The repository pushed to GitHub/GitLab/Bitbucket

## Environment Variables

Set the following environment variables in your Vercel project settings:

### Required Variables

```
DATABASE_URL=your-postgresql-connection-string
NEXTAUTH_SECRET=generate-a-secure-random-string
NEXTAUTH_URL=https://your-domain.vercel.app
```

### Optional Variables

```
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-email-password
```

## Deployment Steps

### 1. Prepare the Database

Run the Prisma migrations on your production database:

```bash
npx prisma migrate deploy
```

Optionally, seed the database with initial data:

```bash
npx prisma db seed
```

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel
```

#### Option B: Deploy via GitHub Integration

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure environment variables
5. Click "Deploy"

### 3. Post-Deployment Setup

1. **Update NEXTAUTH_URL**: Set this to your production URL (e.g., `https://your-app.vercel.app`)

2. **Configure Database**: Ensure your database allows connections from Vercel's IP addresses

3. **Set up Email (if using)**: Configure your email provider settings

4. **Create Admin User**: Use the API or database directly to create the first admin user

## Build Configuration

The following settings are already configured in `next.config.ts`:

- TypeScript strict mode
- Image optimization
- API routes configuration

## Troubleshooting

### Build Errors

1. **TypeScript Errors**: Run `npm run build` locally to catch errors before deployment
2. **Database Connection**: Ensure DATABASE_URL is properly formatted with SSL parameters if required
3. **Missing Dependencies**: Check that all dependencies are in `package.json` (not devDependencies)

### Runtime Errors

1. **Authentication Issues**: Verify NEXTAUTH_SECRET and NEXTAUTH_URL are correctly set
2. **File Uploads**: Note that Vercel's serverless functions have limited persistent storage; consider using external storage (S3, Cloudinary) for production
3. **API Timeouts**: Vercel has a 10-second timeout for hobby tier; optimize long-running queries

## Performance Optimization

1. **Database Indexes**: Ensure proper indexes are created (Prisma migrations handle this)
2. **Image Optimization**: Use Next.js Image component for automatic optimization
3. **API Route Caching**: Implement appropriate cache headers for read-heavy endpoints

## Security Checklist

- [ ] Strong NEXTAUTH_SECRET (32+ characters)
- [ ] Database connection uses SSL
- [ ] Environment variables are not exposed in client code
- [ ] CORS configured appropriately
- [ ] Rate limiting implemented for API routes
- [ ] Input validation on all forms
- [ ] XSS protection via React's built-in escaping

## Monitoring

Consider setting up:
- Vercel Analytics for performance monitoring
- Sentry or similar for error tracking
- Database monitoring through your provider's dashboard