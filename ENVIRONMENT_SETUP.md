okaygr# Environment Setup Guide

This guide explains how to set up development, staging, and production environments for Newskoop.

## Environment Overview

### 1. Local Development
- **Database**: Local Neon database (development branch)
- **Email**: Console mode (no actual emails sent)
- **URL**: http://localhost:3000
- **Branch**: Any local branch

### 2. Staging
- **Database**: Staging Neon database
- **Email**: Resend restricted mode (only @newskoop.com emails)
- **URL**: https://staging.newskoop.vercel.app
- **Branch**: `staging` branch

### 3. Production
- **Database**: Production Neon database
- **Email**: Resend full mode
- **URL**: https://newskoop.vercel.app
- **Branch**: `main` branch

## Setup Instructions

### Step 1: Neon Database Setup

1. **Create Staging Database in Neon**
   - Go to your Neon project
   - Create a new branch called `staging` from your main database
   - Get the connection string for staging

2. **Database URLs**
   ```
   # Production (main branch)
   postgresql://[user]:[password]@[host]/newskoopdb?sslmode=require
   
   # Staging (staging branch)
   postgresql://[user]:[password]@[host]/newskoopdb?sslmode=require
   
   # Development (local branch)
   postgresql://[user]:[password]@[host]/newskoopdb?sslmode=require
   ```

### Step 2: Vercel Environment Configuration

1. **Go to Vercel Project Settings → Environment Variables**

2. **Production Environment Variables**
   ```
   DATABASE_URL=[production_neon_url]
   NEXTAUTH_URL=https://newskoop.vercel.app
   NEXTAUTH_SECRET=[generate_new_secret]
   EMAIL_MODE=resend
   RESEND_API_KEY=[your_resend_api_key]
   RESEND_FROM_EMAIL=Newskoop <noreply@newskoop.com>
   BLOB_READ_WRITE_TOKEN=[your_blob_token]
   ```

3. **Staging Environment Variables**
   ```
   DATABASE_URL=[staging_neon_url]
   NEXTAUTH_URL=https://staging.newskoop.vercel.app
   NEXTAUTH_SECRET=[generate_new_secret]
   EMAIL_MODE=resend-restricted
   RESEND_API_KEY=[your_resend_api_key]
   RESEND_FROM_EMAIL=Newskoop Staging <staging@newskoop.com>
   BLOB_READ_WRITE_TOKEN=[your_blob_token]
   ```

4. **Preview Environment Variables**
   - Same as staging but with unique URLs per deployment

### Step 3: Local Development Setup

1. **Create `.env.local` file**
   ```env
   # Database
   DATABASE_URL=postgresql://[dev_neon_url]
   
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=development_secret_change_in_production
   
   # Email
   EMAIL_MODE=console
   RESEND_API_KEY=not_needed_in_dev
   RESEND_FROM_EMAIL=Newskoop Dev <dev@localhost>
   
   # Vercel Blob (optional for local)
   BLOB_READ_WRITE_TOKEN=your_dev_token_if_needed
   ```

2. **Update `.gitignore`**
   ```
   .env
   .env.local
   .env.staging
   .env.production
   ```

### Step 4: Vercel Project Configuration

1. **Set up Git Integration**
   - Connect your GitHub repository
   - Configure branch deployments:
     - `main` → Production
     - `staging` → Staging (custom domain)
     - All other branches → Preview

2. **Add Custom Domain for Staging**
   - Go to Vercel project settings → Domains
   - Add `staging.newskoop.com` (or your staging subdomain)
   - Assign it to the `staging` branch

### Step 5: Database Migrations

1. **Development**
   ```bash
   npx prisma migrate dev
   ```

2. **Staging**
   ```bash
   DATABASE_URL=[staging_url] npx prisma migrate deploy
   ```

3. **Production**
   ```bash
   DATABASE_URL=[production_url] npx prisma migrate deploy
   ```

## Environment Variables Reference

| Variable | Development | Staging | Production |
|----------|------------|---------|------------|
| `DATABASE_URL` | Dev Neon URL | Staging Neon URL | Prod Neon URL |
| `NEXTAUTH_URL` | http://localhost:3000 | https://staging.newskoop.vercel.app | https://newskoop.vercel.app |
| `NEXTAUTH_SECRET` | dev_secret | staging_secret | prod_secret |
| `EMAIL_MODE` | console | sendgrid-restricted | sendgrid |
| `SENDGRID_API_KEY` | (optional) | Required | Required |
| `SENDGRID_FROM_EMAIL` | dev@localhost | staging@newskoop.com | noreply@newskoop.com |
| `BLOB_READ_WRITE_TOKEN` | (optional) | Required | Required |

## Testing Email Behavior

### Development (console mode)
- All emails logged to console
- No actual emails sent
- Magic links visible in terminal

### Staging (sendgrid-restricted)
- Only sends to @newskoop.com domains
- Other emails redirected to catch-all
- Real SendGrid integration

### Production (sendgrid)
- All emails sent normally
- Full SendGrid integration
- No restrictions

## Deployment Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   # Work on feature
   git push origin feature/new-feature
   # Creates preview deployment
   ```

2. **Staging Deployment**
   ```bash
   git checkout staging
   git merge feature/new-feature
   git push origin staging
   # Deploys to staging environment
   ```

3. **Production Deployment**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   # Deploys to production
   ```

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct for environment
- Check Neon branch status
- Ensure SSL mode is set to 'require'

### Email Not Working
- Check EMAIL_MODE setting
- Verify SendGrid API key (staging/production)
- Check email logs at `/admin/emails`

### Environment Variables Not Loading
- Restart development server after .env changes
- Verify variable names match exactly
- Check Vercel environment variable settings