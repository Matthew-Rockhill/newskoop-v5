import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';

interface TestResult {
  module: string;
  testName: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
}

interface TestResponse {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  timestamp: string;
  results: TestResult[];
}

// Vitest JSON output structure
interface VitestAssertionResult {
  ancestorTitles: string[];
  title: string;
  fullName: string;
  status: 'passed' | 'failed';
  duration: number;
  failureMessages: string[];
}

interface VitestTestFile {
  name: string;
  assertionResults: VitestAssertionResult[];
  status: string;
}

interface VitestOutput {
  testResults: VitestTestFile[];
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  success: boolean;
}

function parseVitestOutput(output: string): TestResponse {
  try {
    const jsonData: VitestOutput = JSON.parse(output);
    const results: TestResult[] = [];
    let totalDuration = 0;

    if (jsonData.testResults) {
      for (const file of jsonData.testResults) {
        if (file.assertionResults) {
          for (const assertion of file.assertionResults) {
            // Use top-level describe() name as the module name (more readable)
            // e.g., "Editorial Workflow Permissions" instead of "permissions"
            const moduleName = assertion.ancestorTitles[0] || path.basename(file.name, '.test.ts');

            // Build test name from remaining ancestor titles + title (skip the module name)
            const testName = [...assertion.ancestorTitles.slice(1), assertion.title].join(' > ');

            results.push({
              module: moduleName,
              testName,
              status: assertion.status === 'passed' ? 'passed' : 'failed',
              duration: assertion.duration || 0,
              error: assertion.failureMessages?.[0],
            });

            totalDuration += assertion.duration || 0;
          }
        }
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return {
      totalTests: results.length,
      passed,
      failed,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
      results,
    };
  } catch (e) {
    console.error('Parse error:', e);
    throw new Error('Failed to parse Vitest output');
  }
}

/**
 * POST /api/admin/super/function-tests
 * Run unit tests and return results
 * SUPERADMIN only
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication and authorization
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPERADMIN can access
    if (session.user.staffRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fs = await import('fs/promises');
    const outputPath = path.join(process.cwd(), 'test-results.json');

    // Try to run vitest first
    let testOutput = '';
    let runError: Error | null = null;

    try {
      testOutput = await new Promise<string>((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const npmCmd = isWindows ? 'npm.cmd' : 'npm';

        const vitest = spawn(npmCmd, ['run', 'test:json'], {
          cwd: process.cwd(),
          shell: isWindows,
          env: { ...process.env, CI: 'true' },
        });

        let stdout = '';
        let stderr = '';

        vitest.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        vitest.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        // Set timeout for test run (30 seconds)
        const timeout = setTimeout(() => {
          vitest.kill();
          reject(new Error('Test run timed out after 30 seconds'));
        }, 30000);

        vitest.on('close', (code) => {
          clearTimeout(timeout);
          // Vitest exits with code 1 if tests fail, but we still want the output
          if (stdout) {
            resolve(stdout);
          } else if (code !== 0 && stderr) {
            reject(new Error(`Test runner failed: ${stderr.substring(0, 200)}`));
          } else {
            resolve(stdout);
          }
        });

        vitest.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (err) {
      runError = err instanceof Error ? err : new Error('Unknown error');
      console.error('Test run error:', runError.message);
    }

    // Try to find JSON in the output (vitest outputs other text too)
    const jsonMatch = testOutput.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) {
      const result = parseVitestOutput(jsonMatch[0]);
      return NextResponse.json(result);
    }

    // If no JSON in stdout, read from the output file (it might have been written)
    try {
      const fileContent = await fs.readFile(outputPath, 'utf-8');
      const result = parseVitestOutput(fileContent);
      return NextResponse.json({
        ...result,
        note: runError ? 'Results from cached file' : undefined,
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      // Return error with whatever info we have
      return NextResponse.json({
        totalTests: 0,
        passed: 0,
        failed: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
        results: [],
        error: runError?.message || 'Could not read test results. Run "npm test" from the command line first.',
      });
    }
  } catch (error) {
    console.error('Function tests error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to run function tests',
        totalTests: 0,
        passed: 0,
        failed: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
        results: [],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/super/function-tests
 * Get information about available tests without running them
 * SUPERADMIN only
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.staffRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      available: true,
      testModules: [
        { name: 'Editorial Workflow Permissions', description: 'Role-based story access, editing, and status transitions' },
        { name: 'Translation Workflow', description: 'Translation permissions, assignments, and approvals' },
        { name: 'Stage-Based Story Workflow', description: 'Story stage transitions and revision requests' },
        { name: 'Bulletin & Flagging', description: 'Story flagging for bulletins by role' },
        { name: 'Shows & Episodes (Podcasts)', description: 'Podcast show and episode management permissions' },
        { name: 'Security - Null Role Handling', description: 'Ensures null roles have no permissions' },
        { name: 'Data Validation Schemas', description: 'User, story, category, tag, and station validation' },
        { name: 'URL Slug Generation', description: 'Headline to URL-safe slug conversion' },
        { name: 'Email System Configuration', description: 'Environment-based email filtering and modes' },
        { name: 'Language Support', description: 'Multi-language formatting for South African languages' },
        { name: 'Station Content Filtering (Integration)', description: 'Verifies station filtering queries against real database' },
        { name: 'Editorial Flow (Integration)', description: 'End-to-end story stage transitions with DB validation' },
        { name: 'Translation Cascade (Integration)', description: 'Translation auto-advancement and publish cascade' },
      ],
    });
  } catch (error) {
    console.error('Function tests info error:', error);
    return NextResponse.json(
      { error: 'Failed to get test info' },
      { status: 500 }
    );
  }
}
