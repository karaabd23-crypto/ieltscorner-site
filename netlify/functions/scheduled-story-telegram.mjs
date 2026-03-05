/**
 * Netlify Scheduled Function: Auto-post Telegram stories
 * Triggers: 3 times daily at 10am, 2pm, 7pm UTC
 */

import { spawn } from 'child_process';

async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', [scriptPath], {
      cwd: process.env.LAMBDA_TASK_ROOT,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Script failed with code ${code}\n${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

export default async () => {
  console.log(`[scheduled-story] Running at ${new Date().toISOString()}`);

  try {
    const result = await runScript('./scripts/post-telegram-story.mjs');
    console.log('[scheduled-story] Success:', result.stdout);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Story posted successfully',
        timestamp: new Date().toISOString(),
        output: result.stdout,
      }),
    };
  } catch (error) {
    console.error('[scheduled-story] Error:', error.message);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Story posting failed',
        timestamp: new Date().toISOString(),
        error: error.message,
      }),
    };
  }
};
